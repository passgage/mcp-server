import { z } from 'zod';
import { BaseTool } from '../base.tool.js';
import { ToolMetadata } from '../index.js';
import { PassgageAPIClient } from '../../api/client.js';

const listUserShiftsSchema = z.object({
  page: z.number().int().positive().optional().default(1).describe('Page number'),
  per_page: z.number().int().positive().max(50).optional().default(25).describe('Items per page (max 50)'),
  q: z.record(z.any()).optional().describe('Ransack query filters for advanced searching')
});

const getUserShiftSchema = z.object({
  user_shift_id: z.string().uuid().describe('User shift ID to retrieve')
});

const createUserShiftSchema = z.object({
  user_id: z.string().uuid().describe('User ID to assign shift'),
  shift_id: z.string().uuid().describe('Shift ID to assign'),
  start_date: z.string().describe('Start date for the user shift (YYYY-MM-DD)'),
  end_date: z.string().optional().describe('End date for the user shift (YYYY-MM-DD, optional for ongoing shifts)'),
  is_active: z.boolean().optional().default(true).describe('Whether the user shift is active'),
  notes: z.string().optional().describe('Additional notes for the assignment')
});

const updateUserShiftSchema = z.object({
  user_shift_id: z.string().uuid().describe('User shift ID to update'),
  user_id: z.string().uuid().optional().describe('User ID to assign shift'),
  shift_id: z.string().uuid().optional().describe('Shift ID to assign'),
  start_date: z.string().optional().describe('Start date for the user shift (YYYY-MM-DD)'),
  end_date: z.string().optional().describe('End date for the user shift (YYYY-MM-DD)'),
  is_active: z.boolean().optional().describe('Whether the user shift is active'),
  notes: z.string().optional().describe('Additional notes for the assignment')
});

const deleteUserShiftSchema = z.object({
  user_shift_id: z.string().uuid().describe('User shift ID to delete')
});

const assignShiftToUsersSchema = z.object({
  shift_id: z.string().uuid().describe('Shift ID to assign'),
  user_ids: z.array(z.string().uuid()).min(1).describe('Array of user IDs to assign the shift'),
  start_date: z.string().describe('Start date for all assignments (YYYY-MM-DD)'),
  end_date: z.string().optional().describe('End date for all assignments (YYYY-MM-DD, optional)'),
  notes: z.string().optional().describe('Notes for all assignments')
});

const getUserShiftConflictsSchema = z.object({
  user_id: z.string().uuid().describe('User ID to check for conflicts'),
  shift_id: z.string().uuid().describe('Proposed shift ID'),
  start_date: z.string().describe('Proposed start date (YYYY-MM-DD)'),
  end_date: z.string().optional().describe('Proposed end date (YYYY-MM-DD)')
});

export class ListUserShiftsTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_list_user_shifts',
      description: 'List user shift assignments with advanced filtering and pagination',
      category: 'user-shifts',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return listUserShiftsSchema;
  }

  async execute(args: z.infer<typeof listUserShiftsSchema>): Promise<any> {
    const validated = listUserShiftsSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const params: any = {
        page: validated.page,
        per_page: validated.per_page
      };

      if (validated.q) {
        params.q = validated.q;
      }

      const response = await this.apiClient.get('/api/public/v1/user_shifts', params);

      if (response.success && response.data) {
        const userShifts = Array.isArray(response.data) ? response.data : [];
        return this.successResponse({
          user_shifts: userShifts.map(us => ({
            id: us.id,
            user_id: us.user_id,
            user_name: us.user?.name,
            shift_id: us.shift_id,
            shift_name: us.shift?.name,
            shift_code: us.shift?.code,
            start_date: us.start_date,
            end_date: us.end_date,
            is_active: us.is_active,
            notes: us.notes,
            created_at: us.created_at,
            updated_at: us.updated_at
          })),
          pagination: {
            current_page: validated.page,
            per_page: validated.per_page,
            total_count: userShifts.length
          }
        }, `Found ${userShifts.length} user shift assignments`);
      } else {
        return this.errorResponse('Failed to fetch user shifts', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('List user shifts failed', error.message);
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
          page: { type: 'integer', minimum: 1, default: 1, description: 'Page number' },
          per_page: { type: 'integer', minimum: 1, maximum: 50, default: 25, description: 'Items per page (max 50)' },
          q: { type: 'object', description: 'Ransack query filters for advanced searching', additionalProperties: true }
        }
      }
    };
  }
}

