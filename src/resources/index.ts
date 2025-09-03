import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Resource, ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { PassgageAPIClient } from '../api/client.js';
import { logger } from '../config/logger.js';

export interface ResourceMetadata {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export abstract class BaseResource {
  protected apiClient?: PassgageAPIClient;
  
  constructor(apiClient?: PassgageAPIClient) {
    this.apiClient = apiClient;
  }
  
  abstract getMetadata(): ResourceMetadata;
  abstract read(): Promise<string>;
  
  toMCPResource(): Resource {
    const metadata = this.getMetadata();
    return {
      uri: metadata.uri,
      name: metadata.name,
      description: metadata.description,
      mimeType: metadata.mimeType
    };
  }
}

export class ResourceRegistry {
  private resources = new Map<string, BaseResource>();
  private server: Server;
  private apiClient: PassgageAPIClient;

  constructor(server: Server, apiClient: PassgageAPIClient) {
    this.server = server;
    this.apiClient = apiClient;
  }

  async registerAll(): Promise<void> {
    logger.info('Starting resource registration...');
    
    // Register built-in resources
    this.registerResource(new HealthResource(this.apiClient));
    this.registerResource(new ConfigResource());
    
    // Setup MCP handlers
    this.setupHandlers();
  }

  registerResource(resource: BaseResource): void {
    const metadata = resource.getMetadata();
    this.resources.set(metadata.uri, resource);
    logger.debug(`Registered resource: ${metadata.uri}`);
  }

  private setupHandlers(): void {
    // List resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources: Resource[] = [];
      
      for (const resource of this.resources.values()) {
        resources.push(resource.toMCPResource());
      }
      
      return { resources };
    });

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      const resource = this.resources.get(uri);
      if (!resource) {
        throw new Error(`Unknown resource: ${uri}`);
      }
      
      try {
        const content = await resource.read();
        
        return {
          contents: [{
            uri,
            mimeType: resource.getMetadata().mimeType || 'text/plain',
            text: content
          }]
        };
      } catch (error: any) {
        logger.error(`Error reading resource ${uri}:`, error);
        throw error;
      }
    });
  }

  getResourceCount(): number {
    return this.resources.size;
  }
}

// Example Health Resource
class HealthResource extends BaseResource {
  getMetadata(): ResourceMetadata {
    return {
      uri: 'passgage://health',
      name: 'Server Health',
      description: 'Current health status of the Passgage MCP server',
      mimeType: 'application/json'
    };
  }

  async read(): Promise<string> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      apiConnected: this.apiClient ? this.apiClient.getAuthMode() !== 'none' : false
    };
    
    return JSON.stringify(health, null, 2);
  }
}

// Example Config Resource
class ConfigResource extends BaseResource {
  getMetadata(): ResourceMetadata {
    return {
      uri: 'passgage://config',
      name: 'Server Configuration',
      description: 'Current configuration of the Passgage MCP server (non-sensitive)',
      mimeType: 'application/json'
    };
  }

  async read(): Promise<string> {
    const config = {
      transport: process.env.TRANSPORT_TYPE || 'stdio',
      apiBaseUrl: process.env.PASSGAGE_BASE_URL,
      debug: process.env.PASSGAGE_DEBUG === 'true',
      nodeEnv: process.env.NODE_ENV || 'production',
      version: '2.0.0'
    };
    
    return JSON.stringify(config, null, 2);
  }
}