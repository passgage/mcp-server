import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage, JSONRPCResponse, JSONRPCError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../config/logger.js';
import { SessionManager } from '../utils/session.js';
import { SecurityManager } from '../utils/security.js';
// Removed unused crypto imports

export interface HttpTransportOptions {
  type: 'http' | 'websocket' | 'cloudflare';
  port?: number;
  host?: string;
  path?: string;
  cors?: boolean;
  auth?: {
    type: 'session' | 'bearer' | 'oauth2';
    config?: any;
  };
  sessionManager?: SessionManager;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface SessionContext {
  sessionId?: string;
  userId?: string;
  authMode: 'user' | 'company' | 'none';
  isAuthenticated: boolean;
}

/**
 * Session-aware HTTP transport for multi-user global MCP server deployment
 * Supports Cloudflare Workers, traditional HTTP servers, and WebSocket
 */
export class HttpTransport implements Transport {
  private options: HttpTransportOptions;
  private messageHandlers = new Set<(message: JSONRPCMessage) => void>();
  private closeHandlers = new Set<() => void>();
  private errorHandlers = new Set<(error: Error) => void>();
  private sessionManager: SessionManager;
  private securityManager: SecurityManager;
  private currentSessionContext?: SessionContext;
  // private mcpServer?: any; // Reference to the MCP server (unused for now)
  private toolRegistry?: any; // Reference to the tool registry for direct tool execution

  constructor(options: HttpTransportOptions) {
    this.options = {
      port: 3000,
      host: 'localhost',
      path: '/mcp',
      cors: true,
      auth: { type: 'session' },
      rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 100
      },
      ...options
    };
    
    this.sessionManager = options.sessionManager || new SessionManager();
    
    // Initialize security manager
    this.securityManager = new SecurityManager({
      rateLimit: this.options.rateLimit,
      monitoring: {
        alertOnHighFailureRate: true,
        failureRateThreshold: 30,
        alertOnSuspiciousActivity: true
      }
    });
    
    logger.info(`HTTP transport configured for ${options.type} mode`, {
      port: this.options.port,
      host: this.options.host,
      path: this.options.path,
      authType: this.options.auth?.type,
      securityEnabled: true
    });
  }

  /**
   * Handle HTTP request (for Cloudflare Workers or other HTTP environments)
   */
  async handleRequest(request: HttpRequest): Promise<HttpResponse> {
    const startTime = Date.now();
    let clientId: string = 'unknown';
    let requestSuccess = false;
    
    try {
      // CORS preflight
      if (request.method === 'OPTIONS') {
        return this.createCorsResponse();
      }

      // Validate HTTP method
      if (request.method !== 'POST') {
        return this.createErrorResponse(405, 'Method not allowed');
      }

      // Generate client ID for security tracking
      const ipAddress = request.headers['x-forwarded-for'] || 
                       request.headers['cf-connecting-ip'] || 
                       request.headers['x-real-ip'] || 
                       'unknown';
      const userAgent = request.headers['user-agent'] || '';
      clientId = SecurityManager.generateClientId(ipAddress, userAgent);

      // Security: Rate limiting with advanced tracking
      const rateLimitResult = this.securityManager.checkRateLimit(clientId, ipAddress, userAgent);
      if (!rateLimitResult.allowed) {
        this.securityManager.recordRequest(clientId, request.url, false, undefined, ipAddress, userAgent);
        return this.createErrorResponse(429, 'Rate limit exceeded', {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        });
      }

      // Extract session context
      const sessionContext = await this.extractSessionContext(request);
      this.currentSessionContext = sessionContext;

      // Parse JSON-RPC message
      if (!request.body) {
        return this.createErrorResponse(400, 'Request body required');
      }

      let message: JSONRPCMessage;
      try {
        message = JSON.parse(request.body);
      } catch (error) {
        return this.createErrorResponse(400, 'Invalid JSON-RPC message');
      }

      // Validate session for non-auth tools
      if (!this.isAuthTool(message) && !sessionContext.isAuthenticated) {
        return this.createErrorResponse(401, 'Authentication required', {}, {
          error: 'Please authenticate first using passgage_session_login tool',
          sessionRequired: true
        });
      }

      // Process message through MCP handlers
      const response = await this.processMessage(message, sessionContext);
      
      // Mark request as successful
      requestSuccess = true;
      
      return this.createSuccessResponse(response);

    } catch (error: any) {
      logger.error('HTTP request processing error:', { error: error.message, clientId: clientId || 'unknown' });
      return this.createErrorResponse(500, 'Internal server error');
    } finally {
      // Record request for security monitoring
      if (clientId!) {
        const ipAddress = request.headers['x-forwarded-for'] || 
                         request.headers['cf-connecting-ip'] || 
                         request.headers['x-real-ip'] || 'unknown';
        const userAgent = request.headers['user-agent'] || '';
        
        this.securityManager.recordRequest(
          clientId,
          request.url,
          requestSuccess,
          this.currentSessionContext?.sessionId,
          ipAddress,
          userAgent
        );

        // Log request metrics
        const duration = Date.now() - startTime;
        logger.debug('Request processed', {
          clientId,
          sessionId: this.currentSessionContext?.sessionId,
          success: requestSuccess,
          duration,
          ipAddress
        });
      }
    }
  }

