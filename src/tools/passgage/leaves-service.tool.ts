import { z } from 'zod';
import { BaseTool } from '../base.tool.js';
import { ToolMetadata } from '../index.js';
import { PassgageAPIClient } from '../../api/client.js';

const listLeavesSchema = z.object({
  page: z.number().int().positive().optional().default(1).describe('Page number'),
  per_page: z.number().int().positive().max(50).optional().default(25).describe('Items per page (max 50)'),
  q: z.record(z.any()).optional().describe('Ransack query filters for advanced searching')
});

const getLeaveSchema = z.object({
  leave_id: z.string().uuid().describe('Leave request ID to retrieve')
});

const createLeaveSchema = z.object({
  user_id: z.string().uuid().describe('User ID requesting leave'),
  leave_type_id: z.string().uuid().describe('Leave type ID'),
  start_date: z.string().describe('Leave start date (YYYY-MM-DD)'),
  end_date: z.string().describe('Leave end date (YYYY-MM-DD)'),
  start_time: z.string().optional().describe('Start time for partial day leaves (HH:MM)'),
  end_time: z.string().optional().describe('End time for partial day leaves (HH:MM)'),
  is_half_day: z.boolean().optional().default(false).describe('Whether this is a half-day leave'),
  reason: z.string().min(1).describe('Reason for the leave request'),
  notes: z.string().optional().describe('Additional notes'),
  emergency_contact: z.string().optional().describe('Emergency contact information'),
  attachments: z.array(z.string().uuid()).optional().describe('Array of file IDs for supporting documents')
});

const updateLeaveSchema = z.object({
  leave_id: z.string().uuid().describe('Leave request ID to update'),
  leave_type_id: z.string().uuid().optional().describe('Leave type ID'),
  start_date: z.string().optional().describe('Leave start date (YYYY-MM-DD)'),
  end_date: z.string().optional().describe('Leave end date (YYYY-MM-DD)'),
  start_time: z.string().optional().describe('Start time for partial day leaves (HH:MM)'),
  end_time: z.string().optional().describe('End time for partial day leaves (HH:MM)'),
  is_half_day: z.boolean().optional().describe('Whether this is a half-day leave'),
  reason: z.string().optional().describe('Reason for the leave request'),
  notes: z.string().optional().describe('Additional notes'),
  emergency_contact: z.string().optional().describe('Emergency contact information'),
  attachments: z.array(z.string().uuid()).optional().describe('Array of file IDs for supporting documents')
});

const deleteLeaveSchema = z.object({
  leave_id: z.string().uuid().describe('Leave request ID to delete')
});

const approveLeaveSchema = z.object({
  leave_id: z.string().uuid().describe('Leave request ID to approve'),
  approver_notes: z.string().optional().describe('Notes from the approver'),
  partial_approval: z.boolean().optional().default(false).describe('Whether this is a partial approval'),
  approved_start_date: z.string().optional().describe('Approved start date if different from requested'),
  approved_end_date: z.string().optional().describe('Approved end date if different from requested')
});

const rejectLeaveSchema = z.object({
  leave_id: z.string().uuid().describe('Leave request ID to reject'),
  rejection_reason: z.string().min(1).describe('Reason for rejecting the leave'),
  approver_notes: z.string().optional().describe('Additional notes from the approver')
});

const getLeaveBalanceSchema = z.object({
  user_id: z.string().uuid().describe('User ID to check leave balance'),
  leave_type_id: z.string().uuid().optional().describe('Specific leave type ID (optional, returns all if not specified)'),
  year: z.number().int().min(2020).max(2030).optional().describe('Year for balance calculation (defaults to current year)')
});

