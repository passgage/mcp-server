import { z } from 'zod';
import { BaseTool } from '../base.tool.js';
import { ToolMetadata } from '../index.js';
import { PassgageAPIClient } from '../../api/client.js';

const listLeaveTypesSchema = z.object({
  page: z.number().int().positive().optional().default(1).describe('Page number'),
  per_page: z.number().int().positive().max(50).optional().default(25).describe('Items per page (max 50)'),
  q: z.record(z.any()).optional().describe('Ransack query filters for advanced searching')
});

const getLeaveTypeSchema = z.object({
  leave_type_id: z.string().uuid().describe('Leave type ID to retrieve')
});

const createLeaveTypeSchema = z.object({
  name: z.string().min(1).describe('Leave type name'),
  code: z.string().min(1).describe('Leave type code (unique identifier)'),
  description: z.string().optional().describe('Description of the leave type'),
  is_paid: z.boolean().default(true).describe('Whether this leave type is paid'),
  is_active: z.boolean().default(true).describe('Whether this leave type is active'),
  max_days_per_year: z.number().positive().optional().describe('Maximum days allowed per year'),
  min_days_per_request: z.number().positive().optional().default(1).describe('Minimum days per request'),
  max_days_per_request: z.number().positive().optional().describe('Maximum days per single request'),
  requires_approval: z.boolean().default(true).describe('Whether this leave type requires approval'),
  approval_workflow_id: z.string().uuid().optional().describe('Approval workflow ID if requires approval'),
  advance_notice_days: z.number().int().min(0).optional().default(0).describe('Required advance notice in days'),
  can_be_half_day: z.boolean().default(false).describe('Whether half-day leaves are allowed'),
  carry_over_allowed: z.boolean().default(false).describe('Whether unused days can be carried over'),
  max_carry_over_days: z.number().int().min(0).optional().describe('Maximum days that can be carried over'),
  requires_attachment: z.boolean().default(false).describe('Whether supporting documents are required'),
  exclude_weekends: z.boolean().default(true).describe('Whether to exclude weekends from calculations'),
  exclude_holidays: z.boolean().default(true).describe('Whether to exclude holidays from calculations')
});

const updateLeaveTypeSchema = z.object({
  leave_type_id: z.string().uuid().describe('Leave type ID to update'),
  name: z.string().min(1).optional().describe('Leave type name'),
  code: z.string().min(1).optional().describe('Leave type code (unique identifier)'),
  description: z.string().optional().describe('Description of the leave type'),
  is_paid: z.boolean().optional().describe('Whether this leave type is paid'),
  is_active: z.boolean().optional().describe('Whether this leave type is active'),
  max_days_per_year: z.number().positive().optional().describe('Maximum days allowed per year'),
  min_days_per_request: z.number().positive().optional().describe('Minimum days per request'),
  max_days_per_request: z.number().positive().optional().describe('Maximum days per single request'),
  requires_approval: z.boolean().optional().describe('Whether this leave type requires approval'),
  approval_workflow_id: z.string().uuid().optional().describe('Approval workflow ID if requires approval'),
  advance_notice_days: z.number().int().min(0).optional().describe('Required advance notice in days'),
  can_be_half_day: z.boolean().optional().describe('Whether half-day leaves are allowed'),
  carry_over_allowed: z.boolean().optional().describe('Whether unused days can be carried over'),
  max_carry_over_days: z.number().int().min(0).optional().describe('Maximum days that can be carried over'),
  requires_attachment: z.boolean().optional().describe('Whether supporting documents are required'),
  exclude_weekends: z.boolean().optional().describe('Whether to exclude weekends from calculations'),
  exclude_holidays: z.boolean().optional().describe('Whether to exclude holidays from calculations')
});

const deleteLeaveTypeSchema = z.object({
  leave_type_id: z.string().uuid().describe('Leave type ID to delete')
});

