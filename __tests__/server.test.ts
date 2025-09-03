import { PassgageAPIClient } from '../src/api/client.js';
import { ToolRegistry } from '../src/tools/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock environment variables and Jest setup
process.env.NODE_ENV = 'test';
process.env.PASSGAGE_BASE_URL = 'https://api.passgage.com';
process.env.PASSGAGE_API_KEY = 'test-api-key';
process.env.PASSGAGE_TIMEOUT = '30000';
process.env.PASSGAGE_DEBUG = 'false';

// Global test timeout will be handled by jest config

describe('Passgage MCP Server', () => {
  describe('API Client', () => {
    it('should initialize with correct configuration', () => {
      const client = new PassgageAPIClient({ 
        baseURL: 'https://api.passgage.com', 
        timeout: 30000, 
        debug: false 
      });
      expect(client).toBeInstanceOf(PassgageAPIClient);
    });

    it('should have proper authentication context', () => {
      const client = new PassgageAPIClient({ 
        baseURL: 'https://api.passgage.com', 
        timeout: 30000, 
        debug: false 
      });
      const authContext = client.getAuthContext();
      expect(authContext).toBeDefined();
      expect(authContext.mode).toBe('none'); // Default mode when no credentials provided
    });

    it('should handle API key authentication mode', () => {
      const client = new PassgageAPIClient({ 
        baseURL: 'https://api.passgage.com',
        apiKey: 'test-api-key',
        timeout: 30000, 
        debug: false 
      });
      const authContext = client.getAuthContext();
      expect(authContext.mode).toBe('company');
      expect(authContext.companyApiKey).toBe('test-api-key');
    });

    it('should support mode switching', () => {
      const client = new PassgageAPIClient({ 
        baseURL: 'https://api.passgage.com',
        apiKey: 'test-api-key',
        timeout: 30000, 
        debug: false 
      });
      
      // Should start in company mode
      expect(client.getAuthMode()).toBe('company');
      
      // Should be able to check if authenticated
      expect(client.isAuthenticated()).toBe(true);
    });
  });

  describe('Tool Registry', () => {
    let server: Server;
    let client: PassgageAPIClient;
    let toolRegistry: ToolRegistry;

    beforeEach(() => {
      server = new Server({
        name: 'test-passgage-server',
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });
      
      client = new PassgageAPIClient({ 
        baseURL: 'https://api.passgage.com',
        apiKey: 'test-api-key',
        timeout: 30000, 
        debug: false 
      });
      
      toolRegistry = new ToolRegistry(server, client);
    });

    it('should initialize tool registry without errors', () => {
      expect(toolRegistry).toBeInstanceOf(ToolRegistry);
      expect(toolRegistry.getToolCount()).toBe(0); // No tools registered yet
    });

    it('should register all tools successfully', async () => {
      await toolRegistry.registerAll();
      const toolCount = toolRegistry.getToolCount();
      expect(toolCount).toBeGreaterThan(25); // Should have 29+ tools
    });

    it('should register authentication tools', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      // Check for specific auth tools
      expect(tools.has('passgage_login')).toBe(true);
      expect(tools.has('passgage_logout')).toBe(true);
      expect(tools.has('passgage_auth_status')).toBe(true);
      expect(tools.has('passgage_switch_to_company_mode')).toBe(true);
      expect(tools.has('passgage_switch_to_user_mode')).toBe(true);
    });

    it('should register service-specific tools', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      // Check for users service tools
      expect(tools.has('passgage_list_users')).toBe(true);
      expect(tools.has('passgage_get_user')).toBe(true);
      expect(tools.has('passgage_create_user')).toBe(true);
      
      // Check for approvals service tools
      expect(tools.has('passgage_list_approvals')).toBe(true);
      expect(tools.has('passgage_approve_request')).toBe(true);
      expect(tools.has('passgage_bulk_approval')).toBe(true);
    });

    it('should register file upload tools', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      expect(tools.has('passgage_generate_presigned_url')).toBe(true);
      expect(tools.has('passgage_confirm_upload')).toBe(true);
      expect(tools.has('passgage_get_file')).toBe(true);
    });

    it('should register advanced search tools', async () => {
      await toolRegistry.registerAll();
      const tools = toolRegistry.getTools();
      
      expect(tools.has('passgage_advanced_search')).toBe(true);
      expect(tools.has('passgage_build_ransack_query')).toBe(true);
      expect(tools.has('passgage_explain_ransack_operators')).toBe(true);
    });
  });

  describe('Tool Schemas', () => {
    it('should have valid MCP tool schemas', async () => {
      const server = new Server({
        name: 'test-passgage-server',
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {}
        }
      });
      
      const client = new PassgageAPIClient({ 
        baseURL: 'https://api.passgage.com',
        apiKey: 'test-api-key',
        timeout: 30000, 
        debug: false 
      });
      
      const toolRegistry = new ToolRegistry(server, client);
      await toolRegistry.registerAll();
      
      const tools = toolRegistry.getTools();
      expect(tools.size).toBeGreaterThan(25);
      
      // Check each tool has proper MCP schema
      for (const tool of tools.values()) {
        const mcpTool = tool.toMCPTool();
        expect(mcpTool).toHaveProperty('name');
        expect(mcpTool).toHaveProperty('description');
        expect(mcpTool).toHaveProperty('inputSchema');
        expect(mcpTool.inputSchema.type).toBe('object');
      }
    });
  });

  describe('Configuration', () => {
    it('should handle environment variables correctly', () => {
      expect(process.env.PASSGAGE_BASE_URL).toBe('https://api.passgage.com');
      expect(process.env.PASSGAGE_API_KEY).toBe('test-api-key');
    });
  });
});