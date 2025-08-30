import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PassgageAPIClient } from '../api/client.js';

export function createSpecializedTools(): Tool[] {
  return [
    {
      name: 'passgage_upload_file',
      description: 'Upload a file to Passgage using presigned URL',
      inputSchema: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'Name of the file to upload'
          },
          content_type: {
            type: 'string',
            description: 'MIME type of the file (e.g., image/jpeg, application/pdf)'
          },
          file_data: {
            type: 'string',
            description: 'Base64 encoded file data or file path'
          },
          purpose: {
            type: 'string',
            description: 'Purpose of the file upload (optional)',
            enum: ['profile_photo', 'document', 'attachment', 'report']
          }
        },
        required: ['filename', 'content_type', 'file_data']
      }
    },
    {
      name: 'passgage_approve_request',
      description: 'Approve or reject a pending approval request',
      inputSchema: {
        type: 'object',
        properties: {
          approval_id: {
            type: 'string',
            description: 'UUID of the approval request'
          },
          action: {
            type: 'string',
            description: 'Action to take on the approval',
            enum: ['approve', 'reject']
          },
          notes: {
            type: 'string',
            description: 'Optional notes for the approval decision'
          }
        },
        required: ['approval_id', 'action']
      }
    },
    {
      name: 'passgage_bulk_approve',
      description: 'Approve or reject multiple approval requests at once',
      inputSchema: {
        type: 'object',
        properties: {
          approval_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of approval request UUIDs'
          },
          action: {
            type: 'string',
            description: 'Action to take on all approvals',
            enum: ['approve', 'reject']
          },
          notes: {
            type: 'string',
            description: 'Optional notes for all approval decisions'
          }
        },
        required: ['approval_ids', 'action']
      }
    },
    {
      name: 'passgage_assign_user_to_shift',
      description: 'Assign a user to a specific shift',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'UUID of the user to assign'
          },
          shift_id: {
            type: 'string',
            description: 'UUID of the shift'
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Date for the shift assignment (YYYY-MM-DD)'
          },
          branch_id: {
            type: 'string',
            description: 'UUID of the branch (optional)'
          }
        },
        required: ['user_id', 'shift_id', 'date']
      }
    },
    {
      name: 'passgage_track_entrance',
      description: 'Record an entrance/exit event for a user',
      inputSchema: {
        type: 'object',
        properties: {
          user_id: {
            type: 'string',
            description: 'UUID of the user'
          },
          device_id: {
            type: 'string',
            description: 'UUID of the device recording the entrance'
          },
          entrance_type: {
            type: 'string',
            description: 'Type of entrance event',
            enum: ['entry', 'exit']
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp of the entrance (ISO 8601 format)'
          }
        },
        required: ['user_id', 'device_id', 'entrance_type']
      }
    },
    {
      name: 'passgage_search',
      description: 'Universal search across multiple Passgage resources',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term to look for'
          },
          resources: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['users', 'branches', 'departments', 'devices', 'leaves', 'approvals']
            },
            description: 'List of resources to search in (default: all)'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results per resource type (max: 25)',
            minimum: 1,
            maximum: 25
          }
        },
        required: ['query']
      }
    },
    {
      name: 'passgage_export_data',
      description: 'Export data in various formats (CSV, JSON, Excel)',
      inputSchema: {
        type: 'object',
        properties: {
          resource: {
            type: 'string',
            description: 'Resource type to export',
            enum: ['users', 'leaves', 'entrances', 'payrolls', 'approvals']
          },
          format: {
            type: 'string',
            description: 'Export format',
            enum: ['csv', 'json', 'excel']
          },
          date_range: {
            type: 'object',
            properties: {
              start_date: {
                type: 'string',
                format: 'date',
                description: 'Start date for data export (YYYY-MM-DD)'
              },
              end_date: {
                type: 'string',
                format: 'date',
                description: 'End date for data export (YYYY-MM-DD)'
              }
            }
          },
          filters: {
            type: 'object',
            description: 'Additional filters to apply',
            additionalProperties: true
          }
        },
        required: ['resource', 'format']
      }
    },
    {
      name: 'passgage_get_dashboard_stats',
      description: 'Get dashboard statistics and key metrics',
      inputSchema: {
        type: 'object',
        properties: {
          date_range: {
            type: 'string',
            description: 'Time period for statistics',
            enum: ['today', 'week', 'month', 'quarter', 'year']
          },
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['active_users', 'pending_approvals', 'total_leaves', 'entrances_today', 'late_arrivals']
            },
            description: 'Specific metrics to retrieve (default: all)'
          }
        }
      }
    }
  ];
}

