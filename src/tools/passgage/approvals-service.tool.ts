import { z } from 'zod';
import { BaseTool } from '../base.tool.js';
import { ToolMetadata } from '../index.js';
import { PassgageAPIClient } from '../../api/client.js';
import { paginatedResponse, successResponse } from '../../utils/response.js';
import { validateRansackQuery } from '../../utils/validation.js';

// === SCHEMAS ===

const listApprovalsSchema = z.object({
  page: z.number().int().positive().optional().default(1).describe('Page number'),
  per_page: z.number().int().min(1).max(50).optional().default(25).describe('Items per page'),
  q: z.record(z.any()).optional().describe('Ransack query filters'),
  sort: z.string().optional().describe('Sort field and direction'),
  status: z.enum(['pending', 'approved', 'rejected', 'in_progress']).optional()
    .describe('Filter by approval status')
});

const getApprovalSchema = z.object({
  id: z.string().uuid().describe('Approval UUID')
});

const approveRequestSchema = z.object({
  approval_id: z.string().uuid().describe('Approval UUID'),
  comment: z.string().optional().describe('Optional approval comment'),
  approve_all_pending: z.boolean().optional().default(false)
    .describe('If true, approves all pending steps for this user')
});

const rejectRequestSchema = z.object({
  approval_id: z.string().uuid().describe('Approval UUID'),
  comment: z.string().min(1).describe('Required rejection reason'),
  reject_entire_process: z.boolean().optional().default(false)
    .describe('If true, rejects the entire approval process')
});

const bulkApprovalSchema = z.object({
  approval_ids: z.array(z.string().uuid()).min(1).max(50)
    .describe('Array of approval UUIDs (max 50)'),
  comment: z.string().optional().describe('Optional comment for all approvals'),
  action: z.enum(['approve', 'reject']).describe('Bulk action to perform')
});

const getMyApprovalsSchema = z.object({
  page: z.number().int().positive().optional().default(1).describe('Page number'),
  per_page: z.number().int().min(1).max(50).optional().default(25).describe('Items per page'),
  status: z.enum(['pending', 'approved', 'rejected']).optional()
    .describe('Filter by my approval status'),
  approvable_type: z.enum(['Leave', 'UserExtraWork', 'AssignmentRequest', 'Expense'])
    .optional().describe('Filter by request type')
});

const assignApproverSchema = z.object({
  approval_id: z.string().uuid().describe('Approval UUID'),
  user_id: z.string().uuid().describe('New approver user UUID'),
  step: z.number().int().positive().describe('Approval step to assign'),
  comment: z.string().optional().describe('Assignment reason')
});

// === TOOLS ===

export class ListApprovalsTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_list_approvals',
      description: 'List all approvals with advanced filtering and status tracking',
      category: 'approvals',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return listApprovalsSchema;
  }

  async execute(args: z.infer<typeof listApprovalsSchema>): Promise<any> {
    const validated = listApprovalsSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      let endpoint = '/api/public/v1/approvals';
      
      // Use specific endpoints for status filters
      if (validated.status) {
        switch (validated.status) {
          case 'pending':
            endpoint = '/api/public/v1/approvals/pending';
            break;
          case 'approved':
            endpoint = '/api/public/v1/approvals/approved';
            break;
          case 'rejected':
            endpoint = '/api/public/v1/approvals/rejected';
            break;
          case 'in_progress':
            endpoint = '/api/public/v1/approvals/waiting_for_approval';
            break;
        }
      }

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

      const response = await this.apiClient.get(endpoint, params);
      
      if (response.success) {
        return paginatedResponse(
          response.data,
          validated.page,
          validated.per_page,
          response.meta?.total_count || response.data.length,
          `Approvals retrieved successfully (${validated.status || 'all'})`
        );
      } else {
        return this.errorResponse('Failed to retrieve approvals', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to list approvals', error.message);
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
            description: 'Ransack query filters (e.g., {"approvable_type_eq": "Leave"})',
            additionalProperties: true
          },
          sort: {
            type: 'string',
            description: 'Sort field and direction (e.g., "created_at desc")'
          },
          status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected', 'in_progress'],
            description: 'Filter by approval status'
          }
        }
      }
    };
  }
}