export class ListLeavesTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_list_leaves',
      description: 'List leave requests with advanced filtering and pagination',
      category: 'leaves',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return listLeavesSchema;
  }

  async execute(args: z.infer<typeof listLeavesSchema>): Promise<any> {
    const validated = listLeavesSchema.parse(args);
    
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

      const response = await this.apiClient.get('/api/public/v1/leaves', params);

      if (response.success && response.data) {
        const leaves = Array.isArray(response.data) ? response.data : [];
        return this.successResponse({
          leaves: leaves.map(leave => ({
            id: leave.id,
            user_id: leave.user_id,
            user_name: leave.user?.name,
            leave_type_id: leave.leave_type_id,
            leave_type_name: leave.leave_type?.name,
            start_date: leave.start_date,
            end_date: leave.end_date,
            start_time: leave.start_time,
            end_time: leave.end_time,
            is_half_day: leave.is_half_day,
            total_days: leave.total_days,
            status: leave.status,
            reason: leave.reason,
            approver_id: leave.approver_id,
            approver_name: leave.approver?.name,
            approved_at: leave.approved_at,
            rejected_at: leave.rejected_at,
            created_at: leave.created_at,
            updated_at: leave.updated_at
          })),
          pagination: {
            current_page: validated.page,
            per_page: validated.per_page,
            total_count: leaves.length
          }
        }, `Found ${leaves.length} leave requests`);
      } else {
        return this.errorResponse('Failed to fetch leaves', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('List leaves failed', error.message);
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

export class GetLeaveTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_get_leave',
      description: 'Get detailed information about a specific leave request',
      category: 'leaves',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return getLeaveSchema;
  }

  async execute(args: z.infer<typeof getLeaveSchema>): Promise<any> {
    const validated = getLeaveSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.getById('/api/public/v1/leaves', validated.leave_id);

      if (response.success && response.data) {
        const leave = response.data;
        return this.successResponse({
          leave: {
            id: leave.id,
            user_id: leave.user_id,
            user: leave.user ? {
              id: leave.user.id,
              name: leave.user.name,
              email: leave.user.email,
              employee_number: leave.user.employee_number,
              department: leave.user.department?.name
            } : null,
            leave_type_id: leave.leave_type_id,
            leave_type: leave.leave_type ? {
              id: leave.leave_type.id,
              name: leave.leave_type.name,
              code: leave.leave_type.code,
              is_paid: leave.leave_type.is_paid,
              max_days_per_year: leave.leave_type.max_days_per_year
            } : null,
            start_date: leave.start_date,
            end_date: leave.end_date,
            start_time: leave.start_time,
            end_time: leave.end_time,
            is_half_day: leave.is_half_day,
            total_days: leave.total_days,
            status: leave.status,
            reason: leave.reason,
            notes: leave.notes,
            emergency_contact: leave.emergency_contact,
            attachments: leave.attachments || [],
            approver_id: leave.approver_id,
            approver: leave.approver ? {
              id: leave.approver.id,
              name: leave.approver.name,
              email: leave.approver.email
            } : null,
            approver_notes: leave.approver_notes,
            approved_at: leave.approved_at,
            rejected_at: leave.rejected_at,
            rejection_reason: leave.rejection_reason,
            created_at: leave.created_at,
            updated_at: leave.updated_at,
            workflow_status: leave.workflow_status,
            approval_history: leave.approval_history || []
          }
        }, 'Leave request retrieved successfully');
      } else {
        return this.errorResponse('Leave request not found', response.message || 'Leave request does not exist');
      }
    } catch (error: any) {
      return this.errorResponse('Get leave failed', error.message);
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
          leave_id: { type: 'string', format: 'uuid', description: 'Leave request ID to retrieve' }
        },
        required: ['leave_id']
      }
    };
  }
}

export class CreateLeaveTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_create_leave',
      description: 'Create a new leave request',
      category: 'leaves',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return createLeaveSchema;
  }

  async execute(args: z.infer<typeof createLeaveSchema>): Promise<any> {
    const validated = createLeaveSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const leaveData = {
        user_id: validated.user_id,
        leave_type_id: validated.leave_type_id,
        start_date: validated.start_date,
        end_date: validated.end_date,
        start_time: validated.start_time,
        end_time: validated.end_time,
        is_half_day: validated.is_half_day,
        reason: validated.reason,
        notes: validated.notes,
        emergency_contact: validated.emergency_contact,
        attachments: validated.attachments
      };

      const response = await this.apiClient.post('/api/public/v1/leaves', leaveData);

      if (response.success && response.data) {
        return this.successResponse({
          leave: {
            id: response.data.id,
            user_id: response.data.user_id,
            leave_type_id: response.data.leave_type_id,
            start_date: response.data.start_date,
            end_date: response.data.end_date,
            total_days: response.data.total_days,
            status: response.data.status,
            reason: response.data.reason,
            created_at: response.data.created_at,
            approval_required: response.data.approval_required,
            next_approver: response.data.next_approver
          }
        }, 'Leave request created successfully');
      } else {
        return this.errorResponse('Failed to create leave request', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Create leave failed', error.message);
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
          user_id: { type: 'string', format: 'uuid', description: 'User ID requesting leave' },
          leave_type_id: { type: 'string', format: 'uuid', description: 'Leave type ID' },
          start_date: { type: 'string', description: 'Leave start date (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'Leave end date (YYYY-MM-DD)' },
          start_time: { type: 'string', description: 'Start time for partial day leaves (HH:MM)' },
          end_time: { type: 'string', description: 'End time for partial day leaves (HH:MM)' },
          is_half_day: { type: 'boolean', default: false, description: 'Whether this is a half-day leave' },
          reason: { type: 'string', minLength: 1, description: 'Reason for the leave request' },
          notes: { type: 'string', description: 'Additional notes' },
          emergency_contact: { type: 'string', description: 'Emergency contact information' },
          attachments: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'Array of file IDs for supporting documents' }
        },
        required: ['user_id', 'leave_type_id', 'start_date', 'end_date', 'reason']
      }
    };
  }
}