function checkSpecializedToolPermission(toolName: string, client: PassgageAPIClient): { allowed: boolean; reason?: string } {
  const authMode = client.getAuthMode();
  
  if (authMode === 'none') {
    return { allowed: false, reason: 'Not authenticated. Please login or set API key first.' };
  }

  // Define permission rules for specialized tools
  const specializedPermissions: Record<string, { companyMode: boolean; userMode: boolean; description?: string }> = {
    'passgage_upload_file': { companyMode: true, userMode: true, description: 'File upload available in both modes' },
    'passgage_approve_request': { companyMode: true, userMode: false, description: 'Approving requests requires admin privileges' },
    'passgage_bulk_approve': { companyMode: true, userMode: false, description: 'Bulk operations require admin privileges' },
    'passgage_assign_user_to_shift': { companyMode: true, userMode: false, description: 'Assigning users requires admin privileges' },
    'passgage_track_entrance': { companyMode: true, userMode: true, description: 'Entrance tracking available in both modes' },
    'passgage_search': { companyMode: true, userMode: true, description: 'Search available in both modes' },
    'passgage_export_data': { companyMode: true, userMode: false, description: 'Data export requires admin privileges' },
    'passgage_get_dashboard_stats': { companyMode: true, userMode: true, description: 'Dashboard stats available in both modes' }
  };

  const permission = specializedPermissions[toolName];
  if (!permission) {
    // Default: allow both modes for unknown tools
    return { allowed: true };
  }

  const allowed = (authMode === 'company' && permission.companyMode) || 
                  (authMode === 'user' && permission.userMode);
  
  if (!allowed) {
    const reason = authMode === 'user' 
      ? `This operation requires company-level access. ${permission.description || ''}`
      : `This operation is not available in ${authMode} mode.`;
    return { allowed: false, reason };
  }

  return { allowed: true };
}

export async function handleSpecializedTool(
  name: string,
  args: any,
  client: PassgageAPIClient
): Promise<any> {
  // Check authentication and permissions
  const permissionCheck = checkSpecializedToolPermission(name, client);
  if (!permissionCheck.allowed) {
    throw new Error(permissionCheck.reason || 'Access denied');
  }

  try {
    switch (name) {
      case 'passgage_upload_file': {
        // First request presigned URL
        const uploadRequest = await client.post('/api/public/v1/file_uploads', {
          filename: args.filename,
          content_type: args.content_type,
          purpose: args.purpose
        });

        return {
          success: uploadRequest.success,
          message: 'File upload initiated',
          data: uploadRequest.data,
          // Note: In a real implementation, you would upload the file to the presigned URL
          upload_url: uploadRequest.data?.presigned_url,
          file_id: uploadRequest.data?.id
        };
      }

      case 'passgage_approve_request': {
        const endpoint = `/api/public/v1/approvals/${args.approval_id}/${args.action}`;
        const result = await client.post(endpoint, {
          notes: args.notes
        });

        return {
          success: result.success,
          message: `Request ${args.action}d successfully`,
          data: result.data
        };
      }

      case 'passgage_bulk_approve': {
        const results = [];
        for (const approvalId of args.approval_ids) {
          try {
            const endpoint = `/api/public/v1/approvals/${approvalId}/${args.action}`;
            const result = await client.post(endpoint, {
              notes: args.notes
            });
            results.push({ id: approvalId, success: true, data: result.data });
          } catch (error: any) {
            results.push({ id: approvalId, success: false, error: error.message });
          }
        }

        const successCount = results.filter(r => r.success).length;
        return {
          success: successCount > 0,
          message: `${successCount}/${args.approval_ids.length} approvals processed successfully`,
          results
        };
      }

      case 'passgage_assign_user_to_shift': {
        const result = await client.post('/api/public/v1/user_shifts', {
          user_id: args.user_id,
          shift_id: args.shift_id,
          date: args.date,
          branch_id: args.branch_id
        });

        return {
          success: result.success,
          message: 'User assigned to shift successfully',
          data: result.data
        };
      }

      case 'passgage_track_entrance': {
        const result = await client.post('/api/public/v1/entrances', {
          user_id: args.user_id,
          device_id: args.device_id,
          entrance_type: args.entrance_type,
          timestamp: args.timestamp || new Date().toISOString()
        });

        return {
          success: result.success,
          message: `${args.entrance_type} recorded successfully`,
          data: result.data
        };
      }

      case 'passgage_search': {
        const resources = args.resources || ['users', 'branches', 'departments', 'devices', 'leaves', 'approvals'];
        const limit = Math.min(args.limit || 10, 25);
        const searchResults: any = {};

        for (const resource of resources) {
          try {
            const result = await client.get(`/api/public/v1/${resource}`, {
              per_page: limit,
              q: {
                name_cont: args.query,
                email_cont: args.query,
                description_cont: args.query
              }
            });
            searchResults[resource] = result.data || [];
          } catch (error: any) {
            searchResults[resource] = { error: error.message };
          }
        }

        const totalResults = Object.values(searchResults)
          .filter(results => Array.isArray(results))
          .reduce((sum: number, results: any) => sum + results.length, 0);

        return {
          success: true,
          message: `Found ${totalResults} results for "${args.query}"`,
          query: args.query,
          results: searchResults,
          total_count: totalResults
        };
      }

      case 'passgage_export_data': {
        const queryParams = {
          format: args.format,
          ...args.filters
        };

        if (args.date_range) {
          queryParams['q[created_at_gteq]'] = args.date_range.start_date;
          queryParams['q[created_at_lteq]'] = args.date_range.end_date;
        }

        const result = await client.get(`/api/public/v1/${args.resource}/export`, queryParams);

        return {
          success: result.success,
          message: `${args.resource} data exported successfully`,
          format: args.format,
          data: result.data
        };
      }

      case 'passgage_get_dashboard_stats': {
        const metrics = args.metrics || ['active_users', 'pending_approvals', 'total_leaves', 'entrances_today', 'late_arrivals'];
        const dateRange = args.date_range || 'today';
        
        const result = await client.get('/api/public/v1/dashboard/stats', {
          date_range: dateRange,
          metrics: metrics.join(',')
        });

        return {
          success: result.success,
          message: 'Dashboard statistics retrieved successfully',
          date_range: dateRange,
          data: result.data
        };
      }

      default:
        throw new Error(`Unknown specialized tool: ${name}`);
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      tool: name
    };
  }
}