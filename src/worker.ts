/**
 * Cloudflare Workers entry point for the global MCP server
 * Handles HTTP requests with session-aware routing and KV persistence
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// Note: Don't import effectiveEnv in Cloudflare Workers as it relies on process.env
import { ToolRegistry } from './tools/index.js';
import { ResourceRegistry } from './resources/index.js';
import { PromptRegistry } from './prompts/index.js';
import { PassgageAPIClient } from './api/client.js';
import { SessionManager } from './utils/session.js';
import { HttpTransport } from './transports/http.js';
import { logger } from './config/logger.js';

interface CloudflareEnv {
  PASSGAGE_SESSIONS: KVNamespace;
  PASSGAGE_BASE_URL?: string;
  PASSGAGE_TIMEOUT?: string;
  PASSGAGE_DEBUG?: string;
  ENCRYPTION_KEY?: string;
  LOG_LEVEL?: string;
}

interface WorkerContext {
  sessionManager: SessionManager;
  server: Server;
  transport: HttpTransport;
}

let workerContext: WorkerContext | null = null;

/**
 * Initialize the global MCP server context for Cloudflare Workers
 */
async function initializeWorker(env: CloudflareEnv): Promise<WorkerContext> {
  if (workerContext) {
    return workerContext;
  }

  logger.info('Initializing Cloudflare Workers MCP Server...', {
    hasKV: !!env.PASSGAGE_SESSIONS,
    baseURL: env.PASSGAGE_BASE_URL || 'https://api.passgage.com'
  });

  // Initialize session manager with Cloudflare KV
  const sessionManager = new SessionManager({
    sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
    persistSessions: true,
    autoRefresh: true,
    maxRetries: 3,
    encryptionKey: env.ENCRYPTION_KEY,
    kvStore: {
      type: 'cloudflare',
      namespace: 'PASSGAGE_SESSIONS'
    }
  }, env); // Pass the Cloudflare environment object

  // Initialize API client for default configuration
  const apiClient = new PassgageAPIClient({
    baseURL: env.PASSGAGE_BASE_URL || 'https://api.passgage.com',
    timeout: env.PASSGAGE_TIMEOUT ? parseInt(env.PASSGAGE_TIMEOUT) : 30000,
    debug: env.PASSGAGE_DEBUG === 'true' || false
  });

  // Initialize MCP server
  const server = new Server(
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

  // Register tools with session manager
  const toolRegistry = new ToolRegistry(server, apiClient, sessionManager);
  await toolRegistry.registerAll();
  logger.info(`Registered ${toolRegistry.getToolCount()} tools`);

  // Register resources
  const resourceRegistry = new ResourceRegistry(server, apiClient);
  await resourceRegistry.registerAll();
  logger.info(`Registered ${resourceRegistry.getResourceCount()} resources`);

  // Register prompts
  const promptRegistry = new PromptRegistry(server, apiClient);
  await promptRegistry.registerAll();
  logger.info(`Registered ${promptRegistry.getPromptCount()} prompts`);

  // Create HTTP transport for Workers
  const transport = new HttpTransport({
    type: 'cloudflare',
    cors: true,
    auth: { type: 'session' },
    sessionManager,
    rateLimit: {
      windowMs: 60000, // 1 minute
      maxRequests: 100
    }
  });

  // Connect server to transport
  await server.connect(transport);
  
  // Set up direct tool registry connection in HTTP transport
  transport.setToolRegistry(toolRegistry);

  workerContext = {
    sessionManager,
    server,
    transport
  };

  logger.info('Cloudflare Workers MCP Server initialized successfully', {
    tools: toolRegistry.getToolCount(),
    resources: resourceRegistry.getResourceCount(),
    prompts: promptRegistry.getPromptCount(),
    sessionStorage: 'cloudflare-kv'
  });

  return workerContext;
}

/**
 * Main Cloudflare Workers fetch handler
 */
export default {
  async fetch(request: Request, env: CloudflareEnv, _ctx: ExecutionContext): Promise<Response> {
    try {
      // Initialize worker context
      const context = await initializeWorker(env);
      
      // Parse JSON-RPC request
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: 405, message: 'Method not allowed' },
          id: null
        }), {
          status: 405,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const body = await request.text();
      
      try {
        JSON.parse(body);
      } catch {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Parse error' },
          id: null
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Handle request through server transport layer
      const transport = context.transport;
      const httpRequest = {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body
      };

      const httpResponse = await transport.handleRequest(httpRequest);
      
      return new Response(httpResponse.body, {
        status: httpResponse.status,
        headers: httpResponse.headers
      });

    } catch (error: any) {
      logger.error('Worker request error:', { error: error.message });
      
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: 500,
          message: 'Internal server error',
          data: { timestamp: new Date().toISOString() }
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
  },

  /**
   * Cron trigger for cleanup tasks
   */
  async scheduled(_controller: ScheduledController, env: CloudflareEnv, _ctx: ExecutionContext): Promise<void> {
    try {
      // Initialize worker context (mainly for logging)
      await initializeWorker(env);
      
      // Cleanup expired sessions (this is handled automatically by SessionManager)
      logger.info('Cron job triggered for session cleanup');
      
      // The SessionManager cleanup is handled by KV expiration, but we could add
      // additional cleanup logic here if needed
      
    } catch (error: any) {
      logger.error('Cron job error:', { error: error.message });
    }
  }
};

// Export types for external use
export type { CloudflareEnv, WorkerContext };