export class GetUserShiftTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_get_user_shift',
      description: 'Get detailed information about a specific user shift assignment',
      category: 'user-shifts',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return getUserShiftSchema;
  }

  async execute(args: z.infer<typeof getUserShiftSchema>): Promise<any> {
    const validated = getUserShiftSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.getById('/api/public/v1/user_shifts', validated.user_shift_id);

      if (response.success && response.data) {
        const us = response.data;
        return this.successResponse({
          user_shift: {
            id: us.id,
            user_id: us.user_id,
            user: us.user ? {
              id: us.user.id,
              name: us.user.name,
              email: us.user.email,
              employee_number: us.user.employee_number
            } : null,
            shift_id: us.shift_id,
            shift: us.shift ? {
              id: us.shift.id,
              name: us.shift.name,
              code: us.shift.code,
              start_time: us.shift.start_time,
              end_time: us.shift.end_time,
              duration: us.shift.duration,
              break_duration: us.shift.break_duration
            } : null,
            start_date: us.start_date,
            end_date: us.end_date,
            is_active: us.is_active,
            notes: us.notes,
            created_at: us.created_at,
            updated_at: us.updated_at,
            created_by: us.created_by,
            updated_by: us.updated_by
          }
        }, 'User shift retrieved successfully');
      } else {
        return this.errorResponse('User shift not found', response.message || 'User shift does not exist');
      }
    } catch (error: any) {
      return this.errorResponse('Get user shift failed', error.message);
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
          user_shift_id: { type: 'string', format: 'uuid', description: 'User shift ID to retrieve' }
        },
        required: ['user_shift_id']
      }
    };
  }
}

export class CreateUserShiftTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_create_user_shift',
      description: 'Create a new user shift assignment',
      category: 'user-shifts',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return createUserShiftSchema;
  }

  async execute(args: z.infer<typeof createUserShiftSchema>): Promise<any> {
    const validated = createUserShiftSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const userShiftData = {
        user_id: validated.user_id,
        shift_id: validated.shift_id,
        start_date: validated.start_date,
        end_date: validated.end_date,
        is_active: validated.is_active,
        notes: validated.notes
      };

      const response = await this.apiClient.post('/api/public/v1/user_shifts', userShiftData);

      if (response.success && response.data) {
        return this.successResponse({
          user_shift: {
            id: response.data.id,
            user_id: response.data.user_id,
            shift_id: response.data.shift_id,
            start_date: response.data.start_date,
            end_date: response.data.end_date,
            is_active: response.data.is_active,
            notes: response.data.notes,
            created_at: response.data.created_at
          }
        }, 'User shift created successfully');
      } else {
        return this.errorResponse('Failed to create user shift', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Create user shift failed', error.message);
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
          user_id: { type: 'string', format: 'uuid', description: 'User ID to assign shift' },
          shift_id: { type: 'string', format: 'uuid', description: 'Shift ID to assign' },
          start_date: { type: 'string', description: 'Start date for the user shift (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'End date for the user shift (YYYY-MM-DD, optional for ongoing shifts)' },
          is_active: { type: 'boolean', default: true, description: 'Whether the user shift is active' },
          notes: { type: 'string', description: 'Additional notes for the assignment' }
        },
        required: ['user_id', 'shift_id', 'start_date']
      }
    };
  }
}

export class UpdateUserShiftTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_update_user_shift',
      description: 'Update an existing user shift assignment',
      category: 'user-shifts',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return updateUserShiftSchema;
  }

  async execute(args: z.infer<typeof updateUserShiftSchema>): Promise<any> {
    const validated = updateUserShiftSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const updateData: any = {};
      if (validated.user_id !== undefined) updateData.user_id = validated.user_id;
      if (validated.shift_id !== undefined) updateData.shift_id = validated.shift_id;
      if (validated.start_date !== undefined) updateData.start_date = validated.start_date;
      if (validated.end_date !== undefined) updateData.end_date = validated.end_date;
      if (validated.is_active !== undefined) updateData.is_active = validated.is_active;
      if (validated.notes !== undefined) updateData.notes = validated.notes;

      const response = await this.apiClient.put('/api/public/v1/user_shifts', validated.user_shift_id, updateData);

      if (response.success && response.data) {
        return this.successResponse({
          user_shift: {
            id: response.data.id,
            user_id: response.data.user_id,
            shift_id: response.data.shift_id,
            start_date: response.data.start_date,
            end_date: response.data.end_date,
            is_active: response.data.is_active,
            notes: response.data.notes,
            updated_at: response.data.updated_at
          }
        }, 'User shift updated successfully');
      } else {
        return this.errorResponse('Failed to update user shift', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Update user shift failed', error.message);
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
          user_shift_id: { type: 'string', format: 'uuid', description: 'User shift ID to update' },
          user_id: { type: 'string', format: 'uuid', description: 'User ID to assign shift' },
          shift_id: { type: 'string', format: 'uuid', description: 'Shift ID to assign' },
          start_date: { type: 'string', description: 'Start date for the user shift (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'End date for the user shift (YYYY-MM-DD)' },
          is_active: { type: 'boolean', description: 'Whether the user shift is active' },
          notes: { type: 'string', description: 'Additional notes for the assignment' }
        },
        required: ['user_shift_id']
      }
    };
  }
}