const getLeaveTypeEntitlementsSchema = z.object({
  leave_type_id: z.string().uuid().describe('Leave type ID to get entitlements'),
  user_id: z.string().uuid().optional().describe('Specific user ID (optional, gets all users if not specified)')
});

const setUserEntitlementSchema = z.object({
  leave_type_id: z.string().uuid().describe('Leave type ID'),
  user_id: z.string().uuid().describe('User ID'),
  entitled_days: z.number().min(0).describe('Number of entitled days for this user'),
  effective_date: z.string().describe('Effective date for this entitlement (YYYY-MM-DD)'),
  notes: z.string().optional().describe('Notes about this entitlement')
});

export class ListLeaveTypesTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_list_leave_types',
      description: 'List leave types with advanced filtering and pagination',
      category: 'leave-types',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return listLeaveTypesSchema;
  }

  async execute(args: z.infer<typeof listLeaveTypesSchema>): Promise<any> {
    const validated = listLeaveTypesSchema.parse(args);
    
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

      const response = await this.apiClient.get('/api/public/v1/leave_types', params);

      if (response.success && response.data) {
        const leaveTypes = Array.isArray(response.data) ? response.data : [];
        return this.successResponse({
          leave_types: leaveTypes.map(lt => ({
            id: lt.id,
            name: lt.name,
            code: lt.code,
            description: lt.description,
            is_paid: lt.is_paid,
            is_active: lt.is_active,
            max_days_per_year: lt.max_days_per_year,
            min_days_per_request: lt.min_days_per_request,
            max_days_per_request: lt.max_days_per_request,
            requires_approval: lt.requires_approval,
            can_be_half_day: lt.can_be_half_day,
            carry_over_allowed: lt.carry_over_allowed,
            requires_attachment: lt.requires_attachment,
            advance_notice_days: lt.advance_notice_days,
            created_at: lt.created_at,
            updated_at: lt.updated_at
          })),
          pagination: {
            current_page: validated.page,
            per_page: validated.per_page,
            total_count: leaveTypes.length
          }
        }, `Found ${leaveTypes.length} leave types`);
      } else {
        return this.errorResponse('Failed to fetch leave types', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('List leave types failed', error.message);
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

export class GetLeaveTypeTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_get_leave_type',
      description: 'Get detailed information about a specific leave type',
      category: 'leave-types',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return getLeaveTypeSchema;
  }

  async execute(args: z.infer<typeof getLeaveTypeSchema>): Promise<any> {
    const validated = getLeaveTypeSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.getById('/api/public/v1/leave_types', validated.leave_type_id);

      if (response.success && response.data) {
        const lt = response.data;
        return this.successResponse({
          leave_type: {
            id: lt.id,
            name: lt.name,
            code: lt.code,
            description: lt.description,
            is_paid: lt.is_paid,
            is_active: lt.is_active,
            max_days_per_year: lt.max_days_per_year,
            min_days_per_request: lt.min_days_per_request,
            max_days_per_request: lt.max_days_per_request,
            requires_approval: lt.requires_approval,
            approval_workflow: lt.approval_workflow ? {
              id: lt.approval_workflow.id,
              name: lt.approval_workflow.name,
              steps_count: lt.approval_workflow.steps_count
            } : null,
            advance_notice_days: lt.advance_notice_days,
            can_be_half_day: lt.can_be_half_day,
            carry_over_allowed: lt.carry_over_allowed,
            max_carry_over_days: lt.max_carry_over_days,
            requires_attachment: lt.requires_attachment,
            exclude_weekends: lt.exclude_weekends,
            exclude_holidays: lt.exclude_holidays,
            created_at: lt.created_at,
            updated_at: lt.updated_at,
            created_by: lt.created_by,
            updated_by: lt.updated_by,
            usage_statistics: lt.usage_statistics || {},
            entitlement_rules: lt.entitlement_rules || []
          }
        }, 'Leave type retrieved successfully');
      } else {
        return this.errorResponse('Leave type not found', response.message || 'Leave type does not exist');
      }
    } catch (error: any) {
      return this.errorResponse('Get leave type failed', error.message);
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
          leave_type_id: { type: 'string', format: 'uuid', description: 'Leave type ID to retrieve' }
        },
        required: ['leave_type_id']
      }
    };
  }
}