  /**
   * Extract session context from HTTP request
   */
  private async extractSessionContext(request: HttpRequest): Promise<SessionContext> {
    const sessionId = request.headers['x-session-id'] || 
                     request.headers['authorization']?.replace('Bearer ', '');

    if (!sessionId) {
      return {
        authMode: 'none',
        isAuthenticated: false
      };
    }

    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      return {
        sessionId,
        authMode: 'none',
        isAuthenticated: false
      };
    }

    return {
      sessionId,
      userId: session.userId,
      authMode: session.authMode,
      isAuthenticated: true
    };
  }

  /**
   * Check if the tool is an authentication tool
   */
  private isAuthTool(message: JSONRPCMessage): boolean {
    if ('method' in message && message.method === 'tools/call') {
      const toolName = (message.params as any)?.name;
      return (toolName && toolName.startsWith('passgage_session_')) || 
             (toolName && toolName.startsWith('passgage_login')) ||
             toolName === 'passgage_auth_status';
    }
    return false;
  }

  /**
   * Set the tool registry for direct tool execution
   */
  setToolRegistry(toolRegistry: any): void {
    this.toolRegistry = toolRegistry;
  }

  /**
   * Process JSON-RPC message through MCP server
   */
  private async processMessage(message: JSONRPCMessage, context: SessionContext): Promise<JSONRPCResponse | JSONRPCError> {
    try {
      logger.info('Processing message', { 
        method: 'method' in message ? message.method : 'unknown',
        messageHandlerCount: this.messageHandlers.size,
        messageId: 'id' in message ? message.id : null,
        hasToolRegistry: !!this.toolRegistry
      });

      // Handle tools/call method directly through tool registry
      if ('method' in message && message.method === 'tools/call' && this.toolRegistry) {
        const params = (message.params as any);
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          return {
            jsonrpc: '2.0',
            id: ('id' in message ? message.id : 'unknown') as string | number,
            error: {
              code: -32602,
              message: 'Invalid params',
              data: { reason: 'Tool name is required' }
            }
          } as JSONRPCError;
        }

        try {
          // Execute tool directly through registry
          const result = await this.toolRegistry.callTool(toolName, toolArgs, context);
          return {
            jsonrpc: '2.0',
            id: ('id' in message ? message.id : 'unknown') as string | number,
            result: result
          };
        } catch (error: any) {
          logger.error('Tool execution error:', { toolName, error: error.message });
          return {
            jsonrpc: '2.0',
            id: ('id' in message ? message.id : 'unknown') as string | number,
            error: {
              code: -32603,
              message: 'Tool execution failed',
              data: { toolName, error: error.message }
            }
          } as JSONRPCError;
        }
      }

      // Try to process message through message handlers (simulate MCP transport)
      if (this.messageHandlers.size > 0) {
        return new Promise((resolve) => {
          // Set up a one-time response handler
          const handleResponse = (response: any) => {
            resolve({
              jsonrpc: '2.0',
              id: ('id' in message ? message.id : 'unknown') as string | number,
              result: response
            });
          };

          // Trigger message handlers (this is what the MCP transport does)
          for (const handler of this.messageHandlers) {
            try {
              // The handler should be async and process the message
              const result = (handler as any)(message);
              if (result && typeof result.then === 'function') {
                result.then(handleResponse).catch((error: any) => {
                  resolve({
                    jsonrpc: '2.0',
                    id: ('id' in message ? message.id : 'unknown') as string | number,
                    error: {
                      code: -32603,
                      message: 'Internal error',
                      data: { error: error.message }
                    }
                  } as JSONRPCError);
                });
                return;
              } else if (result) {
                resolve({
                  jsonrpc: '2.0',
                  id: ('id' in message ? message.id : 'unknown') as string | number,
                  result: result
                });
                return;
              }
            } catch (error) {
              logger.error('Message handler error:', error);
            }
          }

          // If we reach here, no handler processed the message
          resolve({
            jsonrpc: '2.0',
            id: ('id' in message ? message.id : 'unknown') as string | number,
            error: {
              code: -32601,
              message: 'Method not found',
              data: { method: 'method' in message ? message.method : 'unknown' }
            }
          } as JSONRPCError);
        });
      }

      // Fallback to registered handlers
      let result: any = null;
      
      for (const handler of this.messageHandlers) {
        try {
          result = await handler(message);
          if (result) break;
        } catch (error) {
          logger.error('Message handler error:', error);
        }
      }
      
      // If no handler processed the message, return error
      if (!result) {
        return {
          jsonrpc: '2.0',
          id: ('id' in message ? message.id : 'unknown') as string | number,
          error: {
            code: -32601,
            message: 'Method not found',
            data: { method: 'method' in message ? message.method : 'unknown' }
          }
        } as JSONRPCError;
      }
      
      return {
        jsonrpc: '2.0',
        id: ('id' in message ? message.id : 'unknown') as string | number,
        result: result
      };
      
    } catch (error: any) {
      logger.error('Message processing error:', error);
      return {
        jsonrpc: '2.0',
        id: ('id' in message ? message.id : 'unknown') as string | number,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { error: error.message }
        }
      } as JSONRPCError;
    }
  }


  /**
   * Create CORS preflight response
   */
  private createCorsResponse(): HttpResponse {
    return {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  /**
   * Create success HTTP response
   */
  private createSuccessResponse(data: any): HttpResponse {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    };

    return {
      status: 200,
      headers,
      body: JSON.stringify(data, null, 2)
    };
  }

  /**
   * Create error HTTP response
   */
  private createErrorResponse(
    status: number, 
    message: string, 
    additionalHeaders: Record<string, string> = {},
    additionalData: any = {}
  ): HttpResponse {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...additionalHeaders
    };

    const errorResponse = {
      jsonrpc: '2.0',
      error: {
        code: status,
        message,
        ...additionalData
      },
      id: null
    };

    return {
      status,
      headers,
      body: JSON.stringify(errorResponse, null, 2)
    };
  }

  // Transport interface implementation for compatibility
  async start(): Promise<void> {
    logger.info('HTTP transport ready for request handling');
  }

  async send(message: JSONRPCMessage): Promise<void> {
    logger.debug('HTTP transport send (handled via handleRequest):', { message });
  }

  onMessage(handler: (message: JSONRPCMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  onClose(handler: () => void): void {
    this.closeHandlers.add(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.add(handler);
  }

  async close(): Promise<void> {
    logger.debug('Closing HTTP transport');
    this.closeHandlers.forEach(handler => handler());
  }

  /**
   * Get current session context
   */
  getCurrentSessionContext(): SessionContext | undefined {
    return this.currentSessionContext;
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    return this.securityManager.getSecurityStats();
  }

  /**
   * Get recent security events
   */
  getRecentSecurityEvents(limit?: number) {
    return this.securityManager.getRecentEvents(limit);
  }

  /**
   * Get client information (for admin purposes)
   */
  getClientInfo(clientId: string) {
    return this.securityManager.getClientInfo(clientId);
  }
}