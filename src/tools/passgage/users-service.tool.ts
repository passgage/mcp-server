import { z } from 'zod';
import { BaseTool } from '../base.tool.js';
import { ToolMetadata } from '../index.js';
import { PassgageAPIClient } from '../../api/client.js';
import { paginatedResponse, successResponse } from '../../utils/response.js';
import { validateRansackQuery } from '../../utils/validation.js';

// === SCHEMAS ===

const listUsersSchema = z.object({
  page: z.number().int().positive().optional().default(1).describe('Page number'),
  per_page: z.number().int().min(1).max(50).optional().default(25).describe('Items per page'),
  q: z.record(z.any()).optional().describe('Ransack query filters'),
  sort: z.string().optional().describe('Sort field and direction (e.g., "created_at desc")')
});

const getUserSchema = z.object({
  id: z.string().uuid().describe('User UUID')
});

const createUserSchema = z.object({
  email: z.string().email().describe('User email address'),
  first_name: z.string().min(1).describe('First name'),
  last_name: z.string().min(1).describe('Last name'),
  password: z.string().min(6).optional().describe('Initial password (optional)'),
  phone: z.string().optional().describe('Phone number'),
  gsm: z.string().optional().describe('Mobile phone number'),
  employee_id: z.string().optional().describe('Employee ID'),
  department_id: z.string().uuid().optional().describe('Department UUID'),
  branch_id: z.string().uuid().optional().describe('Branch UUID'),
  job_position_id: z.string().uuid().optional().describe('Job position UUID'),
  is_active: z.boolean().optional().default(true).describe('User active status'),
  hire_date: z.string().optional().describe('Hire date (YYYY-MM-DD)'),
  birth_date: z.string().optional().describe('Birth date (YYYY-MM-DD)'),
  gender: z.enum(['male', 'female', 'other']).optional().describe('Gender'),
  address: z.string().optional().describe('Address'),
  notes: z.string().optional().describe('Notes')
});

const updateUserSchema = z.object({
  id: z.string().uuid().describe('User UUID'),
  email: z.string().email().optional().describe('User email address'),
  first_name: z.string().min(1).optional().describe('First name'),
  last_name: z.string().min(1).optional().describe('Last name'),
  phone: z.string().optional().describe('Phone number'),
  gsm: z.string().optional().describe('Mobile phone number'),
  employee_id: z.string().optional().describe('Employee ID'),
  department_id: z.string().uuid().optional().describe('Department UUID'),
  branch_id: z.string().uuid().optional().describe('Branch UUID'),
  job_position_id: z.string().uuid().optional().describe('Job position UUID'),
  is_active: z.boolean().optional().describe('User active status'),
  hire_date: z.string().optional().describe('Hire date (YYYY-MM-DD)'),
  birth_date: z.string().optional().describe('Birth date (YYYY-MM-DD)'),
  gender: z.enum(['male', 'female', 'other']).optional().describe('Gender'),
  address: z.string().optional().describe('Address'),
  notes: z.string().optional().describe('Notes')
});

const deleteUserSchema = z.object({
  id: z.string().uuid().describe('User UUID')
});

const assignDevicesSchema = z.object({
  user_id: z.string().uuid().describe('User UUID'),
  device_ids: z.array(z.string().uuid()).describe('Array of device UUIDs to assign')
});

const assignZonesSchema = z.object({
  user_id: z.string().uuid().describe('User UUID'), 
  zone_ids: z.array(z.string().uuid()).describe('Array of access zone UUIDs to assign')
});

// === TOOLS ===