export class CreateLeaveTypeTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_create_leave_type',
      description: 'Create a new leave type with policies and rules',
      category: 'leave-types',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return createLeaveTypeSchema;
  }

  async execute(args: z.infer<typeof createLeaveTypeSchema>): Promise<any> {
    const validated = createLeaveTypeSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const leaveTypeData = {
        name: validated.name,
        code: validated.code,
        description: validated.description,
        is_paid: validated.is_paid,
        is_active: validated.is_active,
        max_days_per_year: validated.max_days_per_year,
        min_days_per_request: validated.min_days_per_request,
        max_days_per_request: validated.max_days_per_request,
        requires_approval: validated.requires_approval,
        approval_workflow_id: validated.approval_workflow_id,
        advance_notice_days: validated.advance_notice_days,
        can_be_half_day: validated.can_be_half_day,
        carry_over_allowed: validated.carry_over_allowed,
        max_carry_over_days: validated.max_carry_over_days,
        requires_attachment: validated.requires_attachment,
        exclude_weekends: validated.exclude_weekends,
        exclude_holidays: validated.exclude_holidays
      };

      const response = await this.apiClient.post('/api/public/v1/leave_types', leaveTypeData);

      if (response.success && response.data) {
        return this.successResponse({
          leave_type: {
            id: response.data.id,
            name: response.data.name,
            code: response.data.code,
            is_paid: response.data.is_paid,
            is_active: response.data.is_active,
            requires_approval: response.data.requires_approval,
            created_at: response.data.created_at
          }
        }, 'Leave type created successfully');
      } else {
        return this.errorResponse('Failed to create leave type', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Create leave type failed', error.message);
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
          name: { type: 'string', minLength: 1, description: 'Leave type name' },
          code: { type: 'string', minLength: 1, description: 'Leave type code (unique identifier)' },
          description: { type: 'string', description: 'Description of the leave type' },
          is_paid: { type: 'boolean', default: true, description: 'Whether this leave type is paid' },
          is_active: { type: 'boolean', default: true, description: 'Whether this leave type is active' },
          max_days_per_year: { type: 'number', minimum: 0, description: 'Maximum days allowed per year' },
          min_days_per_request: { type: 'number', minimum: 1, default: 1, description: 'Minimum days per request' },
          max_days_per_request: { type: 'number', minimum: 1, description: 'Maximum days per single request' },
          requires_approval: { type: 'boolean', default: true, description: 'Whether this leave type requires approval' },
          approval_workflow_id: { type: 'string', format: 'uuid', description: 'Approval workflow ID if requires approval' },
          advance_notice_days: { type: 'integer', minimum: 0, default: 0, description: 'Required advance notice in days' },
          can_be_half_day: { type: 'boolean', default: false, description: 'Whether half-day leaves are allowed' },
          carry_over_allowed: { type: 'boolean', default: false, description: 'Whether unused days can be carried over' },
          max_carry_over_days: { type: 'integer', minimum: 0, description: 'Maximum days that can be carried over' },
          requires_attachment: { type: 'boolean', default: false, description: 'Whether supporting documents are required' },
          exclude_weekends: { type: 'boolean', default: true, description: 'Whether to exclude weekends from calculations' },
          exclude_holidays: { type: 'boolean', default: true, description: 'Whether to exclude holidays from calculations' }
        },
        required: ['name', 'code']
      }
    };
  }
}