export class GetApprovalTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_get_approval',
      description: 'Get detailed approval information with full workflow status',
      category: 'approvals',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return getApprovalSchema;
  }

  async execute(args: z.infer<typeof getApprovalSchema>): Promise<any> {
    const validated = getApprovalSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const response = await this.apiClient.getById('/api/public/v1/approvals', validated.id);
      
      if (response.success) {
        // Enrich response with workflow analysis
        const approval = response.data;
        const workflowAnalysis = {
          current_step: approval.current_step || 1,
          total_steps: approval.total_steps || 1,
          progress_percentage: Math.round(((approval.current_step || 1) / (approval.total_steps || 1)) * 100),
          pending_approvers: approval.approval_users?.filter((u: any) => u.status === 'pending') || [],
          completed_approvers: approval.approval_users?.filter((u: any) => u.status !== 'pending') || [],
          is_multi_step: (approval.total_steps || 1) > 1,
          can_be_fast_tracked: approval.approval_users?.every((u: any) => u.status === 'pending') || false
        };
        
        return successResponse({
          ...approval,
          workflow_analysis: workflowAnalysis
        }, 'Approval retrieved successfully');
      } else {
        return this.errorResponse('Approval not found', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to get approval', error.message);
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
            description: 'Approval UUID'
          }
        },
        required: ['id']
      }
    };
  }
}

export class ApproveRequestTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_approve_request',
      description: 'Approve a pending request with optional comment',
      category: 'approvals',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return approveRequestSchema;
  }

  async execute(args: z.infer<typeof approveRequestSchema>): Promise<any> {
    const validated = approveRequestSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const approvalData: any = {
        status: 'approved',
        comment: validated.comment
      };
      
      if (validated.approve_all_pending) {
        approvalData.approve_all_pending = true;
      }

      const response = await this.apiClient.post(
        `/api/public/v1/approvals/${validated.approval_id}/approve`,
        approvalData
      );
      
      if (response.success) {
        return successResponse(response.data, 'Request approved successfully');
      } else {
        return this.errorResponse('Failed to approve request', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to approve request', error.message);
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
          approval_id: {
            type: 'string',
            format: 'uuid',
            description: 'Approval UUID'
          },
          comment: {
            type: 'string',
            description: 'Optional approval comment'
          },
          approve_all_pending: {
            type: 'boolean',
            description: 'If true, approves all pending steps for this user',
            default: false
          }
        },
        required: ['approval_id']
      }
    };
  }
}

export class RejectRequestTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_reject_request',
      description: 'Reject a pending request with mandatory reason',
      category: 'approvals',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return rejectRequestSchema;
  }

  async execute(args: z.infer<typeof rejectRequestSchema>): Promise<any> {
    const validated = rejectRequestSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const rejectionData = {
        status: 'rejected',
        comment: validated.comment,
        reject_entire_process: validated.reject_entire_process
      };

      const response = await this.apiClient.post(
        `/api/public/v1/approvals/${validated.approval_id}/reject`,
        rejectionData
      );
      
      if (response.success) {
        return successResponse(response.data, 'Request rejected successfully');
      } else {
        return this.errorResponse('Failed to reject request', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to reject request', error.message);
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
          approval_id: {
            type: 'string',
            format: 'uuid',
            description: 'Approval UUID'
          },
          comment: {
            type: 'string',
            description: 'Required rejection reason',
            minLength: 1
          },
          reject_entire_process: {
            type: 'boolean',
            description: 'If true, rejects the entire approval process',
            default: false
          }
        },
        required: ['approval_id', 'comment']
      }
    };
  }
}

