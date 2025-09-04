import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Tool, CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { PassgageAPIClient } from '../api/client.js';
import { logger } from '../config/logger.js';
import { BaseTool } from './base.tool.js';
import { SessionManager } from '../utils/session.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cloudflare Workers compatibility check
const isCloudflareWorker = typeof globalThis !== 'undefined' && 
                           typeof globalThis.Response !== 'undefined' && 
                           typeof globalThis.Request !== 'undefined' &&
                           typeof process === 'undefined';

const __dirname = isCloudflareWorker ? 
                  '/src/tools' :  // Fallback path for Cloudflare Workers
                  (import.meta.url ? path.dirname(fileURLToPath(import.meta.url)) : '/src/tools');

export interface ToolMetadata {
  name: string;
  description: string;
  category: string;
  permissions?: {
    companyMode: boolean;
    userMode: boolean;
  };
  scopes?: string[];
}

export class ToolRegistry {
  private tools = new Map<string, BaseTool>();
  private server: Server;
  private apiClient: PassgageAPIClient;
  private globalSessionManager?: SessionManager;

  constructor(server: Server, apiClient: PassgageAPIClient, globalSessionManager?: SessionManager) {
    this.server = server;
    this.apiClient = apiClient;
    this.globalSessionManager = globalSessionManager;
  }

  /**
   * Automatically discover and register all tools
   */
  async registerAll(): Promise<void> {
    logger.info('Starting tool registration...');
    
    // Register built-in tools
    await this.registerBuiltinTools();
    
    // Register Prompt Discovery tools
    await this.registerPromptDiscoveryTools();
    
    // Auto-discover Passgage tools
    await this.autoDiscoverTools();
    
    // Setup MCP handlers
    this.setupHandlers();
  }

  /**
   * Register Prompt Discovery tools
   */
  private async registerPromptDiscoveryTools(): Promise<void> {
    try {
      const {
        ListPromptsTool,
        PromptHelpTool,
        SuggestPromptsTool
      } = await import('./prompt-discovery.tool.js');
      
      this.registerTool(new ListPromptsTool(this.apiClient));
      this.registerTool(new PromptHelpTool(this.apiClient));
      this.registerTool(new SuggestPromptsTool(this.apiClient));
      
      logger.debug('Prompt Discovery tools registered');
    } catch (error) {
      logger.error('Failed to register Prompt Discovery tools:', { error });
    }
  }

  /**
   * Register built-in tools (auth, system, etc.)
   */
  private async registerBuiltinTools(): Promise<void> {
    // Import and register standard auth tools
    const { 
      AuthTool, 
      RefreshTokenTool, 
      LogoutTool, 
      AuthStatusTool,
      SwitchToCompanyModeTool,
      SwitchToUserModeTool 
    } = await import('./auth.tool.js');
    
    this.registerTool(new AuthTool(this.apiClient));
    this.registerTool(new RefreshTokenTool(this.apiClient));
    this.registerTool(new LogoutTool(this.apiClient));
    this.registerTool(new AuthStatusTool(this.apiClient));
    this.registerTool(new SwitchToCompanyModeTool(this.apiClient));
    this.registerTool(new SwitchToUserModeTool(this.apiClient));
    
    // Import and register global session auth tools
    await this.registerGlobalAuthTools();
    
    // Import and register system tools
    const { PingTool } = await import('./ping.tool.js');
    this.registerTool(new PingTool());
  }

  /**
   * Register Global Authentication tools for multi-user deployments
   */
  private async registerGlobalAuthTools(): Promise<void> {
    try {
      // Use the global session manager if available, otherwise create one
      const sessionManager = this.globalSessionManager || this.createSessionManager();
      
      // Import and register global authentication tools
      const {
        SessionLoginTool,
        SessionCreateTool,
        SessionStatusTool,
        SessionListTool,
        SessionSwitchModeTool
      } = await import('./global-auth.tool.js');
      
      this.registerTool(new SessionLoginTool(this.apiClient, sessionManager));
      this.registerTool(new SessionCreateTool(this.apiClient, sessionManager));
      this.registerTool(new SessionStatusTool(this.apiClient, sessionManager));
      this.registerTool(new SessionListTool(this.apiClient, sessionManager));
      this.registerTool(new SessionSwitchModeTool(this.apiClient, sessionManager));
      
      // Import and register session-based HTTP authentication tools
      const {
        SessionLoginTool: HttpSessionLoginTool,
        SessionLoginWithApiKeyTool,
        SessionSwitchModeTool: HttpSessionSwitchModeTool,
        SessionStatusTool: HttpSessionStatusTool,
        SessionLogoutTool
      } = await import('./session-auth.tool.js');
      
      this.registerTool(new HttpSessionLoginTool(this.apiClient, sessionManager));
      this.registerTool(new SessionLoginWithApiKeyTool(this.apiClient, sessionManager));
      this.registerTool(new HttpSessionSwitchModeTool(this.apiClient, sessionManager));
      this.registerTool(new HttpSessionStatusTool(this.apiClient, sessionManager));
      this.registerTool(new SessionLogoutTool(this.apiClient, sessionManager));
      
      logger.info('Global Authentication tools registered successfully');
    } catch (error) {
      logger.error('Failed to register Global Authentication tools:', { error });
    }
  }

