import { BasePrompt, PromptMetadata, PromptContext } from './index.js';

/**
 * Leave Request Workflow Prompt
 */
export class LeaveRequestWorkflowPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'leave_request_workflow',
      description: 'Guide through leave request process',
      category: 'HR Workflows',
      tags: ['leave', 'workflow', 'hr', 'requests'],
      arguments: [
        {
          name: 'leave_type',
          description: 'Type of leave (annual, sick, personal, etc.)',
          required: false,
          type: 'string'
        },
        {
          name: 'start_date',
          description: 'Start date of leave (YYYY-MM-DD)',
          required: false,
          type: 'string'
        },
        {
          name: 'duration',
          description: 'Duration in days',
          required: false,
          type: 'number'
        }
      ],
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  async render(args: Record<string, any>, context?: PromptContext): Promise<string> {
    const authMode = context?.currentAuth?.mode || 'unknown';
    const userName = context?.user ? `${context.user.first_name} ${context.user.last_name}` : 'User';

    let currentBalance = '';
    let availableTypes = '';

    try {
      // Try to fetch current leave balance and types
      if (context?.currentAuth?.isAuthenticated) {
        const typesResponse = await this.apiClient.get('/api/public/v1/leave_types');
        if (typesResponse.success && (typesResponse.data as any)?.leave_types) {
          availableTypes = this.formatList(
            (typesResponse.data as any).leave_types,
            (type: any) => `${type.name} (${type.code}): ${type.description || 'No description'}`
          );
        }

        if (authMode === 'user') {
          try {
            const balanceResponse = await this.apiClient.get('/api/public/v1/leaves/balance');
            if (balanceResponse.success && balanceResponse.data) {
              currentBalance = this.formatList(
                balanceResponse.data,
                (balance: any) => `${balance.leave_type_name}: ${balance.balance} days remaining`
              );
            }
          } catch (error) {
            currentBalance = 'Unable to fetch current balance';
          }
        }
      }
    } catch (error) {
      availableTypes = 'Unable to fetch leave types';
    }

    const requestDetails = args.leave_type || args.start_date || args.duration 
      ? `

**Requested Leave Details:**
- Type: ${args.leave_type || 'Not specified'}
- Start Date: ${args.start_date || 'Not specified'}
- Duration: ${args.duration ? `${args.duration} days` : 'Not specified'}` 
      : '';

    return `I need help with the leave request process for ${userName}.

**Current Context:**
- Authentication mode: ${authMode}
- User: ${userName}
${currentBalance ? `\n**Current Leave Balance:**\n${currentBalance}\n` : ''}
**Available Leave Types:**
${availableTypes}
${requestDetails}

**Leave Request Workflow Guide:**

1. **Pre-Request Planning**
   - Check current leave balance
   - Verify leave type eligibility
   - Consider blackout dates and team coverage
   - Plan handover of responsibilities

2. **Submit Leave Request**
   - Use \`passgage_create_leave\` tool
   - Provide all required information:
     - Leave type ID
     - Start and end dates
     - Reason/description
     - Emergency contact (if required)

3. **Request Processing**
   - Request goes to designated approver
   - Approver receives notification
   - System checks for conflicts and policy violations

4. **Approval Workflow**
   - Manager reviews request
   - Can approve, reject, or request modifications
   - Employee receives notification of decision

5. **Post-Approval Actions**
   - Leave is deducted from balance
   - Calendar is updated
   - Team notifications sent
   - Handover documentation filed

**Common Issues & Solutions:**
- **Insufficient balance**: Check leave type entitlements and accrual rules
- **Approval delays**: Follow up with manager or HR
- **Date conflicts**: Use calendar integration to check availability
- **Policy violations**: Review company leave policy

**Recommended Tools:**
- \`passgage_list_leave_types\`: See all available leave types
- \`passgage_get_leave_balance\`: Check current balance
- \`passgage_create_leave\`: Submit new request
- \`passgage_list_leaves\`: View request history
- \`passgage_get_leave\`: Check specific request status

Would you like me to help you submit a specific leave request or check your current balance and available types?`;
  }
}

/**
 * Leave Balance Analysis Prompt
 */
export class LeaveBalanceAnalysisPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'leave_balance_analysis',
      description: 'Analyze leave balance and utilization patterns',
      category: 'HR Analytics',
      tags: ['leave', 'balance', 'analytics', 'reporting'],
      arguments: [
        {
          name: 'user_id',
          description: 'Specific user ID to analyze (company mode only)',
          required: false,
          type: 'number'
        },
        {
          name: 'period',
          description: 'Analysis period (current_year, last_6_months, etc.)',
          required: false,
          type: 'string',
          default: 'current_year'
        }
      ],
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  async render(args: Record<string, any>, context?: PromptContext): Promise<string> {
    const authMode = context?.currentAuth?.mode || 'unknown';
    const period = args.period || 'current_year';
    const userName = context?.user ? `${context.user.first_name} ${context.user.last_name}` : 'User';

    let balanceData = '';
    let leaveHistory = '';
    let recommendations = '';

    try {
      if (context?.currentAuth?.isAuthenticated) {
        // Get balance data
        if (authMode === 'user') {
          const balanceResponse = await this.apiClient.get('/api/public/v1/leaves/balance');
          if (balanceResponse.success && balanceResponse.data) {
            balanceData = this.formatList(
              balanceResponse.data,
              (balance: any) => `${balance.leave_type_name}: ${balance.balance} days (Used: ${balance.used || 0}, Accrued: ${balance.accrued || 0})`
            );
          }

          // Get leave history
          const historyResponse = await this.apiClient.get('/api/public/v1/leaves', {
            per_page: 10,
            q: { created_at_gteq: `${new Date().getFullYear()}-01-01` }
          });
          if (historyResponse.success && (historyResponse.data as any)?.leaves) {
            leaveHistory = this.formatList(
              (historyResponse.data as any).leaves,
              (leave: any) => `${leave.leave_type_name}: ${leave.start_date} to ${leave.end_date} (${leave.status})`
            );
          }
        } else if (authMode === 'company' && args.user_id) {
          const userResponse = await this.apiClient.get(`/api/public/v1/users/${args.user_id}`);
          if (userResponse.success) {
            balanceData = `Analyzing balance for: ${(userResponse.data as any).user.first_name} ${(userResponse.data as any).user.last_name}`;
          }
        }

        // Generate recommendations based on balance data
        recommendations = `
**📊 Balance Utilization Analysis:**
- Track patterns in leave usage
- Identify peak leave periods
- Monitor balance expiration dates
- Plan future leave requests

**🎯 Recommendations:**
- Use leave balance before expiration
- Plan longer breaks during low-activity periods
- Maintain emergency leave reserve
- Consider leave scheduling with team calendar`;
      }
    } catch (error) {
      balanceData = 'Unable to fetch balance data';
    }

    return `Leave Balance Analysis Report for ${userName}

**Analysis Period:** ${period}
**Authentication Mode:** ${authMode}

${balanceData ? `**Current Leave Balance:**\n${balanceData}\n` : ''}
${leaveHistory ? `**Recent Leave History:**\n${leaveHistory}\n` : ''}
${recommendations}

**Key Metrics to Monitor:**

1. **Utilization Rate**
   - Percentage of available leave used
   - Comparison with team/company averages
   - Seasonal usage patterns

2. **Balance Trends**
   - Monthly accrual vs usage
   - Year-over-year comparison
   - Expiration risk assessment

3. **Request Patterns**
   - Preferred leave types
   - Typical duration of requests
   - Approval success rate

**Actionable Insights:**

- **Underutilization**: Consider encouraging leave usage for work-life balance
- **Overutilization**: Monitor for policy compliance and balance management
- **Pattern Analysis**: Identify optimal times for extended leave
- **Team Planning**: Coordinate leave schedules to ensure coverage

**Available Tools for Deep Analysis:**
- \`passgage_list_leaves\`: Get detailed leave history
- \`passgage_get_leave_balance\`: Current balance breakdown
- \`passgage_advanced_search\`: Custom leave queries
- \`passgage_export_data\`: Export for external analysis

Would you like me to run specific queries or generate detailed reports on any aspect of the leave balance analysis?`;
  }
}

