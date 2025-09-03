import { BasePrompt, PromptMetadata, PromptContext } from './index.js';

/**
 * New Employee Onboarding Prompt
 */
export class NewEmployeeOnboardingPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'new_employee_onboarding',
      description: 'Complete onboarding checklist for new employees',
      category: 'HR Workflows',
      tags: ['onboarding', 'hr', 'new-employee', 'checklist'],
      arguments: [
        {
          name: 'employee_name',
          description: 'Name of the new employee',
          required: true,
          type: 'string'
        },
        {
          name: 'department',
          description: 'Department the employee will join',
          required: false,
          type: 'string'
        },
        {
          name: 'position',
          description: 'Job position/title',
          required: false,
          type: 'string'
        },
        {
          name: 'start_date',
          description: 'Employee start date (YYYY-MM-DD)',
          required: false,
          type: 'string'
        }
      ],
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  async render(args: Record<string, any>, context?: PromptContext): Promise<string> {
    const employeeName = args.employee_name;
    const department = args.department || 'Not specified';
    const position = args.position || 'Not specified';
    const startDate = args.start_date || 'Not specified';

    let availableDepartments = '';
    let availablePositions = '';
    let systemReadiness = '';

    try {
      if (context?.currentAuth?.isAuthenticated) {
        // Get available departments
        const deptsResponse = await this.apiClient.get('/api/public/v1/departments');
        if (deptsResponse.success && (deptsResponse.data as any)?.departments) {
          availableDepartments = this.formatList(
            (deptsResponse.data as any).departments,
            (dept: any) => `${dept.name} (ID: ${dept.id}) - ${dept.description || 'No description'}`
          );
        }

        // Get available job positions
        const positionsResponse = await this.apiClient.get('/api/public/v1/job_positions');
        if (positionsResponse.success && (positionsResponse.data as any)?.job_positions) {
          availablePositions = this.formatList(
            (positionsResponse.data as any).job_positions,
            (pos: any) => `${pos.title} - ${pos.department_name || 'No department'}`
          );
        }

        // Check system readiness
        systemReadiness = `
**System Readiness Check:**
✅ Departments configured: ${deptsResponse.success ? 'Available' : 'Check required'}
✅ Job positions defined: ${positionsResponse.success ? 'Available' : 'Setup needed'}
✅ Leave types configured: Check with \`passgage_list_leave_types\`
✅ Access zones defined: Check with \`passgage_list_access_zones\``;
      }
    } catch (error) {
      availableDepartments = 'Unable to fetch departments';
      availablePositions = 'Unable to fetch positions';
    }

    return `New Employee Onboarding Checklist for ${employeeName}

**Employee Information:**
- Name: ${employeeName}
- Department: ${department}
- Position: ${position}
- Start Date: ${startDate}

${systemReadiness}

${availableDepartments ? `**Available Departments:**\n${availableDepartments}\n` : ''}
${availablePositions ? `**Available Job Positions:**\n${availablePositions}\n` : ''}

**📋 Complete Onboarding Checklist:**

## Phase 1: Pre-Arrival Setup (1-2 weeks before start date)

### 1. **User Account Creation**
- ✅ Create user profile: \`passgage_create_user\`
- ✅ Assign to department: Include department_id in user creation
- ✅ Set job position: Include job_position_id
- ✅ Configure reporting structure: Set manager relationships

### 2. **Access Management**
- ✅ Assign access zones: \`passgage_assign_zones_to_user\`
- ✅ Issue access card: \`passgage_create_card\`
- ✅ Configure device access: \`passgage_assign_devices_to_user\`
- ✅ Set working hours: Create shifts with \`passgage_create_shift\`

### 3. **Leave Entitlements**
- ✅ Set leave entitlements: Configure annual, sick, personal leave
- ✅ Define leave policies: Set accrual rules and limits
- ✅ Configure approval workflows: Set up manager approval chain

## Phase 2: First Day Setup

### 4. **System Orientation**
- ✅ Provide login credentials
- ✅ System demo and training
- ✅ Explain leave request process
- ✅ Show time tracking procedures

### 5. **Initial Documentation**
- ✅ Complete personal information
- ✅ Emergency contact details
- ✅ Banking information for payroll
- ✅ Tax declarations and forms

## Phase 3: First Week Integration

### 6. **Team Integration**
- ✅ Introduction to team members
- ✅ Assign mentor or buddy
- ✅ Schedule regular check-ins
- ✅ Provide role-specific training

### 7. **Performance Setup**
- ✅ Set initial goals and objectives
- ✅ Schedule 30/60/90 day reviews
- ✅ Define success metrics
- ✅ Create development plan

## Phase 4: First Month Monitoring

### 8. **System Usage Verification**
- ✅ Verify access card functionality
- ✅ Check time tracking compliance
- ✅ Monitor attendance patterns
- ✅ Ensure system navigation proficiency

### 9. **Feedback and Adjustment**
- ✅ Collect onboarding feedback
- ✅ Address any access issues
- ✅ Adjust permissions if needed
- ✅ Update documentation based on feedback

**🛠️ Recommended Onboarding Tools:**

**User Management:**
- \`passgage_create_user\`: Create new employee profile
- \`passgage_get_user\`: Verify profile information
- \`passgage_update_user\`: Modify details as needed

**Access Control:**
- \`passgage_list_access_zones\`: Available access areas
- \`passgage_assign_zones_to_user\`: Grant access permissions
- \`passgage_create_card\`: Issue access card
- \`passgage_assign_devices_to_user\`: Configure device access

**Leave Management:**
- \`passgage_list_leave_types\`: Available leave categories
- \`passgage_set_user_entitlement\`: Configure leave balances
- \`passgage_create_leave\`: Test leave request process

**Organization:**
- \`passgage_list_departments\`: Available departments
- \`passgage_list_job_positions\`: Available positions
- \`passgage_list_users\`: Team structure overview

**⚠️ Common Onboarding Issues:**

1. **Access Problems**: Cards not working, zones not accessible
   - Solution: Verify access zone assignments and card activation

2. **System Login Issues**: Cannot access system or features
   - Solution: Check user permissions and authentication setup

3. **Leave Balance Confusion**: Incorrect entitlements or accrual
   - Solution: Verify leave type configurations and entitlement setup

4. **Approval Workflow Problems**: Requests not routing correctly
   - Solution: Check manager assignments and approval chain setup

**📊 Onboarding Success Metrics:**
- Time to full system access: Target < 2 days
- First leave request success: Target 100%
- Onboarding completion rate: Target 100%
- Employee satisfaction score: Target > 4.5/5

Would you like me to help you create the user profile, set up access permissions, or configure any specific aspect of the onboarding process for ${employeeName}?`;
  }
}

