import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { PassgageAPIClient } from '../api/client.js';
import { ToolRegistry } from '../tools/index.js';
import { ResourceRegistry } from '../resources/index.js';
import { PromptRegistry } from '../prompts/index.js';
import { HttpTransport, HttpRequest, HttpResponse } from '../transports/http.js';
import { SessionManager } from '../utils/session.js';
import { logger } from '../config/logger.js';

// Cloudflare Workers Environment Interface
export interface CloudflareEnv {
  // Bindings
  PASSGAGE_SESSIONS: KVNamespace; // KV store for session persistence
  
  // Environment Variables
  PASSGAGE_BASE_URL?: string;
  PASSGAGE_TIMEOUT?: string;
  PASSGAGE_DEBUG?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
  SESSION_TIMEOUT_HOURS?: string;
  ENCRYPTION_KEY?: string;
}

// Global MCP Server instance (reused across requests for performance)
let mcpServerInstance: GlobalMCPServer | null = null;

/**
 * Global MCP Server for Cloudflare Workers deployment
 * Handles multiple users with session-based authentication
 */
class GlobalMCPServer {
  private server: Server;
  private httpTransport: HttpTransport;
  private sessionManager: SessionManager;
  private toolRegistry: ToolRegistry;
  private resourceRegistry: ResourceRegistry;
  private promptRegistry: PromptRegistry;

  constructor(env: CloudflareEnv) {
    // Initialize session manager with Cloudflare KV
    this.sessionManager = new SessionManager({
      sessionTimeout: parseInt(env.SESSION_TIMEOUT_HOURS || '8') * 60 * 60 * 1000,
      persistSessions: true,
      encryptionKey: env.ENCRYPTION_KEY,
      kvStore: {
        type: 'cloudflare',
        namespace: 'PASSGAGE_SESSIONS'
      }
    });

    // Make KV store globally available for session manager
    (globalThis as any).PASSGAGE_SESSIONS = env.PASSGAGE_SESSIONS;

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'passgage-global-mcp-server',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        },
      }
    );

    // Initialize HTTP transport with session support
    this.httpTransport = new HttpTransport({
      type: 'cloudflare',
      cors: true,
      auth: { type: 'session' },
      sessionManager: this.sessionManager,
      rateLimit: {
        windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '60000'),
        maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '100')
      }
    });

    // Initialize API client (will be per-session in actual usage)
    const apiClient = new PassgageAPIClient({
      baseURL: env.PASSGAGE_BASE_URL || 'https://api.passgage.com',
      timeout: parseInt(env.PASSGAGE_TIMEOUT || '30000'),
      debug: env.PASSGAGE_DEBUG === 'true'
    });

    // Initialize registries
    this.toolRegistry = new ToolRegistry(this.server, apiClient);
    this.resourceRegistry = new ResourceRegistry(this.server, apiClient);
    this.promptRegistry = new PromptRegistry(this.server, apiClient);

    logger.info('Global MCP Server initialized for Cloudflare Workers');
  }

  /**
   * Initialize all registries
   */
  async initialize(): Promise<void> {
    try {
      await this.toolRegistry.registerAll();
      await this.resourceRegistry.registerAll();
      await this.promptRegistry.registerAll();
      
      logger.info('All registries initialized', {
        tools: this.toolRegistry.getToolCount(),
        resources: this.resourceRegistry.getResourceCount(),
        prompts: this.promptRegistry.getPromptCount()
      });
    } catch (error) {
      logger.error('Failed to initialize registries:', error);
      throw error;
    }
  }

  /**
   * Handle HTTP request with session-aware processing
   */
  async handleRequest(request: Request): Promise<Response> {
    try {
      // Convert Cloudflare Request to HttpRequest
      const httpRequest: HttpRequest = {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body: request.method === 'POST' ? await request.text() : undefined
      };

      // Process through HTTP transport
      const httpResponse: HttpResponse = await this.httpTransport.handleRequest(httpRequest);

      // Convert HttpResponse to Cloudflare Response
      return new Response(httpResponse.body, {
        status: httpResponse.status,
        headers: httpResponse.headers
      });

    } catch (error: any) {
      logger.error('Request processing failed:', error);
      
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: { error: error.message }
        },
        id: null
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      uptime: process.uptime?.() || 0,
      activeSessions: this.sessionManager.getActiveSessionsCount(),
      registeredTools: this.toolRegistry.getToolCount(),
      registeredResources: this.resourceRegistry.getResourceCount(),
      registeredPrompts: this.promptRegistry.getPromptCount(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Main Cloudflare Workers fetch handler
 */
export default {
  async fetch(request: Request, env: CloudflareEnv, _ctx: ExecutionContext): Promise<Response> {
    try {
      // Initialize server instance if not exists
      if (!mcpServerInstance) {
        mcpServerInstance = new GlobalMCPServer(env);
        await mcpServerInstance.initialize();
      }

      // Handle different routes
      const url = new URL(request.url);
      
      switch (url.pathname) {
        case '/':
        case '/mcp':
          // Main MCP endpoint
          return await mcpServerInstance.handleRequest(request);
          
        case '/health':
          // Health check endpoint
          const stats = mcpServerInstance.getStats();
          return new Response(JSON.stringify({
            status: 'healthy',
            ...stats
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });

        case '/stats':
          // Statistics endpoint
          const serverStats = mcpServerInstance.getStats();
          return new Response(JSON.stringify(serverStats), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });

        default:
          // 404 for unknown routes
          return new Response(JSON.stringify({
            error: 'Not Found',
            message: 'Available endpoints: /, /mcp, /health, /stats'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
      }

    } catch (error: any) {
      logger.error('Worker fetch handler error:', error);
      
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  },

  /**
   * Scheduled handler for cleanup tasks
   */
  async scheduled(_event: ScheduledEvent, env: CloudflareEnv, _ctx: ExecutionContext): Promise<void> {
    try {
      // Initialize server if needed
      if (!mcpServerInstance) {
        mcpServerInstance = new GlobalMCPServer(env);
        await mcpServerInstance.initialize();
      }

      // Cleanup expired sessions (handled by SessionManager internally)
      logger.info('Scheduled cleanup task completed');
      
    } catch (error) {
      logger.error('Scheduled cleanup task failed:', error);
    }
  }
};

// Export types for use in other files
export { GlobalMCPServer };