export class BulkApprovalTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_bulk_approval',
      description: 'Bulk approve or reject multiple requests at once',
      category: 'approvals',
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return bulkApprovalSchema;
  }

  async execute(args: z.infer<typeof bulkApprovalSchema>): Promise<any> {
    const validated = bulkApprovalSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const bulkData = {
        approval_ids: validated.approval_ids,
        action: validated.action,
        comment: validated.comment
      };

      const response = await this.apiClient.post(
        '/api/public/v1/approvals/bulk_action',
        bulkData
      );
      
      if (response.success) {
        const { successful, failed } = response.data;
        return successResponse({
          action: validated.action,
          total_requested: validated.approval_ids.length,
          successful_count: successful?.length || 0,
          failed_count: failed?.length || 0,
          successful_ids: successful || [],
          failed_items: failed || []
        }, `Bulk ${validated.action} completed`);
      } else {
        return this.errorResponse(`Failed to perform bulk ${validated.action}`, response.message);
      }
    } catch (error: any) {
      return this.errorResponse(`Failed to perform bulk ${validated.action}`, error.message);
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
          approval_ids: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid'
            },
            description: 'Array of approval UUIDs (max 50)',
            minItems: 1,
            maxItems: 50
          },
          comment: {
            type: 'string',
            description: 'Optional comment for all approvals'
          },
          action: {
            type: 'string',
            enum: ['approve', 'reject'],
            description: 'Bulk action to perform'
          }
        },
        required: ['approval_ids', 'action']
      }
    };
  }
}

export class GetMyApprovalsTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_get_my_approvals',
      description: 'Get approvals assigned to current user for action',
      category: 'approvals',
      permissions: {
        companyMode: false,
        userMode: true
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return getMyApprovalsSchema;
  }

  async execute(args: z.infer<typeof getMyApprovalsSchema>): Promise<any> {
    const validated = getMyApprovalsSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const params: any = {
        page: validated.page,
        per_page: validated.per_page,
        q: {
          'for_current_user_eq': true
        }
      };

      if (validated.status) {
        params.q[`approval_users_status_eq`] = validated.status;
      }

      if (validated.approvable_type) {
        params.q[`approvable_type_eq`] = validated.approvable_type;
      }

      const response = await this.apiClient.get('/api/public/v1/approvals', params);
      
      if (response.success) {
        return paginatedResponse(
          response.data,
          validated.page,
          validated.per_page,
          response.meta?.total_count || response.data.length,
          'My approvals retrieved successfully'
        );
      } else {
        return this.errorResponse('Failed to retrieve my approvals', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to get my approvals', error.message);
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
          status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected'],
            description: 'Filter by my approval status'
          },
          approvable_type: {
            type: 'string',
            enum: ['Leave', 'UserExtraWork', 'AssignmentRequest', 'Expense'],
            description: 'Filter by request type'
          }
        }
      }
    };
  }
}

export class AssignApproverTool extends BaseTool {
  constructor(apiClient: PassgageAPIClient) {
    super(apiClient);
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_assign_approver',
      description: 'Reassign an approval step to a different user',
      category: 'approvals',
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  getInputSchema(): z.ZodSchema {
    return assignApproverSchema;
  }

  async execute(args: z.infer<typeof assignApproverSchema>): Promise<any> {
    const validated = assignApproverSchema.parse(args);
    
    if (!this.apiClient) {
      return this.errorResponse('API client not initialized');
    }

    try {
      const assignmentData = {
        user_id: validated.user_id,
        step: validated.step,
        comment: validated.comment
      };

      const response = await this.apiClient.post(
        `/api/public/v1/approvals/${validated.approval_id}/assign_approver`,
        assignmentData
      );
      
      if (response.success) {
        return successResponse(response.data, 'Approver assigned successfully');
      } else {
        return this.errorResponse('Failed to assign approver', response.message);
      }
    } catch (error: any) {
      return this.errorResponse('Failed to assign approver', error.message);
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
          approval_id: {
            type: 'string',
            format: 'uuid',
            description: 'Approval UUID'
          },
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'New approver user UUID'
          },
          step: {
            type: 'number',
            description: 'Approval step to assign',
            minimum: 1
          },
          comment: {
            type: 'string',
            description: 'Assignment reason'
          }
        },
        required: ['approval_id', 'user_id', 'step']
      }
    };
  }
}