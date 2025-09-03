import { z } from 'zod';
import { BaseTool } from '../base.tool.js';
import { ToolMetadata } from '../index.js';
import { PassgageAPIClient } from '../../api/client.js';
import { paginatedResponse } from '../../utils/response.js';
import { validateRansackQuery } from '../../utils/validation.js';

const listUsersSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  per_page: z.number().int().min(1).max(50).optional().default(25),
  q: z.record(z.any()).optional().describe('Ransack query parameters'),
  sort: z.string().optional().describe('Sort field and direction (e.g., "created_at desc")')
});

const getUserSchema = z.object({
  id: z.union([z.string(), z.number()]).describe('User ID')
});

const createUserSchema = z.object({
  email: z.string().email().describe('User email address'),
  first_name: z.string().min(1).describe('First name'),
  last_name: z.string().min(1).describe('Last name'),
  employee_id: z.string().optional().describe('Employee ID'),
  department_id: z.number().optional().describe('Department ID'),
  branch_id: z.number().optional().describe('Branch ID'),
  job_position_id: z.number().optional().describe('Job position ID'),
  phone_number: z.string().optional().describe('Phone number'),
  is_active: z.boolean().optional().default(true).describe('Whether user is active')
});

export class ListUsersTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_list_users',
      description: 'List all users with optional filtering and pagination',
      category: 'crud',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return listUsersSchema;
  }

  async execute(args: z.infer<typeof listUsersSchema>): Promise<any> {
    const validated = listUsersSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const params: any = {
        page: validated.page,
        per_page: validated.per_page
      };

      if (validated.q) {
        params.q = validateRansackQuery(validated.q);
      }

      if (validated.sort) {
        params.sort = validated.sort;
      }

      // TODO: Implement actual API call
      // const response = await this.apiClient.get('/api/public/v1/users', params);
      const response = { data: [], total: 0 };
      
      return paginatedResponse(
        response.data,
        validated.page,
        validated.per_page,
        response.total || response.data.length,
        'Users retrieved successfully'
      );
    } catch (error: any) {
      return this.errorResponse(error.message || 'Failed to list users', error);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          page: {
            type: 'number',
            description: 'Page number (default: 1)',
            minimum: 1
          },
          per_page: {
            type: 'number',
            description: 'Items per page (default: 25, max: 50)',
            minimum: 1,
            maximum: 50
          },
          q: {
            type: 'object',
            description: 'Ransack query parameters for filtering',
            additionalProperties: true
          },
          sort: {
            type: 'string',
            description: 'Sort field and direction (e.g., "created_at desc")'
          }
        }
      }
    };
  }
}

export class GetUserTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_get_user',
      description: 'Get a specific user by ID',
      category: 'crud',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return getUserSchema;
  }

  async execute(args: z.infer<typeof getUserSchema>): Promise<any> {
    const validated = getUserSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      // TODO: Implement actual API call
      // const response = await this.apiClient.get(`/api/public/v1/users/${validated.id}`);
      const response = { id: validated.id, email: 'user@example.com' };
      return this.successResponse(response, 'User retrieved successfully');
    } catch (error: any) {
      return this.errorResponse(error.message || 'Failed to get user', error);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          id: {
            type: ['string', 'number'],
            description: 'User ID'
          }
        },
        required: ['id']
      }
    };
  }
}

export class CreateUserTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_create_user',
      description: 'Create a new user',
      category: 'crud',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return createUserSchema;
  }

  async execute(args: z.infer<typeof createUserSchema>): Promise<any> {
    const validated = createUserSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      // TODO: Implement actual API call
      // const response = await this.apiClient.post('/api/public/v1/users', validated);
      const response = { id: 1, ...validated };
      return this.successResponse(response, 'User created successfully');
    } catch (error: any) {
      return this.errorResponse(error.message || 'Failed to create user', error);
    }
  }

  toMCPTool() {
    const metadata = this.getMetadata();
    
    return {
      name: metadata.name,
      description: metadata.description,
      inputSchema: {
        type: 'object' as const,
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          first_name: {
            type: 'string',
            description: 'First name',
            minLength: 1
          },
          last_name: {
            type: 'string',
            description: 'Last name',
            minLength: 1
          },
          employee_id: {
            type: 'string',
            description: 'Employee ID'
          },
          department_id: {
            type: 'number',
            description: 'Department ID'
          },
          branch_id: {
            type: 'number',
            description: 'Branch ID'
          },
          job_position_id: {
            type: 'number',
            description: 'Job position ID'
          },
          phone_number: {
            type: 'string',
            description: 'Phone number'
          },
          is_active: {
            type: 'boolean',
            description: 'Whether user is active',
            default: true
          }
        },
        required: ['email', 'first_name', 'last_name']
      }
    };
  }
}