export class ListUsersTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_list_users',
      description: 'List users with advanced filtering, pagination, and sorting',
      category: 'users',
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

      const response = await this.apiClient.get('/api/public/v1/users', params);
      
      if (response.success) {
        return paginatedResponse(
          response.data,
          validated.page,
          validated.per_page,
          response.meta?.total_count || response.data.length,
          'Users retrieved successfully'
        );
      } else {
        return this.errorResponse('Failed to retrieve users', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to list users', error.message);
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
            description: 'Ransack query filters (e.g., {"name_cont": "john", "is_active_eq": true})',
            additionalProperties: true
          },
          sort: {
            type: 'string',
            description: 'Sort field and direction (e.g., "created_at desc", "first_name asc")'
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
      description: 'Get a specific user by ID with full details',
      category: 'users',
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
      const response = await this.apiClient.getById('/api/public/v1/users', validated.id);
      
      if (response.success) {
        return successResponse(response.data, 'User retrieved successfully');
      } else {
        return this.errorResponse('User not found', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to get user', error.message);
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
            type: 'string',
            format: 'uuid',
            description: 'User UUID'
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
      description: 'Create a new user with detailed information',
      category: 'users',
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
      const response = await this.apiClient.post('/api/public/v1/users', validated);
      
      if (response.success) {
        return successResponse(response.data, 'User created successfully');
      } else {
        return this.errorResponse('Failed to create user', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to create user', error.message);
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
          password: {
            type: 'string',
            description: 'Initial password (optional)',
            minLength: 6
          },
          phone: {
            type: 'string',
            description: 'Phone number'
          },
          gsm: {
            type: 'string',
            description: 'Mobile phone number'
          },
          employee_id: {
            type: 'string',
            description: 'Employee ID'
          },
          department_id: {
            type: 'string',
            format: 'uuid',
            description: 'Department UUID'
          },
          branch_id: {
            type: 'string',
            format: 'uuid',
            description: 'Branch UUID'
          },
          job_position_id: {
            type: 'string',
            format: 'uuid',
            description: 'Job position UUID'
          },
          is_active: {
            type: 'boolean',
            description: 'User active status',
            default: true
          },
          hire_date: {
            type: 'string',
            description: 'Hire date (YYYY-MM-DD)'
          },
          birth_date: {
            type: 'string',
            description: 'Birth date (YYYY-MM-DD)'
          },
          gender: {
            type: 'string',
            enum: ['male', 'female', 'other'],
            description: 'Gender'
          },
          address: {
            type: 'string',
            description: 'Address'
          },
          notes: {
            type: 'string',
            description: 'Notes'
          }
        },
        required: ['email', 'first_name', 'last_name']
      }
    };
  }
}

export class UpdateUserTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_update_user',
      description: 'Update an existing user',
      category: 'users',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return updateUserSchema;
  }

  async execute(args: z.infer<typeof updateUserSchema>): Promise<any> {
    const validated = updateUserSchema.parse(args);
    const { id, ...updateData } = validated;
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.put('/api/public/v1/users', id, updateData);
      
      if (response.success) {
        return successResponse(response.data, 'User updated successfully');
      } else {
        return this.errorResponse('Failed to update user', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to update user', error.message);
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
            type: 'string',
            format: 'uuid',
            description: 'User UUID'
          },
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
          phone: {
            type: 'string',
            description: 'Phone number'
          },
          gsm: {
            type: 'string',
            description: 'Mobile phone number'
          },
          employee_id: {
            type: 'string',
            description: 'Employee ID'
          },
          department_id: {
            type: 'string',
            format: 'uuid',
            description: 'Department UUID'
          },
          branch_id: {
            type: 'string',
            format: 'uuid',
            description: 'Branch UUID'
          },
          job_position_id: {
            type: 'string',
            format: 'uuid',
            description: 'Job position UUID'
          },
          is_active: {
            type: 'boolean',
            description: 'User active status'
          },
          hire_date: {
            type: 'string',
            description: 'Hire date (YYYY-MM-DD)'
          },
          birth_date: {
            type: 'string',
            description: 'Birth date (YYYY-MM-DD)'
          },
          gender: {
            type: 'string',
            enum: ['male', 'female', 'other'],
            description: 'Gender'
          },
          address: {
            type: 'string',
            description: 'Address'
          },
          notes: {
            type: 'string',
            description: 'Notes'
          }
        },
        required: ['id']
      }
    };
  }
}

export class DeleteUserTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_delete_user',
      description: 'Delete a user by ID',
      category: 'users',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return deleteUserSchema;
  }

  async execute(args: z.infer<typeof deleteUserSchema>): Promise<any> {
    const validated = deleteUserSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.delete('/api/public/v1/users', validated.id);
      
      if (response.success) {
        return successResponse({ deleted: true, id: validated.id }, 'User deleted successfully');
      } else {
        return this.errorResponse('Failed to delete user', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to delete user', error.message);
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
            type: 'string',
            format: 'uuid',
            description: 'User UUID'
          }
        },
        required: ['id']
      }
    };
  }
}

export class AssignDevicesToUserTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_assign_devices_to_user',
      description: 'Assign devices to a user',
      category: 'users',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return assignDevicesSchema;
  }

  async execute(args: z.infer<typeof assignDevicesSchema>): Promise<any> {
    const validated = assignDevicesSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.post(
        `/api/public/v1/users/${validated.user_id}/assign_devices`,
        { device_ids: validated.device_ids }
      );
      
      if (response.success) {
        return successResponse(response.data, 'Devices assigned successfully');
      } else {
        return this.errorResponse('Failed to assign devices', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to assign devices', error.message);
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
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'User UUID'
          },
          device_ids: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid'
            },
            description: 'Array of device UUIDs to assign'
          }
        },
        required: ['user_id', 'device_ids']
      }
    };
  }
}

export class AssignZonesToUserTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_assign_zones_to_user',
      description: 'Assign access zones to a user',
      category: 'users',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return assignZonesSchema;
  }

  async execute(args: z.infer<typeof assignZonesSchema>): Promise<any> {
    const validated = assignZonesSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.post(
        `/api/public/v1/users/${validated.user_id}/assign_zones`,
        { zone_ids: validated.zone_ids }
      );
      
      if (response.success) {
        return successResponse(response.data, 'Access zones assigned successfully');
      } else {
        return this.errorResponse('Failed to assign zones', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to assign zones', error.message);
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
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'User UUID'
          },
          zone_ids: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid'
            },
            description: 'Array of access zone UUIDs to assign'
          }
        },
        required: ['user_id', 'zone_ids']
      }
    };
  }
}