export class UpdateLeaveTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_update_leave',
      description: 'Update an existing leave request (only if not yet approved)',
      category: 'leaves',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return updateLeaveSchema;
  }

  async execute(args: z.infer<typeof updateLeaveSchema>): Promise<any> {
    const validated = updateLeaveSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const updateData: any = {};
      if (validated.leave_type_id !== undefined) updateData.leave_type_id = validated.leave_type_id;
      if (validated.start_date !== undefined) updateData.start_date = validated.start_date;
      if (validated.end_date !== undefined) updateData.end_date = validated.end_date;
      if (validated.start_time !== undefined) updateData.start_time = validated.start_time;
      if (validated.end_time !== undefined) updateData.end_time = validated.end_time;
      if (validated.is_half_day !== undefined) updateData.is_half_day = validated.is_half_day;
      if (validated.reason !== undefined) updateData.reason = validated.reason;
      if (validated.notes !== undefined) updateData.notes = validated.notes;
      if (validated.emergency_contact !== undefined) updateData.emergency_contact = validated.emergency_contact;
      if (validated.attachments !== undefined) updateData.attachments = validated.attachments;

      const response = await this.apiClient.put('/api/public/v1/leaves', validated.leave_id, updateData);

      if (response.success && response.data) {
        return this.successResponse({
          leave: {
            id: response.data.id,
            start_date: response.data.start_date,
            end_date: response.data.end_date,
            total_days: response.data.total_days,
            status: response.data.status,
            reason: response.data.reason,
            updated_at: response.data.updated_at
          }
        }, 'Leave request updated successfully');
      } else {
        return this.errorResponse('Failed to update leave request', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Update leave failed', error.message);
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
          leave_id: { type: 'string', format: 'uuid', description: 'Leave request ID to update' },
          leave_type_id: { type: 'string', format: 'uuid', description: 'Leave type ID' },
          start_date: { type: 'string', description: 'Leave start date (YYYY-MM-DD)' },
          end_date: { type: 'string', description: 'Leave end date (YYYY-MM-DD)' },
          start_time: { type: 'string', description: 'Start time for partial day leaves (HH:MM)' },
          end_time: { type: 'string', description: 'End time for partial day leaves (HH:MM)' },
          is_half_day: { type: 'boolean', description: 'Whether this is a half-day leave' },
          reason: { type: 'string', description: 'Reason for the leave request' },
          notes: { type: 'string', description: 'Additional notes' },
          emergency_contact: { type: 'string', description: 'Emergency contact information' },
          attachments: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'Array of file IDs for supporting documents' }
        },
        required: ['leave_id']
      }
    };
  }
}

export class DeleteLeaveTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_delete_leave',
      description: 'Delete a leave request (only if not yet approved)',
      category: 'leaves',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return deleteLeaveSchema;
  }

  async execute(args: z.infer<typeof deleteLeaveSchema>): Promise<any> {
    const validated = deleteLeaveSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.delete('/api/public/v1/leaves', validated.leave_id);

      if (response.success) {
        return this.successResponse({
          deleted: true,
          leave_id: validated.leave_id
        }, 'Leave request deleted successfully');
      } else {
        return this.errorResponse('Failed to delete leave request', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Delete leave failed', error.message);
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
          leave_id: { type: 'string', format: 'uuid', description: 'Leave request ID to delete' }
        },
        required: ['leave_id']
      }
    };
  }
}