export class DeleteUserShiftTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_delete_user_shift',
      description: 'Delete a user shift assignment',
      category: 'user-shifts',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return deleteUserShiftSchema;
  }

  async execute(args: z.infer<typeof deleteUserShiftSchema>): Promise<any> {
    const validated = deleteUserShiftSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.delete('/api/public/v1/user_shifts', validated.user_shift_id);

      if (response.success) {
        return this.successResponse({
          deleted: true,
          user_shift_id: validated.user_shift_id
        }, 'User shift deleted successfully');
      } else {
        return this.errorResponse('Failed to delete user shift', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Delete user shift failed', error.message);
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
          user_shift_id: { type: 'string', format: 'uuid', description: 'User shift ID to delete' }
        },
        required: ['user_shift_id']
      }
    };
  }
}

export class AssignShiftToUsersTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_assign_shift_to_users',
      description: 'Bulk assign a shift to multiple users at once',
      category: 'user-shifts',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return assignShiftToUsersSchema;
  }

  async execute(args: z.infer<typeof assignShiftToUsersSchema>): Promise<any> {
    const validated = assignShiftToUsersSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const bulkData = {
        shift_id: validated.shift_id,
        user_ids: validated.user_ids,
        start_date: validated.start_date,
        end_date: validated.end_date,
        notes: validated.notes
      };

      const response = await this.apiClient.post('/api/public/v1/user_shifts/bulk_assign', bulkData);

      if (response.success && response.data) {
        const assignments = Array.isArray(response.data.assignments) ? response.data.assignments : [];
        return this.successResponse({
          assignments: assignments,
          total_assigned: assignments.length,
          shift_id: validated.shift_id,
          user_ids: validated.user_ids,
          summary: {
            successful: assignments.filter((a: any) => a.success).length,
            failed: assignments.filter((a: any) => !a.success).length
          }
        }, `Successfully assigned shift to ${assignments.filter((a: any) => a.success).length} users`);
      } else {
        return this.errorResponse('Failed to assign shift to users', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Bulk assign shift failed', error.message);
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
          shift_id: { type: 'string', format: 'uuid', description: 'Shift ID to assign' },
          user_ids: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1, description: 'Array of user IDs to assign the shift' },
          start_date: { type: 'string', description: 'Start date for all assignments (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'End date for all assignments (YYYY-MM-DD, optional)' },
          notes: { type: 'string', description: 'Notes for all assignments' }
        },
        required: ['shift_id', 'user_ids', 'start_date']
      }
    };
  }
}

export class GetUserShiftConflictsTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_get_user_shift_conflicts',
      description: 'Check for potential scheduling conflicts before assigning a shift to a user',
      category: 'user-shifts',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return getUserShiftConflictsSchema;
  }

  async execute(args: z.infer<typeof getUserShiftConflictsSchema>): Promise<any> {
    const validated = getUserShiftConflictsSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const conflictData = {
        user_id: validated.user_id,
        shift_id: validated.shift_id,
        start_date: validated.start_date,
        end_date: validated.end_date
      };

      const response = await this.apiClient.post('/api/public/v1/user_shifts/check_conflicts', conflictData);

      if (response.success && response.data) {
        return this.successResponse({
          has_conflicts: response.data.has_conflicts,
          conflicts: response.data.conflicts || [],
          conflict_count: response.data.conflicts ? response.data.conflicts.length : 0,
          recommendations: response.data.recommendations || [],
          can_assign: !response.data.has_conflicts
        }, response.data.has_conflicts ? 'Conflicts detected' : 'No conflicts found');
      } else {
        return this.errorResponse('Failed to check conflicts', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Conflict check failed', error.message);
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
          user_id: { type: 'string', format: 'uuid', description: 'User ID to check for conflicts' },
          shift_id: { type: 'string', format: 'uuid', description: 'Proposed shift ID' },
          start_date: { type: 'string', description: 'Proposed start date (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'Proposed end date (YYYY-MM-DD)' }
        },
        required: ['user_id', 'shift_id', 'start_date']
      }
    };
  }
}