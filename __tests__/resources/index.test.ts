import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  ResourceRegistry, 
  BaseResource, 
  ResourceMetadata 
} from '../../src/resources/index.js';
import { PassgageAPIClient } from '../../src/api/client.js';
import { jest } from '@jest/globals';

// Mock logger silently
jest.mock('../../src/config/logger.js', () => ({
  logger: {
    info: jest.fn(() => {}),
    warn: jest.fn(() => {}),
    error: jest.fn(() => {}),
    debug: jest.fn(() => {})
  }
}));

// Mock process methods for uptime and memory
const mockProcess = {
  uptime: jest.fn(() => 3600), // 1 hour uptime
  memoryUsage: jest.fn(() => ({
    rss: 50000000, // 50MB
    heapTotal: 30000000, // 30MB
    heapUsed: 20000000, // 20MB
    external: 1000000, // 1MB
    arrayBuffers: 500000 // 0.5MB
  }))
};

Object.defineProperty(global, 'process', {
  value: {
    ...process,
    uptime: mockProcess.uptime,
    memoryUsage: mockProcess.memoryUsage
  },
  writable: true
});

describe('MCP Resources System', () => {
  let server: Server;
  let apiClient: PassgageAPIClient;
  let registry: ResourceRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock MCP server
    server = {
      setRequestHandler: jest.fn()
    } as any;

    // Mock API client
    apiClient = {
      getAuthMode: jest.fn(() => 'company'),
      hasValidAuth: jest.fn(() => true)
    } as any;

    registry = new ResourceRegistry(server, apiClient);
  });

  describe('BaseResource Abstract Class', () => {
    class TestResource extends BaseResource {
      constructor(apiClient?: PassgageAPIClient) {
        super(apiClient);
      }

      getMetadata(): ResourceMetadata {
        return {
          uri: 'test://resource',
          name: 'Test Resource',
          description: 'A test resource for unit testing',
          mimeType: 'text/plain'
        };
      }

      async read(): Promise<string> {
        return 'Test resource content';
      }
    }

    it('should create resource with API client', () => {
      const resource = new TestResource(apiClient);
      expect(resource['apiClient']).toBe(apiClient);
    });

    it('should create resource without API client', () => {
      const resource = new TestResource();
      expect(resource['apiClient']).toBeUndefined();
    });

    it('should convert to MCP resource format', () => {
      const resource = new TestResource(apiClient);
      const mcpResource = resource.toMCPResource();

      expect(mcpResource).toEqual({
        uri: 'test://resource',
        name: 'Test Resource',
        description: 'A test resource for unit testing',
        mimeType: 'text/plain'
      });
    });

    it('should handle missing optional fields in MCP conversion', () => {
      class MinimalTestResource extends BaseResource {
        getMetadata(): ResourceMetadata {
          return {
            uri: 'minimal://resource',
            name: 'Minimal Resource'
          };
        }

        async read(): Promise<string> {
          return 'Minimal content';
        }
      }

      const resource = new MinimalTestResource();
      const mcpResource = resource.toMCPResource();

      expect(mcpResource).toEqual({
        uri: 'minimal://resource',
        name: 'Minimal Resource',
        description: undefined,
        mimeType: undefined
      });
    });
  });

  describe('ResourceRegistry', () => {
    it('should initialize with server and API client', () => {
      expect(registry['server']).toBe(server);
      expect(registry['apiClient']).toBe(apiClient);
      expect(registry['resources']).toBeInstanceOf(Map);
      expect(registry.getResourceCount()).toBe(0);
    });

    it('should register resources correctly', () => {
      class TestResource extends BaseResource {
        getMetadata(): ResourceMetadata {
          return {
            uri: 'test://custom',
            name: 'Custom Resource'
          };
        }

        async read(): Promise<string> {
          return 'Custom content';
        }
      }

      const resource = new TestResource();
      registry.registerResource(resource);

      expect(registry.getResourceCount()).toBe(1);
      expect(registry['resources'].has('test://custom')).toBe(true);
    });

    it('should register multiple resources', () => {
      const resources = [
        { uri: 'test://resource1', name: 'Resource 1' },
        { uri: 'test://resource2', name: 'Resource 2' },
        { uri: 'test://resource3', name: 'Resource 3' }
      ];

      resources.forEach((metadata, index) => {
        class TestResource extends BaseResource {
          getMetadata(): ResourceMetadata {
            return metadata;
          }

          async read(): Promise<string> {
            return `Content ${index + 1}`;
          }
        }

        registry.registerResource(new TestResource());
      });

      expect(registry.getResourceCount()).toBe(3);
    });

    it('should setup MCP handlers during registration', async () => {
      await registry.registerAll();

      expect(server.setRequestHandler).toHaveBeenCalledTimes(2);
      expect(server.setRequestHandler).toHaveBeenCalledWith(
        expect.any(Object), // ListResourcesRequestSchema
        expect.any(Function)
      );
      expect(server.setRequestHandler).toHaveBeenCalledWith(
        expect.any(Object), // ReadResourceRequestSchema
        expect.any(Function)
      );
    });
  });

  describe('List Resources Handler', () => {
    let listResourcesHandler: any;

    beforeEach(async () => {
      await registry.registerAll();
      
      // Extract the handler function
      const calls = (server.setRequestHandler as jest.Mock).mock.calls;
      const listCall = calls.find(call => 
        call[0].method === 'resources/list' || 
        typeof call[1] === 'function'
      );
      listResourcesHandler = listCall ? listCall[1] : calls[0][1];
    });

    it('should list all registered resources', async () => {
      const result = await listResourcesHandler();

      expect(result).toHaveProperty('resources');
      expect(Array.isArray(result.resources)).toBe(true);
      expect(result.resources.length).toBeGreaterThanOrEqual(2); // health + config
    });

    it('should return health and config resources by default', async () => {
      const result = await listResourcesHandler();

      const resourceUris = result.resources.map((r: any) => r.uri);
      expect(resourceUris).toContain('passgage://health');
      expect(resourceUris).toContain('passgage://config');
    });

    it('should return resources in correct MCP format', async () => {
      const result = await listResourcesHandler();

      result.resources.forEach((resource: any) => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(typeof resource.uri).toBe('string');
        expect(typeof resource.name).toBe('string');
      });
    });
  });

  describe('Read Resource Handler', () => {
    let readResourceHandler: any;

    beforeEach(async () => {
      await registry.registerAll();
      
      // Extract the handler function
      const calls = (server.setRequestHandler as jest.Mock).mock.calls;
      const readCall = calls.find(call => call[1] && call[1].toString().includes('uri'));
      readResourceHandler = readCall ? readCall[1] : calls[1][1];
    });

    it('should read existing resource content', async () => {
      const request = {
        params: { uri: 'passgage://health' }
      };

      const result = await readResourceHandler(request);

      expect(result).toHaveProperty('contents');
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents).toHaveLength(1);

      const content = result.contents[0];
      expect(content).toHaveProperty('uri', 'passgage://health');
      expect(content).toHaveProperty('mimeType');
      expect(content).toHaveProperty('text');
      expect(typeof content.text).toBe('string');
    });

    it('should throw error for unknown resource', async () => {
      const request = {
        params: { uri: 'unknown://resource' }
      };

      await expect(readResourceHandler(request)).rejects.toThrow('Unknown resource: unknown://resource');
    });

    it('should use default mime type when not specified', async () => {
      // Register a resource without mime type
      class NoMimeTypeResource extends BaseResource {
        getMetadata(): ResourceMetadata {
          return {
            uri: 'test://no-mime',
            name: 'No MIME Type'
          };
        }

        async read(): Promise<string> {
          return 'Content without mime type';
        }
      }

      registry.registerResource(new NoMimeTypeResource());

      const request = {
        params: { uri: 'test://no-mime' }
      };

      const result = await readResourceHandler(request);
      expect(result.contents[0].mimeType).toBe('text/plain');
    });

    it('should handle resource read errors', async () => {
      // Register a resource that throws an error
      class ErrorResource extends BaseResource {
        getMetadata(): ResourceMetadata {
          return {
            uri: 'test://error',
            name: 'Error Resource'
          };
        }

        async read(): Promise<string> {
          throw new Error('Resource read failed');
        }
      }

      registry.registerResource(new ErrorResource());

      const request = {
        params: { uri: 'test://error' }
      };

      await expect(readResourceHandler(request)).rejects.toThrow('Resource read failed');
    });
  });

  describe('HealthResource', () => {
    let healthResource: any;

    beforeEach(async () => {
      await registry.registerAll();
      healthResource = registry['resources'].get('passgage://health');
    });

    it('should have correct metadata', () => {
      const metadata = healthResource.getMetadata();

      expect(metadata.uri).toBe('passgage://health');
      expect(metadata.name).toBe('Server Health');
      expect(metadata.description).toContain('health status');
      expect(metadata.mimeType).toBe('application/json');
    });

    it('should return valid health data', async () => {
      const content = await healthResource.read();
      const healthData = JSON.parse(content);

      expect(healthData).toHaveProperty('status', 'healthy');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('uptime');
      expect(healthData).toHaveProperty('memory');
      expect(healthData).toHaveProperty('apiConnected');

      expect(new Date(healthData.timestamp).getTime()).toBeGreaterThan(0);
      expect(typeof healthData.uptime).toBe('number');
      expect(typeof healthData.memory).toBe('object');
      expect(typeof healthData.apiConnected).toBe('boolean');
    });

    it('should report API connection status when client available', async () => {
      const content = await healthResource.read();
      const healthData = JSON.parse(content);

      expect(healthData.apiConnected).toBe(true);
    });

    it('should report no API connection when client unavailable', async () => {
      // Create health resource without API client
      class TestHealthResource extends BaseResource {
        constructor() {
          super(undefined);
        }

        getMetadata(): ResourceMetadata {
          return {
            uri: 'test://health',
            name: 'Test Health'
          };
        }

        async read(): Promise<string> {
          const health = {
            apiConnected: this.apiClient ? this.apiClient.getAuthMode() !== 'none' : false
          };
          return JSON.stringify(health);
        }
      }

      const testHealth = new TestHealthResource();
      const content = await testHealth.read();
      const healthData = JSON.parse(content);

      expect(healthData.apiConnected).toBe(false);
    });

    it('should include process memory information', async () => {
      const content = await healthResource.read();
      const healthData = JSON.parse(content);

      expect(healthData.memory).toHaveProperty('rss');
      expect(healthData.memory).toHaveProperty('heapTotal');
      expect(healthData.memory).toHaveProperty('heapUsed');
      expect(healthData.memory).toHaveProperty('external');

      expect(healthData.memory.rss).toBe(50000000);
      expect(healthData.memory.heapTotal).toBe(30000000);
      expect(healthData.memory.heapUsed).toBe(20000000);
    });

    it('should include server uptime', async () => {
      const content = await healthResource.read();
      const healthData = JSON.parse(content);

      expect(healthData.uptime).toBe(3600);
      expect(mockProcess.uptime).toHaveBeenCalled();
    });
  });

  describe('ConfigResource', () => {
    let configResource: any;
    const originalEnv = process.env;

    beforeEach(async () => {
      process.env = {
        ...originalEnv,
        TRANSPORT_TYPE: 'stdio',
        PASSGAGE_BASE_URL: 'https://test.api.com',
        PASSGAGE_DEBUG: 'true',
        NODE_ENV: 'test'
      };

      await registry.registerAll();
      configResource = registry['resources'].get('passgage://config');
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should have correct metadata', () => {
      const metadata = configResource.getMetadata();

      expect(metadata.uri).toBe('passgage://config');
      expect(metadata.name).toBe('Server Configuration');
      expect(metadata.description).toContain('configuration');
      expect(metadata.mimeType).toBe('application/json');
    });

    it('should return configuration data', async () => {
      const content = await configResource.read();
      const configData = JSON.parse(content);

      expect(configData).toHaveProperty('transport');
      expect(configData).toHaveProperty('apiBaseUrl');
      expect(configData).toHaveProperty('debug');
      expect(configData).toHaveProperty('nodeEnv');
      expect(configData).toHaveProperty('version');
    });

    it('should include current environment values', async () => {
      const content = await configResource.read();
      const configData = JSON.parse(content);

      expect(configData.transport).toBe('stdio');
      expect(configData.apiBaseUrl).toBe('https://test.api.com');
      expect(configData.debug).toBe(true);
      expect(configData.nodeEnv).toBe('test');
      expect(configData.version).toBe('2.0.0');
    });

    it('should use defaults for missing environment variables', async () => {
      process.env = {
        ...originalEnv,
        TRANSPORT_TYPE: undefined,
        PASSGAGE_DEBUG: undefined,
        NODE_ENV: undefined
      };
      delete process.env.TRANSPORT_TYPE;
      delete process.env.PASSGAGE_DEBUG;
      delete process.env.NODE_ENV;

      const content = await configResource.read();
      const configData = JSON.parse(content);

      expect(configData.transport).toBe('stdio'); // Default
      expect(configData.debug).toBe(false); // Default
      expect(configData.nodeEnv).toBe('production'); // Default
    });

    it('should not expose sensitive information', async () => {
      process.env = {
        ...originalEnv,
        PASSGAGE_API_KEY: 'secret-api-key',
        PASSGAGE_USER_PASSWORD: 'secret-password'
      };

      const content = await configResource.read();
      const configData = JSON.parse(content);

      expect(configData).not.toHaveProperty('PASSGAGE_API_KEY');
      expect(configData).not.toHaveProperty('PASSGAGE_USER_PASSWORD');
      expect(JSON.stringify(configData)).not.toContain('secret-api-key');
      expect(JSON.stringify(configData)).not.toContain('secret-password');
    });
  });

  describe('Resource Registration Process', () => {
    it('should register all built-in resources', async () => {
      expect(registry.getResourceCount()).toBe(0);

      await registry.registerAll();

      expect(registry.getResourceCount()).toBe(2); // health + config
      expect(registry['resources'].has('passgage://health')).toBe(true);
      expect(registry['resources'].has('passgage://config')).toBe(true);
    });

    it('should handle resource registration errors gracefully', async () => {
      const mockLogger = (await import('../../src/config/logger.js')).logger;

      class FaultyResource extends BaseResource {
        getMetadata(): ResourceMetadata {
          throw new Error('Metadata error');
        }

        async read(): Promise<string> {
          return 'content';
        }
      }

      expect(() => {
        registry.registerResource(new FaultyResource());
      }).toThrow('Metadata error');
    });
  });

  describe('Custom Resource Integration', () => {
    it('should support custom resource types', async () => {
      class CustomDataResource extends BaseResource {
        private data: any;

        constructor(data: any, apiClient?: PassgageAPIClient) {
          super(apiClient);
          this.data = data;
        }

        getMetadata(): ResourceMetadata {
          return {
            uri: 'custom://data',
            name: 'Custom Data',
            description: 'Custom data resource',
            mimeType: 'application/json'
          };
        }

        async read(): Promise<string> {
          return JSON.stringify(this.data, null, 2);
        }
      }

      const customData = { id: 1, name: 'Test', active: true };
      const customResource = new CustomDataResource(customData, apiClient);

      registry.registerResource(customResource);

      expect(registry.getResourceCount()).toBe(1);

      const content = await customResource.read();
      const parsedData = JSON.parse(content);

      expect(parsedData).toEqual(customData);
    });

    it('should support async resource initialization', async () => {
      class AsyncResource extends BaseResource {
        private initialized = false;

        getMetadata(): ResourceMetadata {
          return {
            uri: 'async://resource',
            name: 'Async Resource'
          };
        }

        async read(): Promise<string> {
          if (!this.initialized) {
            // Simulate async initialization
            await new Promise(resolve => setTimeout(resolve, 10));
            this.initialized = true;
          }

          return JSON.stringify({ 
            initialized: this.initialized,
            timestamp: new Date().toISOString()
          });
        }
      }

      const asyncResource = new AsyncResource();
      registry.registerResource(asyncResource);

      const content = await asyncResource.read();
      const data = JSON.parse(content);

      expect(data.initialized).toBe(true);
      expect(data.timestamp).toBeDefined();
    });
  });
});