/**
 * Employee Offboarding Prompt
 */
export class EmployeeOffboardingPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'employee_offboarding',
      description: 'Complete offboarding checklist for departing employees',
      category: 'HR Workflows',
      tags: ['offboarding', 'hr', 'departing-employee', 'checklist'],
      arguments: [
        {
          name: 'user_id',
          description: 'ID of the departing employee',
          required: true,
          type: 'number'
        },
        {
          name: 'last_day',
          description: 'Employee last working day (YYYY-MM-DD)',
          required: false,
          type: 'string'
        },
        {
          name: 'reason',
          description: 'Reason for departure (resignation, termination, retirement, etc.)',
          required: false,
          type: 'string'
        }
      ],
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  async render(args: Record<string, any>, context?: PromptContext): Promise<string> {
    const userId = args.user_id;
    const lastDay = args.last_day || 'Not specified';
    const reason = args.reason || 'Not specified';

    let employeeInfo = '';
    // let accessAudit = '';  // Unused variable
    let leaveBalance = '';
    let pendingApprovals = '';

    try {
      if (context?.currentAuth?.isAuthenticated) {
        // Get employee information
        const userResponse = await this.apiClient.get(`/api/public/v1/users/${userId}`);
        if (userResponse.success && (userResponse.data as any)?.user) {
          const user = (userResponse.data as any).user;
          employeeInfo = `
**Employee Information:**
- Name: ${user.first_name} ${user.last_name}
- Email: ${user.email}
- Employee Number: ${user.employee_number}
- Department: ${user.department_name || 'Not assigned'}
- Position: ${user.job_position_title || 'Not assigned'}
- Manager: ${user.manager_name || 'Not assigned'}`;
        }

        // Check for pending leave requests
        try {
          const leavesResponse = await this.apiClient.get('/api/public/v1/leaves', {
            q: { user_id_eq: userId, status_in: ['pending', 'approved'] }
          });
          if (leavesResponse.success && (leavesResponse.data as any)?.leaves) {
            leaveBalance = this.formatList(
              (leavesResponse.data as any).leaves,
              (leave: any) => `${leave.leave_type_name}: ${leave.start_date} to ${leave.end_date} (${leave.status})`
            );
          }
        } catch (error) {
          leaveBalance = 'Unable to fetch leave information';
        }

        // Check for pending approvals assigned to this user
        try {
          const approvalsResponse = await this.apiClient.get('/api/public/v1/approvals', {
            q: { approver_id_eq: userId, status_eq: 'pending' }
          });
          if (approvalsResponse.success && (approvalsResponse.data as any)?.approvals) {
            pendingApprovals = this.formatList(
              (approvalsResponse.data as any).approvals,
              (approval: any) => `ID ${approval.id}: ${approval.title} - ${approval.user_name}`
            );
          }
        } catch (error) {
          pendingApprovals = 'Unable to fetch pending approvals';
        }
      }
    } catch (error) {
      employeeInfo = `Unable to fetch employee information for user ID: ${userId}`;
    }

    return `Employee Offboarding Checklist

**Departure Details:**
- Employee ID: ${userId}
- Last Working Day: ${lastDay}
- Departure Reason: ${reason}

${employeeInfo}

**📋 Complete Offboarding Checklist:**

## Phase 1: Pre-Departure (1-2 weeks before last day)

### 1. **Knowledge Transfer**
- ✅ Document responsibilities and processes
- ✅ Identify critical projects and handover plans
- ✅ Schedule knowledge transfer sessions
- ✅ Update process documentation

### 2. **Access Audit**
- ✅ Review current access permissions
- ✅ Identify systems and areas requiring access revocation
- ✅ Plan staged access removal timeline
- ✅ Document access for compliance records

### 3. **Approval Responsibilities**
${pendingApprovals ? `
**⚠️ Pending Approvals Requiring Reassignment:**
${pendingApprovals}

Action: Reassign these approvals to replacement manager` : '✅ No pending approvals found'}

## Phase 2: Final Week

### 4. **Leave Balance Settlement**
${leaveBalance ? `
**Scheduled/Pending Leave:**
${leaveBalance}

Action: Review and settle leave balances according to policy` : '✅ No pending leave requests'}

### 5. **Asset Recovery**
- ✅ Collect access cards: \`passgage_list_user_cards\`
- ✅ Recover devices and equipment
- ✅ Collect company property
- ✅ Update asset inventory

### 6. **System Documentation**
- ✅ Export user activity reports
- ✅ Document access history
- ✅ Archive important communications
- ✅ Complete compliance requirements

## Phase 3: Last Working Day

### 7. **Access Revocation**
- ✅ Disable system access: \`passgage_update_user\` (set active: false)
- ✅ Revoke access zones: Remove zone assignments
- ✅ Disable access cards: Update card status
- ✅ Remove device permissions

### 8. **Final Administrative Tasks**
- ✅ Process final timesheet
- ✅ Calculate final pay and benefits
- ✅ Collect signed documents
- ✅ Provide final pay information

## Phase 4: Post-Departure (Within 1 week)

### 9. **System Cleanup**
- ✅ Archive user account (don't delete for audit trail)
- ✅ Reassign manager responsibilities
- ✅ Update organizational charts
- ✅ Clean up group memberships

### 10. **Compliance and Documentation**
- ✅ Complete HR documentation
- ✅ File departure paperwork
- ✅ Update payroll systems
- ✅ Notify relevant departments

**🛠️ Offboarding Tools:**

**User Management:**
- \`passgage_get_user\`: Review employee details
- \`passgage_update_user\`: Deactivate account
- \`passgage_list_users\`: Find replacement managers

**Access Control:**
- \`passgage_list_user_access_zones\`: Current access permissions
- \`passgage_list_user_cards\`: Access cards to recover
- \`passgage_list_user_devices\`: Device assignments

**Leave Management:**
- \`passgage_list_leaves\`: Review leave requests
- \`passgage_get_leave_balance\`: Final balance calculation
- \`passgage_cancel_leave\`: Cancel future leaves if needed

**Approval Management:**
- \`passgage_get_my_approvals\`: Pending approvals to reassign
- \`passgage_assign_approver\`: Reassign approval responsibilities

**⚠️ Critical Security Considerations:**

1. **Immediate Access Revocation**: For terminations or security concerns
2. **Staged Removal**: For resignations to allow knowledge transfer
3. **Audit Trail**: Maintain records of all access changes
4. **Emergency Access**: Ensure critical systems remain accessible

**📊 Offboarding Success Metrics:**
- Access revocation completion: Target 100%
- Asset recovery rate: Target 100%
- Knowledge transfer completion: Target 100%
- Compliance documentation: Target 100%

**⚡ Quick Actions:**
- **Emergency Offboarding**: Immediate access revocation for security
- **Standard Offboarding**: Phased approach with knowledge transfer
- **Voluntary Departure**: Extended transition with full cooperation

Would you like me to help you process the offboarding for this employee, review their current access, or handle any specific aspect of the departure process?`;
  }
}

