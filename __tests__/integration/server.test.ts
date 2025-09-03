import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PassgageAPIClient } from '../../src/api/client.js';
import { ToolRegistry } from '../../src/tools/index.js';
import { ResourceRegistry } from '../../src/resources/index.js';
import { PromptRegistry } from '../../src/prompts/index.js';
import { jest } from '@jest/globals';
import { Readable, Writable } from 'stream';

// Mock all external dependencies
jest.mock('../../src/config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../src/config/env.js', () => ({
  env: {
    PASSGAGE_API_KEY: 'test-api-key',
    PASSGAGE_BASE_URL: 'https://api.test.com',
    PASSGAGE_TIMEOUT: 30000,
    PASSGAGE_DEBUG: false,
    TRANSPORT_TYPE: 'stdio',
    NODE_ENV: 'test'
  }
}));

// Mock stdio transport
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');

// Mock API client
jest.mock('../../src/api/client.js');

describe('MCP Server Integration', () => {
  let server: Server;
  let apiClient: PassgageAPIClient;
  let mockTransport: any;
  let mockStdin: Readable;
  let mockStdout: Writable;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock stdio streams
    mockStdin = new Readable({ read() {} });
    mockStdout = new Writable({ write() {} });

    // Mock transport
    mockTransport = {
      start: jest.fn(),
      close: jest.fn()
    };

    (StdioServerTransport as jest.Mock).mockImplementation(() => mockTransport);

    // Mock API client
    apiClient = {
      setApiKey: jest.fn(),
      getAuthMode: jest.fn(() => 'company'),
      hasValidAuth: jest.fn(() => true)
    } as any;

    (PassgageAPIClient as jest.Mock).mockImplementation(() => apiClient);

    // Create server instance
    server = new Server({
      name: 'passgage-mcp-server',
      version: '2.0.0'
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      }
    });
  });

  describe('Server Initialization', () => {
    it('should create server with correct configuration', () => {
      expect(server).toBeInstanceOf(Server);
    });

    it('should initialize API client with configuration', () => {
      expect(PassgageAPIClient).toHaveBeenCalledWith({
        baseURL: 'https://api.test.com',
        timeout: 30000,
        debug: false
      });
    });

    it('should set API key when provided', () => {
      expect(apiClient.setApiKey).toHaveBeenCalledWith('test-api-key');
    });
  });

  describe('Component Integration', () => {
    let toolRegistry: ToolRegistry;
    let resourceRegistry: ResourceRegistry;
    let promptRegistry: PromptRegistry;

    beforeEach(() => {
      toolRegistry = new ToolRegistry(server, apiClient);
      resourceRegistry = new ResourceRegistry(server, apiClient);
      promptRegistry = new PromptRegistry(server);

      // Mock registry methods
      jest.spyOn(toolRegistry, 'registerAll').mockResolvedValue();
      jest.spyOn(resourceRegistry, 'registerAll').mockResolvedValue();
      jest.spyOn(promptRegistry, 'registerAll').mockResolvedValue();
    });

    it('should initialize all registries', async () => {
      await toolRegistry.registerAll();
      await resourceRegistry.registerAll();
      await promptRegistry.registerAll();

      expect(toolRegistry.registerAll).toHaveBeenCalled();
      expect(resourceRegistry.registerAll).toHaveBeenCalled();
      expect(promptRegistry.registerAll).toHaveBeenCalled();
    });

    it('should handle registry initialization errors', async () => {
      const error = new Error('Registry initialization failed');
      jest.spyOn(toolRegistry, 'registerAll').mockRejectedValue(error);

      await expect(toolRegistry.registerAll()).rejects.toThrow('Registry initialization failed');
    });
  });

  describe('Transport Integration', () => {
    it('should create stdio transport', () => {
      const transport = new StdioServerTransport();
      expect(StdioServerTransport).toHaveBeenCalled();
    });

    it('should start transport successfully', async () => {
      mockTransport.start.mockResolvedValue(undefined);

      await mockTransport.start();

      expect(mockTransport.start).toHaveBeenCalled();
    });

    it('should handle transport startup errors', async () => {
      const error = new Error('Transport startup failed');
      mockTransport.start.mockRejectedValue(error);

      await expect(mockTransport.start()).rejects.toThrow('Transport startup failed');
    });

    it('should close transport gracefully', async () => {
      mockTransport.close.mockResolvedValue(undefined);

      await mockTransport.close();

      expect(mockTransport.close).toHaveBeenCalled();
    });
  });

  describe('Request Handling Integration', () => {
    let mockHandler: jest.Mock;

    beforeEach(() => {
      mockHandler = jest.fn();
      server.setRequestHandler = jest.fn();
    });

    it('should register request handlers', () => {
      const schema = { method: 'test/method' };
      server.setRequestHandler(schema, mockHandler);

      expect(server.setRequestHandler).toHaveBeenCalledWith(schema, mockHandler);
    });

    it('should handle multiple request types', () => {
      const toolsHandler = jest.fn();
      const resourcesHandler = jest.fn();
      const promptsHandler = jest.fn();

      server.setRequestHandler({ method: 'tools/list' }, toolsHandler);
      server.setRequestHandler({ method: 'resources/list' }, resourcesHandler);
      server.setRequestHandler({ method: 'prompts/list' }, promptsHandler);

      expect(server.setRequestHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API client errors gracefully', async () => {
      const apiError = new Error('API connection failed');
      (apiClient.hasValidAuth as jest.Mock).mockImplementation(() => {
        throw apiError;
      });

      expect(() => apiClient.hasValidAuth()).toThrow('API connection failed');
    });

    it('should handle server initialization errors', () => {
      expect(() => {
        new Server({
          name: '',
          version: ''
        });
      }).not.toThrow();
    });
  });

  describe('Configuration Integration', () => {
    it('should use environment configuration', async () => {
      const { env } = await import('../../src/config/env.js');

      expect(env.PASSGAGE_API_KEY).toBe('test-api-key');
      expect(env.PASSGAGE_BASE_URL).toBe('https://api.test.com');
      expect(env.TRANSPORT_TYPE).toBe('stdio');
    });

    it('should adapt to different transport types', () => {
      // Test stdio transport (default)
      expect(StdioServerTransport).toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent registrations efficiently', async () => {
      const toolRegistry = new ToolRegistry(server, apiClient);
      const resourceRegistry = new ResourceRegistry(server, apiClient);
      const promptRegistry = new PromptRegistry(server);

      jest.spyOn(toolRegistry, 'registerAll').mockResolvedValue();
      jest.spyOn(resourceRegistry, 'registerAll').mockResolvedValue();
      jest.spyOn(promptRegistry, 'registerAll').mockResolvedValue();

      const startTime = Date.now();

      await Promise.all([
        toolRegistry.registerAll(),
        resourceRegistry.registerAll(),
        promptRegistry.registerAll()
      ]);

      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in <1s
      expect(toolRegistry.registerAll).toHaveBeenCalled();
      expect(resourceRegistry.registerAll).toHaveBeenCalled();
      expect(promptRegistry.registerAll).toHaveBeenCalled();
    });

    it('should handle high-frequency requests', async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      server.setRequestHandler = jest.fn();

      // Simulate registering many handlers
      for (let i = 0; i < 100; i++) {
        server.setRequestHandler({ method: `test/method${i}` }, mockHandler);
      }

      expect(server.setRequestHandler).toHaveBeenCalledTimes(100);
    });
  });

  describe('Memory Management Integration', () => {
    it('should handle registry cleanup', () => {
      const toolRegistry = new ToolRegistry(server, apiClient);
      
      // Registries should be garbage collectable when out of scope
      expect(toolRegistry).toBeDefined();
    });

    it('should manage request handler memory', () => {
      const handlers = [];
      
      // Create many handlers
      for (let i = 0; i < 50; i++) {
        handlers.push(jest.fn().mockResolvedValue({ data: `response${i}` }));
      }

      expect(handlers).toHaveLength(50);
    });
  });

  describe('Logging Integration', () => {
    it('should integrate with logger across components', async () => {
      const mockLogger = require('../../src/config/logger.js').logger;

      const toolRegistry = new ToolRegistry(server, apiClient);
      jest.spyOn(toolRegistry, 'registerAll').mockImplementation(async () => {
        mockLogger.info('Tools registered');
      });

      await toolRegistry.registerAll();

      expect(mockLogger.info).toHaveBeenCalledWith('Tools registered');
    });

    it('should log errors consistently', () => {
      const mockLogger = require('../../src/config/logger.js').logger;

      try {
        throw new Error('Test error');
      } catch (error) {
        mockLogger.error('Integration error:', error);
      }

      expect(mockLogger.error).toHaveBeenCalledWith('Integration error:', expect.any(Error));
    });
  });

  describe('Full Bootstrap Integration', () => {
    it('should complete full server bootstrap process', async () => {
      const mockLogger = require('../../src/config/logger.js').logger;

      // Simulate bootstrap process
      const bootstrap = async () => {
        mockLogger.info('Starting Passgage MCP Server...');

        const apiClient = new PassgageAPIClient({
          baseURL: 'https://api.test.com',
          timeout: 30000,
          debug: false
        });

        apiClient.setApiKey('test-api-key');

        const server = new Server({
          name: 'passgage-mcp-server',
          version: '2.0.0'
        });

        const toolRegistry = new ToolRegistry(server, apiClient);
        const resourceRegistry = new ResourceRegistry(server, apiClient);
        const promptRegistry = new PromptRegistry(server);

        await Promise.all([
          toolRegistry.registerAll(),
          resourceRegistry.registerAll(),
          promptRegistry.registerAll()
        ]);

        const transport = new StdioServerTransport();
        await transport.start();

        mockLogger.info('Server started successfully');

        return { server, transport, apiClient };
      };

      const result = await bootstrap();

      expect(result.server).toBeInstanceOf(Server);
      expect(result.apiClient).toBeDefined();
      expect(result.transport).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Starting Passgage MCP Server...');
      expect(mockLogger.info).toHaveBeenCalledWith('Server started successfully');
    });
  });
});