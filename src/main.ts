#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { env } from './config/env.js';
import { createTransport } from './transports/index.js';
import { ToolRegistry } from './tools/index.js';
import { ResourceRegistry } from './resources/index.js';
import { PromptRegistry } from './prompts/index.js';
import { PassgageAPIClient } from './api/client.js';
import { logger } from './config/logger.js';

async function bootstrap() {
  try {
    logger.info('Starting Passgage MCP Server...');
    
    // Initialize API client
    const apiClient = new PassgageAPIClient({
      baseURL: env.PASSGAGE_BASE_URL,
      apiKey: env.PASSGAGE_API_KEY,
      timeout: env.PASSGAGE_TIMEOUT,
      debug: env.PASSGAGE_DEBUG
    });

    // Initialize MCP server
    const server = new Server(
      {
        name: 'passgage-mcp-server',
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
    const promptRegistry = new PromptRegistry(server);
    await promptRegistry.registerAll();
    logger.info(`Registered ${promptRegistry.getPromptCount()} prompts`);

    // Create and connect transport
    const transport = createTransport(env.TRANSPORT_TYPE);
    await server.connect(transport);
    
    logger.info('MCP Server started successfully');

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