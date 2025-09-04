#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { effectiveEnv } from './config/env.js';
import { createTransport } from './transports/index.js';
import { ToolRegistry } from './tools/index.js';
import { ResourceRegistry } from './resources/index.js';
import { PromptRegistry } from './prompts/index.js';
import { PassgageAPIClient } from './api/client.js';
import { SessionManager } from './utils/session.js';
import { logger } from './config/logger.js';

async function bootstrap() {
  try {
    const deploymentMode = effectiveEnv.deploymentMode;
    logger.info(`Starting Passgage MCP Server in ${deploymentMode} mode...`, {
      deploymentMode,
      transport: effectiveEnv.TRANSPORT_TYPE,
      security: effectiveEnv.MCP_SECURITY_ENABLED,
      sessionStorage: effectiveEnv.MCP_GLOBAL_SESSION_STORAGE
    });
    
    // Initialize session manager for global mode
    let sessionManager: SessionManager | undefined;
    if (deploymentMode === 'global') {
      sessionManager = new SessionManager({
        sessionTimeout: effectiveEnv.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000,
        persistSessions: effectiveEnv.MCP_GLOBAL_SESSION_STORAGE !== 'memory',
        encryptionKey: effectiveEnv.ENCRYPTION_KEY,
        kvStore: effectiveEnv.MCP_GLOBAL_SESSION_STORAGE === 'kv' ? {
          type: 'cloudflare',
          namespace: 'PASSGAGE_SESSIONS'
        } : undefined
      });
      
      logger.info('Session manager initialized for global deployment');
    }
    
    // Initialize API client (for local mode or default for global mode)
    const apiClient = new PassgageAPIClient({
      baseURL: effectiveEnv.PASSGAGE_BASE_URL,
      apiKey: deploymentMode === 'local' ? effectiveEnv.PASSGAGE_API_KEY : undefined,
      timeout: effectiveEnv.PASSGAGE_TIMEOUT,
      debug: effectiveEnv.PASSGAGE_DEBUG
    });

    // Auto-login for local mode
    if (deploymentMode === 'local' && effectiveEnv.PASSGAGE_USER_EMAIL && effectiveEnv.PASSGAGE_USER_PASSWORD) {
      try {
        logger.info('Attempting auto-login for local mode...');
        const loginResult = await apiClient.login({
          email: effectiveEnv.PASSGAGE_USER_EMAIL,
          password: effectiveEnv.PASSGAGE_USER_PASSWORD
        });
        
        if (loginResult.success) {
          logger.info('Auto-login successful');
        } else {
          logger.warn('Auto-login failed:', loginResult.message);
        }
      } catch (error: any) {
        logger.warn('Auto-login error:', error.message);
      }
    }

    // Initialize MCP server
    const serverName = deploymentMode === 'global' ? 'passgage-global-mcp-server' : 'passgage-mcp-server';
    const server = new Server(
      {
        name: serverName,
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

    // Register tools
    const toolRegistry = new ToolRegistry(server, apiClient);
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

    // Create and connect transport with mode-specific configuration
    const transport = createTransport(effectiveEnv.TRANSPORT_TYPE);
    
    // Configure HTTP transport for global mode
    if (deploymentMode === 'global' && 'sessionManager' in transport) {
      (transport as any).sessionManager = sessionManager;
    }
    
    await server.connect(transport);
    
    logger.info(`${deploymentMode === 'global' ? 'Global' : 'Local'} MCP Server started successfully`, {
      transport: effectiveEnv.TRANSPORT_TYPE,
      port: effectiveEnv.HTTP_PORT,
      tools: toolRegistry.getToolCount(),
      resources: resourceRegistry.getResourceCount(),
      prompts: promptRegistry.getPromptCount()
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down server...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down server...');
      await server.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', { error });
    process.exit(1);
  }
}

// Start the server
bootstrap().catch((error) => {
  logger.error('Unhandled error:', { error });
  process.exit(1);
});