/**
 * Leave Approval Management Prompt
 */
export class LeaveApprovalManagementPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'leave_approval_management',
      description: 'Manage leave approval workflows and pending requests',
      category: 'Management',
      tags: ['leave', 'approval', 'management', 'workflow'],
      arguments: [
        {
          name: 'filter',
          description: 'Filter criteria (pending, urgent, overdue, etc.)',
          required: false,
          type: 'string',
          default: 'pending'
        }
      ],
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  async render(args: Record<string, any>, context?: PromptContext): Promise<string> {
    const filter = args.filter || 'pending';
    let pendingApprovals = '';
    // let urgentRequests = '';  // Unused variable
    let statistics = '';

    try {
      if (context?.currentAuth?.isAuthenticated) {
        // Get pending leave approvals
        const approvalsResponse = await this.apiClient.get('/api/public/v1/approvals', {
          per_page: 20,
          q: { 
            status_eq: 'pending',
            approvable_type_eq: 'Leave'
          }
        });

        if (approvalsResponse.success && (approvalsResponse.data as any)?.approvals) {
          pendingApprovals = this.formatList(
            (approvalsResponse.data as any).approvals,
            (approval: any) => {
              const daysWaiting = Math.floor((Date.now() - new Date(approval.created_at).getTime()) / (1000 * 60 * 60 * 24));
              return `ID ${approval.id}: ${approval.user_name} - ${approval.title} (Waiting: ${daysWaiting} days)`;
            }
          );

          // Generate statistics
          const total = (approvalsResponse.data as any).approvals.length;
          const urgent = (approvalsResponse.data as any).approvals.filter((a: any) => {
            const daysWaiting = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
            return daysWaiting > 3;
          }).length;

          statistics = `
**Approval Statistics:**
- Total pending: ${total}
- Urgent (>3 days): ${urgent}
- Average waiting time: ${total > 0 ? Math.round((approvalsResponse.data as any).approvals.reduce((sum: number, a: any) => {
            return sum + Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
          }, 0) / total) : 0} days`;
        }
      }
    } catch (error) {
      pendingApprovals = 'Unable to fetch pending approvals';
    }

    return `Leave Approval Management Dashboard

**Filter:** ${filter.charAt(0).toUpperCase() + filter.slice(1)} requests
${statistics}

${pendingApprovals ? `**Pending Leave Approvals:**\n${pendingApprovals}\n` : ''}

**Approval Management Workflow:**

1. **Review Process**
   - Check employee leave balance
   - Verify dates and duration
   - Assess team coverage impact
   - Review company policy compliance

2. **Decision Making**
   - Consider business impact
   - Check blackout periods
   - Evaluate staffing levels
   - Review historical patterns

3. **Action Options**
   - ✅ **Approve**: Use \`passgage_approve_request\`
   - ❌ **Reject**: Use \`passgage_reject_request\` with reason
   - 📝 **Request Changes**: Add comments and request modifications
   - 📋 **Bulk Actions**: Use \`passgage_bulk_approval\` for multiple requests

**Best Practices:**

- **Timeliness**: Respond to requests within 2-3 business days
- **Consistency**: Apply policies fairly across all employees
- **Communication**: Provide clear reasons for rejections
- **Documentation**: Keep records of approval decisions

**Quick Actions:**

- **Review Urgent**: Check requests older than 3 days
- **Team Coverage**: Ensure adequate staffing during approved leaves
- **Policy Check**: Verify compliance with leave policies
- **Bulk Processing**: Handle multiple similar requests together

**Management Tools:**
- \`passgage_list_approvals\`: View all pending requests
- \`passgage_get_approval\`: Review specific request details
- \`passgage_approve_request\`: Approve individual requests
- \`passgage_bulk_approval\`: Process multiple requests
- \`passgage_get_my_approvals\`: Your approval queue

**Escalation Guidelines:**
- Complex requests: Consult HR department
- Policy questions: Review employee handbook
- Coverage issues: Coordinate with team leads
- Unusual circumstances: Document decisions thoroughly

Would you like me to help you process specific approvals or analyze approval patterns?`;
  }
}