export class ApproveLeaveTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_approve_leave',
      description: 'Approve a leave request with optional modifications',
      category: 'leaves',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return approveLeaveSchema;
  }

  async execute(args: z.infer<typeof approveLeaveSchema>): Promise<any> {
    const validated = approveLeaveSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const approvalData = {
        approver_notes: validated.approver_notes,
        partial_approval: validated.partial_approval,
        approved_start_date: validated.approved_start_date,
        approved_end_date: validated.approved_end_date
      };

      const response = await this.apiClient.post(`/api/public/v1/leaves/${validated.leave_id}/approve`, approvalData);

      if (response.success && response.data) {
        return this.successResponse({
          leave: {
            id: response.data.id,
            status: response.data.status,
            approved_at: response.data.approved_at,
            approver_id: response.data.approver_id,
            approver_notes: response.data.approver_notes,
            final_start_date: response.data.final_start_date,
            final_end_date: response.data.final_end_date,
            workflow_completed: response.data.workflow_completed
          }
        }, 'Leave request approved successfully');
      } else {
        return this.errorResponse('Failed to approve leave request', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Approve leave failed', error.message);
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
          leave_id: { type: 'string', format: 'uuid', description: 'Leave request ID to approve' },
          approver_notes: { type: 'string', description: 'Notes from the approver' },
          partial_approval: { type: 'boolean', default: false, description: 'Whether this is a partial approval' },
          approved_start_date: { type: 'string', description: 'Approved start date if different from requested' },
          approved_end_date: { type: 'string', description: 'Approved end date if different from requested' }
        },
        required: ['leave_id']
      }
    };
  }
}

export class RejectLeaveTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_reject_leave',
      description: 'Reject a leave request with reason',
      category: 'leaves',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return rejectLeaveSchema;
  }

  async execute(args: z.infer<typeof rejectLeaveSchema>): Promise<any> {
    const validated = rejectLeaveSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const rejectionData = {
        rejection_reason: validated.rejection_reason,
        approver_notes: validated.approver_notes
      };

      const response = await this.apiClient.post(`/api/public/v1/leaves/${validated.leave_id}/reject`, rejectionData);

      if (response.success && response.data) {
        return this.successResponse({
          leave: {
            id: response.data.id,
            status: response.data.status,
            rejected_at: response.data.rejected_at,
            approver_id: response.data.approver_id,
            rejection_reason: response.data.rejection_reason,
            approver_notes: response.data.approver_notes
          }
        }, 'Leave request rejected successfully');
      } else {
        return this.errorResponse('Failed to reject leave request', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Reject leave failed', error.message);
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
          leave_id: { type: 'string', format: 'uuid', description: 'Leave request ID to reject' },
          rejection_reason: { type: 'string', minLength: 1, description: 'Reason for rejecting the leave' },
          approver_notes: { type: 'string', description: 'Additional notes from the approver' }
        },
        required: ['leave_id', 'rejection_reason']
      }
    };
  }
}

export class GetLeaveBalanceTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_get_leave_balance',
      description: 'Get leave balance information for a user',
      category: 'leaves',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return getLeaveBalanceSchema;
  }

  async execute(args: z.infer<typeof getLeaveBalanceSchema>): Promise<any> {
    const validated = getLeaveBalanceSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const params: any = {
        user_id: validated.user_id
      };

      if (validated.leave_type_id) {
        params.leave_type_id = validated.leave_type_id;
      }

      if (validated.year) {
        params.year = validated.year;
      }

      const response = await this.apiClient.get('/api/public/v1/leaves/balance', params);

      if (response.success && response.data) {
        const balanceData = response.data as any;
        return this.successResponse({
          user_id: validated.user_id,
          year: balanceData.year,
          leave_balances: balanceData.leave_balances || [],
          total_entitlement: balanceData.total_entitlement,
          total_used: balanceData.total_used,
          total_remaining: balanceData.total_remaining,
          pending_requests: balanceData.pending_requests || [],
          carry_over: balanceData.carry_over || {}
        }, 'Leave balance retrieved successfully');
      } else {
        return this.errorResponse('Failed to get leave balance', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Get leave balance failed', error.message);
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
          user_id: { type: 'string', format: 'uuid', description: 'User ID to check leave balance' },
          leave_type_id: { type: 'string', format: 'uuid', description: 'Specific leave type ID (optional, returns all if not specified)' },
          year: { type: 'integer', minimum: 2020, maximum: 2030, description: 'Year for balance calculation (defaults to current year)' }
        },
        required: ['user_id']
      }
    };
  }
}