  /**
   * Auto-discover tools in the passgage directory
   */
  private async autoDiscoverTools(): Promise<void> {
    // Register service-specific tools
    await this.registerUsersServiceTools();
    await this.registerApprovalsServiceTools();
    await this.registerFileUploadTools();
    await this.registerAdvancedSearchTools();
    await this.registerUserShiftsServiceTools();
    await this.registerLeavesServiceTools();
    await this.registerLeaveTypesServiceTools();
    
    // Dynamic tool loading - skip in Cloudflare Workers
    if (!isCloudflareWorker) {
      const toolsDir = path.join(__dirname, 'passgage');
      
      try {
        const files = await fs.readdir(toolsDir);
        const toolFiles = files.filter(f => f.endsWith('.tool.js') || f.endsWith('.tool.ts'));
        
        for (const file of toolFiles) {
          // Skip service-specific tool files as we register them manually above
          if (file.includes('users-service.tool') || file.includes('approvals-service.tool') || 
              file.includes('file-upload.tool') || file.includes('advanced-search.tool') ||
              file.includes('user-shifts-service.tool') || file.includes('leaves-service.tool') ||
              file.includes('leave-types-service.tool')) continue;
          
          try {
            const modulePath = path.join(toolsDir, file);
            const module = await import(modulePath);
            
            // Look for exported tool classes
            for (const exportedItem of Object.values(module)) {
              if (this.isToolClass(exportedItem)) {
                const instance = new (exportedItem as any)(this.apiClient);
                this.registerTool(instance);
            }
            }
          } catch (error) {
            logger.error(`Failed to load tool from ${file}:`, { error });
          }
        }
      } catch (error) {
        logger.warn('Passgage tools directory not found, skipping auto-discovery');
      }
    }
  }
  
  /**
   * Register Users service specific tools
   */
  private async registerUsersServiceTools(): Promise<void> {
    try {
      const {
        ListUsersTool,
        GetUserTool,
        CreateUserTool,
        UpdateUserTool,
        DeleteUserTool,
        AssignDevicesToUserTool,
        AssignZonesToUserTool
      } = await import('./passgage/users-service.tool.js');
      
      this.registerTool(new ListUsersTool(this.apiClient));
      this.registerTool(new GetUserTool(this.apiClient));
      this.registerTool(new CreateUserTool(this.apiClient));
      this.registerTool(new UpdateUserTool(this.apiClient));
      this.registerTool(new DeleteUserTool(this.apiClient));
      this.registerTool(new AssignDevicesToUserTool(this.apiClient));
      this.registerTool(new AssignZonesToUserTool(this.apiClient));
      
      logger.debug('Users service tools registered');
    } catch (error) {
      logger.error('Failed to register Users service tools:', { error });
    }
  }
  
  /**
   * Register Approvals service specific tools
   */
  private async registerApprovalsServiceTools(): Promise<void> {
    try {
      const {
        ListApprovalsTool,
        GetApprovalTool,
        ApproveRequestTool,
        RejectRequestTool,
        BulkApprovalTool,
        GetMyApprovalsTool,
        AssignApproverTool
      } = await import('./passgage/approvals-service.tool.js');
      
      this.registerTool(new ListApprovalsTool(this.apiClient));
      this.registerTool(new GetApprovalTool(this.apiClient));
      this.registerTool(new ApproveRequestTool(this.apiClient));
      this.registerTool(new RejectRequestTool(this.apiClient));
      this.registerTool(new BulkApprovalTool(this.apiClient));
      this.registerTool(new GetMyApprovalsTool(this.apiClient));
      this.registerTool(new AssignApproverTool(this.apiClient));
      
      logger.debug('Approvals service tools registered');
    } catch (error) {
      logger.error('Failed to register Approvals service tools:', { error });
    }
  }
  
