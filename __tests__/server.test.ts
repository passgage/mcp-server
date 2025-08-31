import { PassgageAPIClient } from '../src/api/client';
import { createAuthTools } from '../src/tools/auth';
import { createCRUDTools } from '../src/tools/crud';
import { createSpecializedTools } from '../src/tools/specialized';

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
      const client = new PassgageAPIClient({ baseUrl: 'https://api.passgage.com', timeout: 30000, debug: false });
      expect(client).toBeInstanceOf(PassgageAPIClient);
    });

    it('should have proper authentication context', () => {
      const client = new PassgageAPIClient({ baseUrl: 'https://api.passgage.com', timeout: 30000, debug: false });
      const authContext = client.getAuthContext();
      expect(authContext).toBeDefined();
      expect(authContext.mode).toBe('none'); // Default mode when no credentials provided
    });
  });

  describe('MCP Tools', () => {
    describe('Authentication Tools', () => {
      it('should create auth tools without errors', () => {
        const mockClient = new PassgageAPIClient({ baseUrl: 'https://api.passgage.com', timeout: 30000, debug: false });
        const authTools = createAuthTools(mockClient);
        expect(Array.isArray(authTools)).toBe(true);
        expect(authTools.length).toBe(8); // All auth tools including user/company modes
      });

      it('should have proper tool structure', () => {
        const mockClient = new PassgageAPIClient({ baseUrl: 'https://api.passgage.com', timeout: 30000, debug: false });
        const authTools = createAuthTools(mockClient);
        authTools.forEach(tool => {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
          expect(tool).toHaveProperty('inputSchema');
        });
      });
    });

    describe('CRUD Tools', () => {
      it('should create CRUD tools without errors', () => {
        const crudTools = createCRUDTools();
        expect(Array.isArray(crudTools)).toBe(true);
        expect(crudTools.length).toBeGreaterThan(100); // 125 CRUD tools
      });

      it('should have proper tool naming convention', () => {
        const crudTools = createCRUDTools();
        const toolNames = crudTools.map((tool: any) => tool.name);
        
        // Check for list tools
        expect(toolNames.some((name: string) => name.startsWith('passgage_list_'))).toBe(true);
        // Check for get tools
        expect(toolNames.some((name: string) => name.startsWith('passgage_get_'))).toBe(true);
        // Check for create tools
        expect(toolNames.some((name: string) => name.startsWith('passgage_create_'))).toBe(true);
      });
    });

    describe('Specialized Tools', () => {
      it('should create specialized tools without errors', () => {
        const mockClient = new PassgageAPIClient({ baseUrl: 'https://api.passgage.com', timeout: 30000, debug: false });
        const specializedTools = createSpecializedTools(mockClient);
        expect(Array.isArray(specializedTools)).toBe(true);
        expect(specializedTools.length).toBe(8); // 8 specialized tools
      });

      it('should include expected specialized tools', () => {
        const mockClient = new PassgageAPIClient({ baseUrl: 'https://api.passgage.com', timeout: 30000, debug: false });
        const specializedTools = createSpecializedTools(mockClient);
        const toolNames = specializedTools.map(tool => tool.name);
        
        expect(toolNames).toContain('passgage_upload_file');
        expect(toolNames).toContain('passgage_search');
        expect(toolNames).toContain('passgage_export_data');
      });
    });
  });

  describe('Tool Schemas', () => {
    it('should have valid JSON schemas for all tools', () => {
      const mockClient = new PassgageAPIClient({ baseUrl: 'https://api.passgage.com', timeout: 30000, debug: false });
      const allTools = [
        ...createAuthTools(mockClient),
        ...createCRUDTools(),
        ...createSpecializedTools(mockClient)
      ];

      allTools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
      });
    });
  });

  describe('Configuration', () => {
    it('should handle environment variables correctly', () => {
      expect(process.env.PASSGAGE_BASE_URL).toBe('https://api.passgage.com');
      expect(process.env.PASSGAGE_API_KEY).toBe('test-api-key');
    });
  });
});