export class UpdateLeaveTypeTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_update_leave_type',
      description: 'Update an existing leave type',
      category: 'leave-types',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return updateLeaveTypeSchema;
  }

  async execute(args: z.infer<typeof updateLeaveTypeSchema>): Promise<any> {
    const validated = updateLeaveTypeSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const updateData: any = {};
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.code !== undefined) updateData.code = validated.code;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.is_paid !== undefined) updateData.is_paid = validated.is_paid;
      if (validated.is_active !== undefined) updateData.is_active = validated.is_active;
      if (validated.max_days_per_year !== undefined) updateData.max_days_per_year = validated.max_days_per_year;
      if (validated.min_days_per_request !== undefined) updateData.min_days_per_request = validated.min_days_per_request;
      if (validated.max_days_per_request !== undefined) updateData.max_days_per_request = validated.max_days_per_request;
      if (validated.requires_approval !== undefined) updateData.requires_approval = validated.requires_approval;
      if (validated.approval_workflow_id !== undefined) updateData.approval_workflow_id = validated.approval_workflow_id;
      if (validated.advance_notice_days !== undefined) updateData.advance_notice_days = validated.advance_notice_days;
      if (validated.can_be_half_day !== undefined) updateData.can_be_half_day = validated.can_be_half_day;
      if (validated.carry_over_allowed !== undefined) updateData.carry_over_allowed = validated.carry_over_allowed;
      if (validated.max_carry_over_days !== undefined) updateData.max_carry_over_days = validated.max_carry_over_days;
      if (validated.requires_attachment !== undefined) updateData.requires_attachment = validated.requires_attachment;
      if (validated.exclude_weekends !== undefined) updateData.exclude_weekends = validated.exclude_weekends;
      if (validated.exclude_holidays !== undefined) updateData.exclude_holidays = validated.exclude_holidays;

      const response = await this.apiClient.put('/api/public/v1/leave_types', validated.leave_type_id, updateData);

      if (response.success && response.data) {
        return this.successResponse({
          leave_type: {
            id: response.data.id,
            name: response.data.name,
            code: response.data.code,
            is_paid: response.data.is_paid,
            is_active: response.data.is_active,
            updated_at: response.data.updated_at
          }
        }, 'Leave type updated successfully');
      } else {
        return this.errorResponse('Failed to update leave type', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Update leave type failed', error.message);
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
          leave_type_id: { type: 'string', format: 'uuid', description: 'Leave type ID to update' },
          name: { type: 'string', minLength: 1, description: 'Leave type name' },
          code: { type: 'string', minLength: 1, description: 'Leave type code (unique identifier)' },
          description: { type: 'string', description: 'Description of the leave type' },
          is_paid: { type: 'boolean', description: 'Whether this leave type is paid' },
          is_active: { type: 'boolean', description: 'Whether this leave type is active' },
          max_days_per_year: { type: 'number', minimum: 0, description: 'Maximum days allowed per year' },
          min_days_per_request: { type: 'number', minimum: 1, description: 'Minimum days per request' },
          max_days_per_request: { type: 'number', minimum: 1, description: 'Maximum days per single request' },
          requires_approval: { type: 'boolean', description: 'Whether this leave type requires approval' },
          approval_workflow_id: { type: 'string', format: 'uuid', description: 'Approval workflow ID if requires approval' },
          advance_notice_days: { type: 'integer', minimum: 0, description: 'Required advance notice in days' },
          can_be_half_day: { type: 'boolean', description: 'Whether half-day leaves are allowed' },
          carry_over_allowed: { type: 'boolean', description: 'Whether unused days can be carried over' },
          max_carry_over_days: { type: 'integer', minimum: 0, description: 'Maximum days that can be carried over' },
          requires_attachment: { type: 'boolean', description: 'Whether supporting documents are required' },
          exclude_weekends: { type: 'boolean', description: 'Whether to exclude weekends from calculations' },
          exclude_holidays: { type: 'boolean', description: 'Whether to exclude holidays from calculations' }
        },
        required: ['leave_type_id']
      }
    };
  }
}