  /**
   * Register File Upload service specific tools
   */
  private async registerFileUploadTools(): Promise<void> {
    try {
      const {
        GeneratePresignedUrlTool,
        ConfirmUploadTool,
        GetFileTool,
        DeleteFileTool,
        ListFilesTool
      } = await import('./passgage/file-upload.tool.js');
      
      this.registerTool(new GeneratePresignedUrlTool(this.apiClient));
      this.registerTool(new ConfirmUploadTool(this.apiClient));
      this.registerTool(new GetFileTool(this.apiClient));
      this.registerTool(new DeleteFileTool(this.apiClient));
      this.registerTool(new ListFilesTool(this.apiClient));
      
      logger.debug('File Upload tools registered');
    } catch (error) {
      logger.error('Failed to register File Upload tools:', { error });
    }
  }
  
  /**
   * Register Advanced Search tools
   */
  private async registerAdvancedSearchTools(): Promise<void> {
    try {
      const {
        AdvancedSearchTool,
        QueryBuilderTool,
        ExplainOperatorsTool
      } = await import('./passgage/advanced-search.tool.js');
      
      this.registerTool(new AdvancedSearchTool(this.apiClient));
      this.registerTool(new QueryBuilderTool(this.apiClient));
      this.registerTool(new ExplainOperatorsTool(this.apiClient));
      
      logger.debug('Advanced Search tools registered');
    } catch (error) {
      logger.error('Failed to register Advanced Search tools:', { error });
    }
  }
  
  /**
   * Register User Shifts service specific tools
   */
  private async registerUserShiftsServiceTools(): Promise<void> {
    try {
      const {
        ListUserShiftsTool,
        GetUserShiftTool,
        CreateUserShiftTool,
        UpdateUserShiftTool,
        DeleteUserShiftTool,
        AssignShiftToUsersTool,
        GetUserShiftConflictsTool
      } = await import('./passgage/user-shifts-service.tool.js');
      
      this.registerTool(new ListUserShiftsTool(this.apiClient));
      this.registerTool(new GetUserShiftTool(this.apiClient));
      this.registerTool(new CreateUserShiftTool(this.apiClient));
      this.registerTool(new UpdateUserShiftTool(this.apiClient));
      this.registerTool(new DeleteUserShiftTool(this.apiClient));
      this.registerTool(new AssignShiftToUsersTool(this.apiClient));
      this.registerTool(new GetUserShiftConflictsTool(this.apiClient));
      
      logger.debug('User Shifts service tools registered');
    } catch (error) {
      logger.error('Failed to register User Shifts service tools:', { error });
    }
  }
  
  /**
   * Register Leaves service specific tools
   */
  private async registerLeavesServiceTools(): Promise<void> {
    try {
      const {
        ListLeavesTool,
        GetLeaveTool,
        CreateLeaveTool,
        UpdateLeaveTool,
        DeleteLeaveTool,
        ApproveLeaveTool,
        RejectLeaveTool,
        GetLeaveBalanceTool
      } = await import('./passgage/leaves-service.tool.js');
      
      this.registerTool(new ListLeavesTool(this.apiClient));
      this.registerTool(new GetLeaveTool(this.apiClient));
      this.registerTool(new CreateLeaveTool(this.apiClient));
      this.registerTool(new UpdateLeaveTool(this.apiClient));
      this.registerTool(new DeleteLeaveTool(this.apiClient));
      this.registerTool(new ApproveLeaveTool(this.apiClient));
      this.registerTool(new RejectLeaveTool(this.apiClient));
      this.registerTool(new GetLeaveBalanceTool(this.apiClient));
      
      logger.debug('Leaves service tools registered');
    } catch (error) {
      logger.error('Failed to register Leaves service tools:', { error });
    }
  }
  