/**
 * Team Onboarding Prompt (for bulk/team hires)
 */
export class TeamOnboardingPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'team_onboarding',
      description: 'Bulk onboarding for multiple new team members',
      category: 'HR Workflows',
      tags: ['team-onboarding', 'bulk', 'hr', 'multiple-employees'],
      arguments: [
        {
          name: 'team_size',
          description: 'Number of new employees to onboard',
          required: true,
          type: 'number'
        },
        {
          name: 'department',
          description: 'Department for the new team',
          required: true,
          type: 'string'
        },
        {
          name: 'start_date',
          description: 'Common start date for the team (YYYY-MM-DD)',
          required: false,
          type: 'string'
        }
      ],
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  async render(args: Record<string, any>, context?: PromptContext): Promise<string> {
    const teamSize = args.team_size;
    const department = args.department;
    const startDate = args.start_date || 'Not specified';

    let departmentInfo = '';
    let resourcePlanning = '';

    try {
      if (context?.currentAuth?.isAuthenticated) {
        // Get department information
        const deptsResponse = await this.apiClient.get('/api/public/v1/departments', {
          q: { name_cont: department }
        });
        
        if (deptsResponse.success && (deptsResponse.data as any)?.departments?.length > 0) {
          const dept = (deptsResponse.data as any).departments[0];
          departmentInfo = `
**Department Information:**
- Name: ${dept.name}
- Description: ${dept.description || 'No description'}
- Current Team Size: ${dept.user_count || 'Unknown'}
- Manager: ${dept.manager_name || 'Not assigned'}`;
        }

        // Calculate resource requirements
        resourcePlanning = `
**Resource Planning for ${teamSize} New Employees:**

**Equipment Requirements:**
- Access cards needed: ${teamSize}
- Workstations: ${teamSize}
- Device assignments: ${teamSize}
- Login credentials: ${teamSize}

**Administrative Load:**
- User accounts to create: ${teamSize}
- Access permissions to set: ${teamSize * 3} (estimated)
- Training sessions required: ${Math.ceil(teamSize / 5)} group sessions
- HR documentation: ${teamSize * 4} forms per person

**Timeline Estimation:**
- Pre-setup phase: ${Math.ceil(teamSize / 2)} days
- First day coordination: ${Math.ceil(teamSize / 10)} HR staff needed
- First week training: ${teamSize * 2} hours total
- Month 1 monitoring: ${Math.ceil(teamSize / 5)} check-ins per week`;
      }
    } catch (error) {
      departmentInfo = 'Unable to fetch department information';
    }

    return `Team Onboarding Plan for ${teamSize} New Employees

**Team Details:**
- Team Size: ${teamSize} employees
- Department: ${department}
- Start Date: ${startDate}

${departmentInfo}
${resourcePlanning}

**🏗️ Bulk Onboarding Strategy:**

## Pre-Arrival Phase (2-3 weeks before)

### 1. **Infrastructure Preparation**
- ✅ Batch create user accounts
- ✅ Prepare workstation assignments
- ✅ Order access cards in bulk
- ✅ Set up group permissions

### 2. **Process Optimization**
- ✅ Create onboarding templates
- ✅ Prepare bulk import data
- ✅ Design group training sessions
- ✅ Coordinate with facilities

### 3. **Team Structure Setup**
- ✅ Define reporting relationships
- ✅ Create team distribution lists
- ✅ Set up collaboration spaces
- ✅ Plan seating arrangements

## Implementation Phase

### 4. **Batch Account Creation**
\`\`\`
For each new employee:
1. Use passgage_create_user with standardized template
2. Assign to department automatically
3. Set default permissions and access
4. Generate welcome packages
\`\`\`

### 5. **Group Access Management**
- ✅ Bulk zone assignments
- ✅ Standardized device permissions
- ✅ Team-based access levels
- ✅ Department-specific restrictions

### 6. **Coordinated Training**
- ✅ Group orientation sessions
- ✅ Department-specific training
- ✅ System navigation workshops
- ✅ Policy and procedure overview

## Quality Assurance

### 7. **Batch Verification**
- ✅ Test all login credentials
- ✅ Verify access permissions
- ✅ Check system functionality
- ✅ Validate data integrity

### 8. **Progress Tracking**
- ✅ Monitor onboarding completion rates
- ✅ Track system adoption metrics
- ✅ Measure time to productivity
- ✅ Collect feedback systematically

**🛠️ Bulk Operations Tools:**

**Efficient User Management:**
- Create standardized user templates
- Use batch import procedures
- Implement consistent naming conventions
- Set up automated welcome workflows

**Access Control Templates:**
- Department-based access profiles
- Role-based permission sets
- Bulk zone assignment procedures
- Standardized device configurations

**Monitoring and Tracking:**
- Group progress dashboards
- Completion rate monitoring
- Issue tracking systems
- Performance metrics collection

**💡 Best Practices for Team Onboarding:**

1. **Standardization**: Use consistent processes and templates
2. **Automation**: Leverage bulk operations where possible
3. **Coordination**: Synchronize activities across departments
4. **Support**: Provide adequate support during transition
5. **Feedback**: Collect and act on onboarding experiences

**⏱️ Timeline Template:**

**Week -2**: Infrastructure preparation and account setup
**Week -1**: Final preparations and testing
**Day 1**: Coordinated welcome and orientation
**Week 1**: Intensive training and system familiarization
**Week 2-4**: Individual coaching and performance monitoring
**Month 2**: Performance review and adjustment

**📊 Success Metrics:**
- Account setup completion: 100% before start date
- First-day readiness: 100% system access
- Training completion: 100% within first week
- Productivity milestone: 80% within first month

**🚨 Risk Management:**
- **System Overload**: Stagger account creation to avoid system issues
- **Support Bottlenecks**: Scale support team for onboarding period  
- **Quality Control**: Implement checkpoints for each batch
- **Communication**: Ensure clear communication channels

Would you like me to help you create the bulk onboarding plan, set up user account templates, or coordinate any specific aspect of the team onboarding process?`;
  }
}