export class DeleteLeaveTypeTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_delete_leave_type',
      description: 'Delete a leave type (only if no active leaves use it)',
      category: 'leave-types',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return deleteLeaveTypeSchema;
  }

  async execute(args: z.infer<typeof deleteLeaveTypeSchema>): Promise<any> {
    const validated = deleteLeaveTypeSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.delete('/api/public/v1/leave_types', validated.leave_type_id);

      if (response.success) {
        return this.successResponse({
          deleted: true,
          leave_type_id: validated.leave_type_id
        }, 'Leave type deleted successfully');
      } else {
        return this.errorResponse('Failed to delete leave type', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Delete leave type failed', error.message);
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
          leave_type_id: { type: 'string', format: 'uuid', description: 'Leave type ID to delete' }
        },
        required: ['leave_type_id']
      }
    };
  }
}

export class GetLeaveTypeEntitlementsTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_get_leave_type_entitlements',
      description: 'Get leave type entitlements for users',
      category: 'leave-types',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return getLeaveTypeEntitlementsSchema;
  }

  async execute(args: z.infer<typeof getLeaveTypeEntitlementsSchema>): Promise<any> {
    const validated = getLeaveTypeEntitlementsSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const params: any = {
        leave_type_id: validated.leave_type_id
      };

      if (validated.user_id) {
        params.user_id = validated.user_id;
      }

      const response = await this.apiClient.get('/api/public/v1/leave_types/entitlements', params);

      if (response.success && response.data) {
        const entitlementData = response.data as any;
        return this.successResponse({
          leave_type_id: validated.leave_type_id,
          entitlements: entitlementData.entitlements || [],
          total_users: entitlementData.total_users,
          default_entitlement: entitlementData.default_entitlement
        }, 'Leave type entitlements retrieved successfully');
      } else {
        return this.errorResponse('Failed to get entitlements', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Get entitlements failed', error.message);
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
          leave_type_id: { type: 'string', format: 'uuid', description: 'Leave type ID to get entitlements' },
          user_id: { type: 'string', format: 'uuid', description: 'Specific user ID (optional, gets all users if not specified)' }
        },
        required: ['leave_type_id']
      }
    };
  }
}

export class SetUserEntitlementTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_set_user_leave_entitlement',
      description: 'Set leave entitlement for a specific user and leave type',
      category: 'leave-types',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return setUserEntitlementSchema;
  }

  async execute(args: z.infer<typeof setUserEntitlementSchema>): Promise<any> {
    const validated = setUserEntitlementSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const entitlementData = {
        leave_type_id: validated.leave_type_id,
        user_id: validated.user_id,
        entitled_days: validated.entitled_days,
        effective_date: validated.effective_date,
        notes: validated.notes
      };

      const response = await this.apiClient.post('/api/public/v1/leave_types/set_entitlement', entitlementData);

      if (response.success && response.data) {
        return this.successResponse({
          entitlement: {
            id: response.data.id,
            leave_type_id: response.data.leave_type_id,
            user_id: response.data.user_id,
            entitled_days: response.data.entitled_days,
            effective_date: response.data.effective_date,
            notes: response.data.notes,
            created_at: response.data.created_at
          }
        }, 'User leave entitlement set successfully');
      } else {
        return this.errorResponse('Failed to set entitlement', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Set entitlement failed', error.message);
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
          leave_type_id: { type: 'string', format: 'uuid', description: 'Leave type ID' },
          user_id: { type: 'string', format: 'uuid', description: 'User ID' },
          entitled_days: { type: 'number', minimum: 0, description: 'Number of entitled days for this user' },
          effective_date: { type: 'string', description: 'Effective date for this entitlement (YYYY-MM-DD)' },
          notes: { type: 'string', description: 'Notes about this entitlement' }
        },
        required: ['leave_type_id', 'user_id', 'entitled_days', 'effective_date']
      }
    };
  }
}