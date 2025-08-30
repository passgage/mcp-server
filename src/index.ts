#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { PassgageAPIClient } from './api/client.js';
import { config, validateConfig } from './config/index.js';
import { createAuthTools, handleAuthTool } from './tools/auth.js';
import { createCRUDTools, handleCRUDTool } from './tools/crud.js';
import { createSpecializedTools, handleSpecializedTool } from './tools/specialized.js';

class PassgageMCPServer {
  private server: Server;
  private client: PassgageAPIClient;

  constructor() {
    // Validate configuration
    validateConfig();

    // Initialize Passgage API client
    this.client = new PassgageAPIClient({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      timeout: config.timeout,
      debug: config.debug
    });

    // Initialize MCP server
    this.server = new Server(
      {
        name: 'passgage-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const authTools = createAuthTools(this.client);
      const crudTools = createCRUDTools();
      const specializedTools = createSpecializedTools();
      
      return {
        tools: [...authTools, ...crudTools, ...specializedTools],
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: any;

        // Route to appropriate handler based on tool name
        if (name.startsWith('passgage_login') || name.startsWith('passgage_refresh') || 
            name.startsWith('passgage_logout') || name.startsWith('passgage_auth_status') ||
            name.startsWith('passgage_set_company_mode') || name.startsWith('passgage_switch_to') ||
            name.startsWith('passgage_get_auth_modes')) {
          result = await handleAuthTool(name, args || {}, this.client);
        } else if (name.startsWith('passgage_list_') || name.startsWith('passgage_get_') ||
                   name.startsWith('passgage_create_') || name.startsWith('passgage_update_') ||
                   name.startsWith('passgage_delete_')) {
          result = await handleCRUDTool(name, args || {}, this.client);
        } else if (name.startsWith('passgage_upload_file') || name.startsWith('passgage_approve_') ||
                   name.startsWith('passgage_bulk_') || name.startsWith('passgage_assign_') ||
                   name.startsWith('passgage_track_') || name.startsWith('passgage_search') ||
                   name.startsWith('passgage_export_') || name.startsWith('passgage_get_dashboard_')) {
          result = await handleSpecializedTool(name, args || {}, this.client);
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  public async run(): Promise<void> {
    // Auto-login based on default auth mode and available credentials
    if (config.defaultAuthMode === 'user' && config.userEmail && config.userPassword) {
      try {
        console.error('Attempting auto-login with provided credentials...');
        await this.client.login({
          email: config.userEmail,
          password: config.userPassword
        });
        console.error('Auto-login successful');
      } catch (error: any) {
        console.error('Auto-login failed:', error.message);
        console.error('Continuing with available authentication. Use authentication tools to switch modes.');
      }
    }

    // Report authentication status
    const authContext = this.client.getAuthContext();
    console.error(`Passgage MCP Server starting in ${authContext.mode} mode`);
    if (authContext.mode === 'company') {
      console.error('Company mode: Full admin access to all company data');
    } else if (authContext.mode === 'user') {
      console.error(`User mode: Personal access for ${authContext.userInfo?.email}`);
    } else {
      console.error('No authentication mode active. Use authentication tools to login.');
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Passgage MCP Server running on stdio');
  }

  public async shutdown(): Promise<void> {
    this.client.disconnect();
    await this.server.close();
  }
}

// Handle graceful shutdown
const server = new PassgageMCPServer();

process.on('SIGINT', async () => {
  console.error('Received SIGINT, shutting down gracefully...');
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  await server.shutdown();
  process.exit(0);
});

// Start the server
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});