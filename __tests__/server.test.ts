import { PassgageAPIClient } from '../src/api/client';
import { createAuthTools } from '../src/tools/auth';
import { createCrudTools } from '../src/tools/crud';
import { createSpecializedTools } from '../src/tools/specialized';

// Mock environment variables
process.env.PASSGAGE_BASE_URL = 'https://api.passgage.com';
process.env.PASSGAGE_API_KEY = 'test-api-key';

describe('Passgage MCP Server', () => {
  describe('API Client', () => {
    it('should initialize with correct configuration', () => {
      const client = new PassgageAPIClient();
      expect(client).toBeInstanceOf(PassgageAPIClient);
    });

    it('should have proper authentication context', () => {
      const client = new PassgageAPIClient();
      const authContext = client.getAuthContext();
      expect(authContext).toBeDefined();
      expect(authContext.mode).toBe('company');
    });
  });

  describe('MCP Tools', () => {
    describe('Authentication Tools', () => {
      it('should create auth tools without errors', () => {
        const authTools = createAuthTools();
        expect(Array.isArray(authTools)).toBe(true);
        expect(authTools.length).toBe(4); // login, logout, refresh, status
      });

      it('should have proper tool structure', () => {
        const authTools = createAuthTools();
        authTools.forEach(tool => {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
          expect(tool).toHaveProperty('inputSchema');
        });
      });
    });

    describe('CRUD Tools', () => {
      it('should create CRUD tools without errors', () => {
        const crudTools = createCrudTools();
        expect(Array.isArray(crudTools)).toBe(true);
        expect(crudTools.length).toBeGreaterThan(100); // 125 CRUD tools
      });

      it('should have proper tool naming convention', () => {
        const crudTools = createCrudTools();
        const toolNames = crudTools.map(tool => tool.name);
        
        // Check for list tools
        expect(toolNames.some(name => name.startsWith('passgage_list_'))).toBe(true);
        // Check for get tools
        expect(toolNames.some(name => name.startsWith('passgage_get_'))).toBe(true);
        // Check for create tools
        expect(toolNames.some(name => name.startsWith('passgage_create_'))).toBe(true);
      });
    });

    describe('Specialized Tools', () => {
      it('should create specialized tools without errors', () => {
        const specializedTools = createSpecializedTools();
        expect(Array.isArray(specializedTools)).toBe(true);
        expect(specializedTools.length).toBe(8); // 8 specialized tools
      });

      it('should include expected specialized tools', () => {
        const specializedTools = createSpecializedTools();
        const toolNames = specializedTools.map(tool => tool.name);
        
        expect(toolNames).toContain('passgage_upload_file');
        expect(toolNames).toContain('passgage_search');
        expect(toolNames).toContain('passgage_export_data');
      });
    });
  });

  describe('Tool Schemas', () => {
    it('should have valid JSON schemas for all tools', () => {
      const allTools = [
        ...createAuthTools(),
        ...createCrudTools(),
        ...createSpecializedTools()
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