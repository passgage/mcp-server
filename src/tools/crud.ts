import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PassgageAPIClient } from '../api/client.js';
import { PASSGAGE_SERVICES, PassgageService, QueryParams } from '../types/api.js';

export function createCRUDTools(): Tool[] {
  const tools: Tool[] = [];

  // Create tools for each service
  PASSGAGE_SERVICES.forEach(service => {
    // List tool
    tools.push({
      name: `passgage_list_${service}`,
      description: `List ${service} with optional filtering and pagination`,
      inputSchema: {
        type: 'object',
        properties: {
          page: {
            type: 'number',
            description: 'Page number for pagination (default: 1)',
            minimum: 1
          },
          per_page: {
            type: 'number',
            description: 'Number of items per page (max: 50, default: 25)',
            minimum: 1,
            maximum: 50
          },
          filters: {
            type: 'object',
            description: 'Ransack-style filters (e.g., {"name_cont": "test", "is_active_eq": true})',
            additionalProperties: true
          }
        },
        additionalProperties: false
      }
    });

    // Get by ID tool
    tools.push({
      name: `passgage_get_${service.slice(0, -1)}`, // Remove 's' for singular
      description: `Get a specific ${service.slice(0, -1)} by ID`,
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: `The UUID of the ${service.slice(0, -1)} to retrieve`
          }
        },
        required: ['id'],
        additionalProperties: false
      }
    });

    // Create tool
    tools.push({
      name: `passgage_create_${service.slice(0, -1)}`,
      description: `Create a new ${service.slice(0, -1)}`,
      inputSchema: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            description: `The data for creating the ${service.slice(0, -1)}`,
            additionalProperties: true
          }
        },
        required: ['data'],
        additionalProperties: false
      }
    });

    // Update tool
    tools.push({
      name: `passgage_update_${service.slice(0, -1)}`,
      description: `Update an existing ${service.slice(0, -1)}`,
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: `The UUID of the ${service.slice(0, -1)} to update`
          },
          data: {
            type: 'object',
            description: `The data for updating the ${service.slice(0, -1)}`,
            additionalProperties: true
          }
        },
        required: ['id', 'data'],
        additionalProperties: false
      }
    });

    // Delete tool
    tools.push({
      name: `passgage_delete_${service.slice(0, -1)}`,
      description: `Delete a ${service.slice(0, -1)} by ID`,
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: `The UUID of the ${service.slice(0, -1)} to delete`
          }
        },
        required: ['id'],
        additionalProperties: false
      }
    });
  });

  return tools;
}

export async function handleCRUDTool(
  name: string,
  args: any,
  client: PassgageAPIClient
): Promise<any> {
  if (!client.isAuthenticated()) {
    throw new Error('Not authenticated. Please login first or provide an API key.');
  }

  // Parse tool name to extract operation and service
  const parts = name.split('_');
  const operation = parts[1]; // list, get, create, update, delete
  const serviceName = parts.slice(2).join('_'); // remaining parts

  // Map singular to plural service names
  let service: PassgageService;
  if (operation === 'list') {
    service = serviceName as PassgageService;
  } else {
    // Convert singular back to plural for API endpoint
    service = (serviceName + 's') as PassgageService;
  }

  if (!PASSGAGE_SERVICES.includes(service)) {
    throw new Error(`Unknown service: ${service}`);
  }

  const endpoint = `/api/public/v1/${service}`;

  try {
    switch (operation) {
      case 'list': {
        const queryParams: QueryParams = {
          page: args.page || 1,
          per_page: Math.min(args.per_page || 25, 50),
          q: args.filters || {}
        };
        
        const result = await client.get(endpoint, queryParams);
        
        return {
          success: result.success,
          message: result.message,
          data: result.data,
          meta: result.meta,
          count: result.data?.length || 0
        };
      }

      case 'get': {
        const result = await client.getById(endpoint, args.id);
        
        return {
          success: result.success,
          message: result.message,
          data: result.data
        };
      }

      case 'create': {
        const result = await client.post(endpoint, args.data);
        
        return {
          success: result.success,
          message: result.message,
          data: result.data
        };
      }

      case 'update': {
        const result = await client.put(endpoint, args.id, args.data);
        
        return {
          success: result.success,
          message: result.message,
          data: result.data
        };
      }

      case 'delete': {
        const result = await client.delete(endpoint, args.id);
        
        return {
          success: result.success,
          message: result.message,
          data: result.data
        };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      service,
      operation
    };
  }
}