  /**
   * Register Leave Types service specific tools
   */
  private async registerLeaveTypesServiceTools(): Promise<void> {
    try {
      const {
        ListLeaveTypesTool,
        GetLeaveTypeTool,
        CreateLeaveTypeTool,
        UpdateLeaveTypeTool,
        DeleteLeaveTypeTool,
        GetLeaveTypeEntitlementsTool,
        SetUserEntitlementTool
      } = await import('./passgage/leave-types-service.tool.js');
      
      this.registerTool(new ListLeaveTypesTool(this.apiClient));
      this.registerTool(new GetLeaveTypeTool(this.apiClient));
      this.registerTool(new CreateLeaveTypeTool(this.apiClient));
      this.registerTool(new UpdateLeaveTypeTool(this.apiClient));
      this.registerTool(new DeleteLeaveTypeTool(this.apiClient));
      this.registerTool(new GetLeaveTypeEntitlementsTool(this.apiClient));
      this.registerTool(new SetUserEntitlementTool(this.apiClient));
      
      logger.debug('Leave Types service tools registered');
    } catch (error) {
      logger.error('Failed to register Leave Types service tools:', { error });
    }
  }

  /**
   * Check if an exported item is a tool class
   */
  private isToolClass(item: any): boolean {
    return item && 
           typeof item === 'function' && 
           item.prototype instanceof BaseTool;
  }

  /**
   * Register a single tool
   */
  registerTool(tool: BaseTool): void {
    const metadata = tool.getMetadata();
    this.tools.set(metadata.name, tool);
    logger.debug(`Registered tool: ${metadata.name}`);
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [];
      
      for (const tool of this.tools.values()) {
        tools.push(tool.toMCPTool());
      }
      
      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }
      
      try {
        // For global deployments, create session-aware API client if session ID is provided
        if (this.globalSessionManager && args && args.sessionId) {
          const sessionId = args.sessionId as string;
          const authContext = await this.globalSessionManager.getAuthContext(sessionId);
          
          if (authContext) {
            // Create a session-specific API client
            const sessionAPIClient = new PassgageAPIClient({
              baseURL: 'https://api.passgage.com', // Default for Cloudflare Workers
              apiKey: authContext.companyApiKey,
              timeout: 30000,
              debug: false
            });
            
            // Manually set the auth context for this session
            if (authContext.userJwtToken) {
              (sessionAPIClient as any).authContext = {
                mode: authContext.mode,
                companyApiKey: authContext.companyApiKey,
                userJwtToken: authContext.userJwtToken,
                userInfo: authContext.userInfo,
                tokenExpiresAt: authContext.tokenExpiresAt
              };
            }
            
            // Update the tool's API client temporarily for this request
            const originalApiClient = (tool as any).apiClient;
            (tool as any).apiClient = sessionAPIClient;
            
            try {
              // Check permissions with session context
              const canExecute = await tool.checkPermissions();
              if (!canExecute.allowed) {
                return {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: canExecute.reason
                    }, null, 2)
                  }]
                };
              }
              
              // Execute tool with session-aware API client
              const result = await tool.execute(args || {});
              
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }]
              };
            } finally {
              // Restore original API client
              (tool as any).apiClient = originalApiClient;
            }
          }
        }
        
        // Standard execution path for local mode or tools without session
        const canExecute = await tool.checkPermissions();
        if (!canExecute.allowed) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: canExecute.reason
              }, null, 2)
            }]
          };
        }
        
        // Execute tool
        const result = await tool.execute(args || {});
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        logger.error(`Error executing tool ${name}:`, error);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message || 'Unknown error occurred'
            }, null, 2)
          }]
        };
      }
    });
  }

  /**
   * Get the count of registered tools
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get all registered tools
   */
  getTools(): Map<string, BaseTool> {
    return this.tools;
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool by name with arguments
   */
  async callTool(name: string, args: any, context?: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    logger.info(`Executing tool: ${name}`, { args, context });
    
    try {
      const result = await tool.execute(args);
      logger.debug(`Tool execution successful: ${name}`, { result });
      return result;
    } catch (error: any) {
      logger.error(`Tool execution failed: ${name}`, { error: error.message, args });
      throw error;
    }
  }

  /**
   * Create SessionManager instance based on deployment environment
   */
  private createSessionManager(): SessionManager {
    const config = {
      sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
      autoRefresh: true,
      maxRetries: 3,
      persistSessions: isCloudflareWorker,
      encryptionKey: 'default-encryption-key', // Will be overridden by environment
      kvStore: isCloudflareWorker ? {
        type: 'cloudflare' as const,
        namespace: 'PASSGAGE_SESSIONS'
      } : undefined
    };

    // In Cloudflare Workers, pass the environment
    const cloudflareEnv = isCloudflareWorker ? globalThis : undefined;
    
    return new SessionManager(config, cloudflareEnv);
  }
}