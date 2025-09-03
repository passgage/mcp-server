import { BasePrompt, PromptMetadata, PromptContext } from './index.js';

/**
 * Department Performance Analytics Prompt
 */
export class DepartmentPerformanceAnalyticsPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'department_performance_analytics',
      description: 'Analyze department performance metrics and KPIs',
      category: 'Analytics',
      tags: ['analytics', 'department', 'performance', 'kpi'],
      arguments: [
        {
          name: 'department_id',
          description: 'Department ID to analyze',
          required: false,
          type: 'number'
        },
        {
          name: 'period',
          description: 'Analysis period (current_month, last_quarter, current_year)',
          required: false,
          type: 'string',
          default: 'current_month'
        },
        {
          name: 'metrics',
          description: 'Specific metrics to focus on (attendance, leave_usage, productivity)',
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
    const departmentId = args.department_id;
    const period = args.period || 'current_month';
    const metrics = args.metrics || 'all';

    let departmentInfo = '';
    let teamStructure = '';
    let performanceMetrics = '';
    let leaveAnalysis = '';
    let recommendations = '';

    try {
      if (context?.currentAuth?.isAuthenticated) {
        // Get department information
        if (departmentId) {
          const deptResponse = await this.apiClient.get(`/api/public/v1/departments/${departmentId}`);
          if (deptResponse.success && (deptResponse.data as any)?.department) {
            const dept = (deptResponse.data as any).department;
            departmentInfo = `
**Department Profile:**
- Name: ${dept.name}
- Description: ${dept.description || 'No description'}
- Manager: ${dept.manager_name || 'Not assigned'}
- Total Employees: ${dept.user_count || 'Unknown'}
- Created: ${dept.created_at ? new Date(dept.created_at).toLocaleDateString() : 'Unknown'}`;

            // Get team members
            const usersResponse = await this.apiClient.get('/api/public/v1/users', {
              q: { department_id_eq: departmentId },
              per_page: 50
            });
            
            if (usersResponse.success && (usersResponse.data as any)?.users) {
              teamStructure = `
**Team Structure (${(usersResponse.data as any).users.length} members):**
${this.formatList((usersResponse.data as any).users, (user: any) => 
  `${user.first_name} ${user.last_name} - ${user.job_position_title || 'No position'} (${user.is_active ? 'Active' : 'Inactive'})`
)}`;

              // Analyze leave patterns for the department
              const currentYear = new Date().getFullYear();
              const leavesResponse = await this.apiClient.get('/api/public/v1/leaves', {
                q: { 
                  created_at_gteq: `${currentYear}-01-01`,
                  user_id_in: (usersResponse.data as any).users.map((u: any) => u.id)
                },
                per_page: 100
              });

              if (leavesResponse.success && (leavesResponse.data as any)?.leaves) {
                const leaves = (leavesResponse.data as any).leaves;
                const totalLeaves = leaves.length;
                const approvedLeaves = leaves.filter((l: any) => l.status === 'approved').length;
                const pendingLeaves = leaves.filter((l: any) => l.status === 'pending').length;
                const rejectedLeaves = leaves.filter((l: any) => l.status === 'rejected').length;

                leaveAnalysis = `
**Leave Analytics (${period}):**
- Total Leave Requests: ${totalLeaves}
- Approved: ${approvedLeaves} (${totalLeaves > 0 ? Math.round((approvedLeaves/totalLeaves)*100) : 0}%)
- Pending: ${pendingLeaves} (${totalLeaves > 0 ? Math.round((pendingLeaves/totalLeaves)*100) : 0}%)
- Rejected: ${rejectedLeaves} (${totalLeaves > 0 ? Math.round((rejectedLeaves/totalLeaves)*100) : 0}%)
- Average per Employee: ${(usersResponse.data as any).users.length > 0 ? (totalLeaves/(usersResponse.data as any).users.length).toFixed(1) : 0} requests`;
              }
            }
          }
        } else {
          // Get all departments for comparison
          const deptsResponse = await this.apiClient.get('/api/public/v1/departments');
          if (deptsResponse.success && (deptsResponse.data as any)?.departments) {
            departmentInfo = `
**All Departments Overview:**
${this.formatList((deptsResponse.data as any).departments, (dept: any) => 
  `${dept.name}: ${dept.user_count || 0} employees - Manager: ${dept.manager_name || 'Not assigned'}`
)}`;
          }
        }

        // Generate performance recommendations
        recommendations = `
**📊 Performance Insights:**

1. **Attendance Patterns**
   - Monitor regular attendance trends
   - Identify peak absence periods
   - Track overtime patterns

2. **Leave Management**
   - Balance utilization vs business needs
   - Identify seasonal patterns
   - Plan for coverage during peak periods

3. **Team Productivity**
   - Measure project completion rates
   - Track goal achievement
   - Monitor workload distribution

4. **Employee Engagement**
   - Survey satisfaction levels
   - Track retention rates
   - Monitor career development progress

**🎯 Action Recommendations:**
- Schedule regular team performance reviews
- Implement cross-training programs
- Optimize work allocation based on patterns
- Address any identified bottlenecks or issues`;

        performanceMetrics = `
**Key Performance Indicators:**

**Operational Metrics:**
- Team Utilization Rate: Calculate based on active vs planned capacity
- Project Completion Rate: Track deliverable success rates  
- Resource Allocation Efficiency: Monitor workload distribution

**HR Metrics:**
- Employee Retention Rate: Track departure patterns
- Leave Utilization Rate: Balance vs policy limits
- Training Completion Rate: Skills development progress

**Quality Metrics:**
- Performance Review Scores: Track individual and team performance
- Goal Achievement Rate: Measure objective completion
- Client/Internal Satisfaction: Feedback and ratings`;
      }
    } catch (error) {
      departmentInfo = 'Unable to fetch department information';
    }

    return `Department Performance Analytics Report

**Analysis Parameters:**
- Department: ${departmentId ? `ID ${departmentId}` : 'All Departments'}
- Period: ${period.replace('_', ' ').toUpperCase()}
- Focus: ${metrics.charAt(0).toUpperCase() + metrics.slice(1)} metrics

${departmentInfo}
${teamStructure}
${leaveAnalysis}
${performanceMetrics}
${recommendations}

**📈 Advanced Analytics Available:**

**Attendance Analysis:**
- Daily/weekly attendance patterns
- Overtime trends and distribution
- Late arrival and early departure tracking
- Remote vs office work patterns

**Leave Pattern Analysis:**
- Seasonal leave trends
- Leave type preferences
- Approval turnaround times
- Balance utilization patterns

**Productivity Metrics:**
- Task completion rates
- Project delivery timelines  
- Resource utilization efficiency
- Cross-training effectiveness

**Team Dynamics:**
- Communication patterns
- Collaboration effectiveness
- Knowledge sharing frequency
- Mentor-mentee relationships

**🛠️ Analytics Tools:**

**Data Collection:**
- \`passgage_list_users\`: Get team composition
- \`passgage_list_leaves\`: Analyze leave patterns  
- \`passgage_list_approvals\`: Review approval workflows
- \`passgage_advanced_search\`: Custom data queries

**Reporting:**
- \`passgage_export_data\`: Export for external analysis
- \`passgage_dashboard_stats\`: Real-time metrics
- Custom reports via advanced search queries

**📊 Comparative Analysis:**

Compare this department's performance with:
- Company-wide averages
- Industry benchmarks
- Historical performance
- Similar-sized departments

**🔄 Continuous Improvement Process:**

1. **Monthly Reviews**: Track short-term trends and issues
2. **Quarterly Assessments**: Evaluate goal progress and strategy
3. **Annual Planning**: Set targets and resource allocation
4. **Continuous Monitoring**: Real-time dashboard tracking

**⚡ Quick Insights:**
- Identify top performers for recognition
- Spot potential issues early
- Optimize resource allocation
- Plan succession and development

Would you like me to dive deeper into any specific aspect of the department analytics, generate detailed reports, or set up ongoing monitoring for specific metrics?`;
  }
}

/**
 * Team Workload Analysis Prompt
 */
export class TeamWorkloadAnalysisPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'team_workload_analysis',
      description: 'Analyze team workload distribution and capacity planning',
      category: 'Analytics',
      tags: ['workload', 'capacity', 'team', 'planning'],
      arguments: [
        {
          name: 'department_id',
          description: 'Department ID to analyze',
          required: false,
          type: 'number'
        },
        {
          name: 'time_period',
          description: 'Analysis time period (week, month, quarter)',
          required: false,
          type: 'string',
          default: 'month'
        }
      ],
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  async render(args: Record<string, any>, context?: PromptContext): Promise<string> {
    const departmentId = args.department_id;
    const timePeriod = args.time_period || 'month';

    let teamInfo = '';
    let workloadMetrics = '';
    let capacityAnalysis = '';
    let recommendations = '';

    try {
      if (context?.currentAuth?.isAuthenticated) {
        // Get team information
        if (departmentId) {
          const deptResponse = await this.apiClient.get(`/api/public/v1/departments/${departmentId}`);
          if (deptResponse.success && (deptResponse.data as any)?.department) {
            const dept = (deptResponse.data as any).department;
            
            // Get team members with their shifts
            const usersResponse = await this.apiClient.get('/api/public/v1/users', {
              q: { department_id_eq: departmentId, is_active_eq: true },
              per_page: 50
            });
            
            if (usersResponse.success && (usersResponse.data as any)?.users) {
              const activeUsers = (usersResponse.data as any).users;
              teamInfo = `
**Team Overview:**
- Department: ${dept.name}
- Active Team Members: ${activeUsers.length}
- Manager: ${dept.manager_name || 'Not assigned'}

**Team Composition:**
${this.formatList(activeUsers, (user: any) => 
  `${user.first_name} ${user.last_name} - ${user.job_position_title || 'No position'}`
)}`;

              // Analyze current workload distribution
              const currentDate = new Date();
              const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
              
              // Get shifts for workload analysis
              const shiftsResponse = await this.apiClient.get('/api/public/v1/user_shifts', {
                q: { 
                  user_id_in: activeUsers.map((u: any) => u.id),
                  start_date_gteq: startDate
                },
                per_page: 200
              });

              if (shiftsResponse.success && (shiftsResponse.data as any)?.user_shifts) {
                const shifts = (shiftsResponse.data as any).user_shifts;
                const totalShifts = shifts.length;
                const averageShiftsPerUser = activeUsers.length > 0 ? (totalShifts / activeUsers.length).toFixed(1) : 0;

                workloadMetrics = `
**Workload Metrics (Current ${timePeriod}):**
- Total Scheduled Shifts: ${totalShifts}
- Average Shifts per Employee: ${averageShiftsPerUser}
- Shift Distribution Analysis:
${this.formatList(activeUsers.map((user: any) => {
  const userShifts = shifts.filter((s: any) => s.user_id === user.id);
  return { name: `${user.first_name} ${user.last_name}`, shifts: userShifts.length };
}), (item: any) => `${item.name}: ${item.shifts} shifts`)}`;
              }

              // Get leave data for capacity planning
              const leavesResponse = await this.apiClient.get('/api/public/v1/leaves', {
                q: { 
                  user_id_in: activeUsers.map((u: any) => u.id),
                  status_in: ['approved', 'pending'],
                  start_date_gteq: startDate
                },
                per_page: 100
              });

              if (leavesResponse.success && (leavesResponse.data as any)?.leaves) {
                const leaves = (leavesResponse.data as any).leaves;
                const upcomingLeaves = leaves.filter((l: any) => new Date(l.start_date) >= currentDate);
                
                capacityAnalysis = `
**Capacity Impact Analysis:**
- Upcoming Leave Requests: ${upcomingLeaves.length}
- Affected Team Members: ${new Set(upcomingLeaves.map((l: any) => l.user_id)).size}
- Estimated Days Out: ${upcomingLeaves.reduce((sum: number, l: any) => {
  const start = new Date(l.start_date);
  const end = new Date(l.end_date);
  return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}, 0)} total days

**Critical Leave Periods:**
${upcomingLeaves.length > 0 ? this.formatList(upcomingLeaves, (leave: any) => 
  `${leave.user_name}: ${leave.start_date} to ${leave.end_date} (${leave.leave_type_name})`
) : 'No upcoming leaves scheduled'}`;
              }
            }
          }
        }

        recommendations = `
**📊 Workload Optimization Recommendations:**

1. **Capacity Management**
   - Monitor peak demand periods
   - Plan for seasonal fluctuations
   - Maintain adequate coverage ratios
   - Cross-train team members for flexibility

2. **Resource Allocation**
   - Balance workload across team members
   - Identify over/under-utilized resources
   - Plan for skill development needs
   - Optimize shift scheduling

3. **Risk Mitigation**
   - Plan for unexpected absences
   - Maintain backup coverage plans
   - Monitor employee burnout indicators
   - Implement workload rotation policies

**🎯 Strategic Actions:**
- Develop capacity forecasting models
- Create flexible staffing arrangements
- Implement workload monitoring systems
- Establish performance benchmarks`;
      }
    } catch (error) {
      teamInfo = 'Unable to fetch team information';
    }

    return `Team Workload Analysis Report

**Analysis Scope:**
- Department: ${departmentId ? `ID ${departmentId}` : 'All Departments'}
- Time Period: ${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}
- Analysis Date: ${new Date().toLocaleDateString()}

${teamInfo}
${workloadMetrics}
${capacityAnalysis}
${recommendations}

**📈 Workload Distribution Analysis:**

**Current State Assessment:**
- **Overloaded Resources**: Team members with excessive workload
- **Underutilized Resources**: Team members with capacity for additional work
- **Balanced Resources**: Team members with optimal workload distribution
- **Critical Dependencies**: Single points of failure or expertise

**Capacity Planning Factors:**

1. **Scheduled Work Hours**
   - Regular shift patterns
   - Overtime requirements
   - Peak period adjustments
   - Holiday coverage needs

2. **Available Capacity**
   - Active team members
   - Skill availability
   - Cross-training coverage
   - External resource needs

3. **Demand Forecasting**
   - Historical workload patterns
   - Seasonal variations
   - Business growth projections
   - Market demand changes

**⚖️ Workload Balance Strategies:**

**Short-term Adjustments:**
- Redistribute current assignments
- Adjust shift schedules
- Implement temporary support
- Prioritize critical tasks

**Medium-term Planning:**
- Cross-train team members
- Adjust team composition
- Optimize process efficiency
- Plan skill development

**Long-term Strategy:**
- Hire additional resources
- Invest in automation
- Restructure workflows
- Develop succession plans

**🔧 Workload Management Tools:**

**Monitoring:**
- \`passgage_list_user_shifts\`: Current shift assignments
- \`passgage_list_leaves\`: Absence planning
- \`passgage_list_users\`: Team capacity overview
- \`passgage_advanced_search\`: Custom workload queries

**Planning:**
- \`passgage_create_user_shift\`: Assign new shifts
- \`passgage_assign_shift_to_users\`: Bulk shift assignment
- \`passgage_get_user_shift_conflicts\`: Identify scheduling issues
- Capacity modeling and forecasting tools

**📊 Key Performance Indicators:**

**Utilization Metrics:**
- Team utilization rate (%)
- Individual capacity usage
- Overtime hours and costs
- Productivity per team member

**Balance Metrics:**
- Workload distribution variance
- Peak vs average utilization
- Cross-training coverage ratio
- Skill redundancy factor

**Quality Metrics:**
- Error rates during high workload
- Customer satisfaction scores
- Project delivery timeliness
- Employee satisfaction levels

**⚡ Action Items:**

**Immediate (This Week):**
- Identify current workload imbalances
- Address critical coverage gaps
- Prioritize urgent tasks and projects
- Communicate workload expectations

**Short-term (This Month):**
- Implement workload redistribution
- Schedule cross-training sessions
- Adjust shift patterns as needed
- Monitor progress and feedback

**Long-term (This Quarter):**
- Develop capacity planning model
- Implement systematic workload monitoring
- Plan team expansion or optimization
- Create sustainable workload policies

Would you like me to analyze specific aspects of the workload distribution, create detailed capacity plans, or help optimize the current resource allocation?`;
  }
}

/**
 * Department Comparison Analysis Prompt
 */
export class DepartmentComparisonPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'department_comparison',
      description: 'Compare performance and metrics across multiple departments',
      category: 'Analytics',
      tags: ['comparison', 'departments', 'benchmarking', 'analytics'],
      arguments: [
        {
          name: 'metric_focus',
          description: 'Primary metric to compare (productivity, attendance, leave_usage, etc.)',
          required: false,
          type: 'string',
          default: 'overall'
        },
        {
          name: 'time_period',
          description: 'Comparison period (month, quarter, year)',
          required: false,
          type: 'string',
          default: 'quarter'
        }
      ],
      permissions: {
        companyMode: true,
        userMode: false
      }
    };
  }

  async render(args: Record<string, any>, context?: PromptContext): Promise<string> {
    const metricFocus = args.metric_focus || 'overall';
    const timePeriod = args.time_period || 'quarter';

    let departmentComparison = '';
    let performanceRankings = '';
    let insights = '';

    try {
      if (context?.currentAuth?.isAuthenticated) {
        // Get all departments
        const deptsResponse = await this.apiClient.get('/api/public/v1/departments');
        if (deptsResponse.success && (deptsResponse.data as any)?.departments) {
          const departments = (deptsResponse.data as any).departments;
          
          departmentComparison = `
**Department Overview (${departments.length} departments):**
${this.formatList(departments, (dept: any) => 
  `${dept.name}: ${dept.user_count || 0} employees - ${dept.description || 'No description'}`
)}`;

          // Calculate comparison metrics for each department
          const currentYear = new Date().getFullYear();
          const comparisonData = [];

          for (const dept of departments) {
            try {
              // Get users for this department
              const usersResponse = await this.apiClient.get('/api/public/v1/users', {
                q: { department_id_eq: dept.id, is_active_eq: true },
                per_page: 100
              });

              if (usersResponse.success && (usersResponse.data as any)?.users) {
                const userIds = (usersResponse.data as any).users.map((u: any) => u.id);
                
                // Get leave data for this department
                const leavesResponse = await this.apiClient.get('/api/public/v1/leaves', {
                  q: { 
                    user_id_in: userIds,
                    created_at_gteq: `${currentYear}-01-01`
                  },
                  per_page: 200
                });

                const leaveStats = {
                  total: 0,
                  approved: 0,
                  pending: 0,
                  rejected: 0
                };

                if (leavesResponse.success && (leavesResponse.data as any)?.leaves) {
                  const leaves = (leavesResponse.data as any).leaves;
                  leaveStats.total = leaves.length;
                  leaveStats.approved = leaves.filter((l: any) => l.status === 'approved').length;
                  leaveStats.pending = leaves.filter((l: any) => l.status === 'pending').length;
                  leaveStats.rejected = leaves.filter((l: any) => l.status === 'rejected').length;
                }

                comparisonData.push({
                  name: dept.name,
                  userCount: (usersResponse.data as any).users.length,
                  activeUsers: (usersResponse.data as any).users.filter((u: any) => u.is_active).length,
                  leaveStats: leaveStats,
                  leaveRequestRate: (usersResponse.data as any).users.length > 0 ? 
                    (leaveStats.total / (usersResponse.data as any).users.length).toFixed(1) : '0.0',
                  approvalRate: leaveStats.total > 0 ? 
                    ((leaveStats.approved / leaveStats.total) * 100).toFixed(1) : '0.0'
                });
              }
            } catch (error) {
              // Skip departments that can't be analyzed
              continue;
            }
          }

          // Generate performance rankings
          if (comparisonData.length > 0) {
            // Sort by different metrics
            const bySize = [...comparisonData].sort((a, b) => b.userCount - a.userCount);
            const byLeaveRate = [...comparisonData].sort((a, b) => parseFloat(a.leaveRequestRate) - parseFloat(b.leaveRequestRate));
            const byApprovalRate = [...comparisonData].sort((a, b) => parseFloat(b.approvalRate) - parseFloat(a.approvalRate));

            performanceRankings = `
**Department Rankings:**

**By Team Size:**
${this.formatList(bySize.slice(0, 5), (dept: any) => 
  `${dept.name}: ${dept.userCount} employees (${dept.activeUsers} active)`
)}

**By Leave Request Rate (Lower is Better):**
${this.formatList(byLeaveRate.slice(0, 5), (dept: any) => 
  `${dept.name}: ${dept.leaveRequestRate} requests per employee`
)}

**By Approval Rate (Higher is Better):**
${this.formatList(byApprovalRate.slice(0, 5), (dept: any) => 
  `${dept.name}: ${dept.approvalRate}% approval rate`
)}`;

            // Generate insights
            const avgLeaveRate = comparisonData.reduce((sum, d) => sum + parseFloat(d.leaveRequestRate), 0) / comparisonData.length;
            const avgApprovalRate = comparisonData.reduce((sum, d) => sum + parseFloat(d.approvalRate), 0) / comparisonData.length;
            
            const highPerformers = comparisonData.filter(d => 
              parseFloat(d.leaveRequestRate) < avgLeaveRate && parseFloat(d.approvalRate) > avgApprovalRate
            );
            
            const needsAttention = comparisonData.filter(d => 
              parseFloat(d.leaveRequestRate) > avgLeaveRate || parseFloat(d.approvalRate) < avgApprovalRate
            );

            insights = `
**📊 Performance Insights:**

**Company Averages:**
- Average Leave Request Rate: ${avgLeaveRate.toFixed(1)} per employee
- Average Approval Rate: ${avgApprovalRate.toFixed(1)}%
- Total Active Employees: ${comparisonData.reduce((sum, d) => sum + d.activeUsers, 0)}

**High Performing Departments (${highPerformers.length}):**
${highPerformers.length > 0 ? this.formatList(highPerformers, (dept: any) => 
  `${dept.name}: Low leave rate (${dept.leaveRequestRate}), High approval rate (${dept.approvalRate}%)`
) : 'No departments meet high performance criteria'}

**Departments Needing Attention (${needsAttention.length}):**
${needsAttention.length > 0 ? this.formatList(needsAttention, (dept: any) => 
  `${dept.name}: Leave rate: ${dept.leaveRequestRate}, Approval rate: ${dept.approvalRate}%`
) : 'All departments performing well'}`;
          }
        }
      }
    } catch (error) {
      departmentComparison = 'Unable to fetch department comparison data';
    }

    return `Inter-Department Comparison Analysis

**Analysis Parameters:**
- Metric Focus: ${metricFocus.charAt(0).toUpperCase() + metricFocus.slice(1)}
- Time Period: ${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}
- Analysis Date: ${new Date().toLocaleDateString()}

${departmentComparison}
${performanceRankings}
${insights}

**🔍 Detailed Comparison Framework:**

**Operational Metrics:**
1. **Team Size & Structure**
   - Total employees per department
   - Active vs inactive ratios
   - Manager-to-employee ratios
   - Organizational depth

2. **Productivity Indicators**
   - Output per employee
   - Goal achievement rates
   - Project completion times
   - Quality metrics

3. **Resource Utilization**
   - Workload distribution
   - Overtime usage
   - Cross-functional collaboration
   - Resource sharing efficiency

**HR Metrics:**
1. **Leave Management**
   - Leave request frequency
   - Approval/rejection rates
   - Leave type preferences
   - Seasonal patterns

2. **Employee Engagement**
   - Retention rates
   - Internal mobility
   - Training participation
   - Performance review scores

3. **Attendance & Punctuality**
   - Daily attendance rates
   - Late arrival frequency
   - Early departure patterns
   - Remote work adoption

**🎯 Best Practice Identification:**

**High-Performing Department Characteristics:**
- Consistent leave approval processes
- Balanced workload distribution
- Strong manager-employee relationships
- Effective communication patterns
- Proactive capacity planning

**Areas for Improvement:**
- Departments with high leave rejection rates
- Teams with unbalanced workloads
- Groups with low employee satisfaction
- Units with high turnover rates

**📈 Benchmarking Analysis:**

**Internal Benchmarks:**
- Compare against company averages
- Identify top quartile performers
- Analyze bottom quartile challenges
- Track improvement trends

**Industry Benchmarks (External):**
- Compare against industry standards
- Identify competitive advantages
- Spot industry trends
- Plan strategic improvements

**🔧 Improvement Strategies:**

**Knowledge Sharing:**
- Share best practices across departments
- Cross-department training programs
- Peer mentoring initiatives
- Success story documentation

**Standardization:**
- Implement consistent policies
- Standardize approval processes
- Align performance metrics
- Harmonize reporting procedures

**Targeted Interventions:**
- Department-specific improvement plans
- Skill development programs
- Process optimization initiatives
- Technology adoption strategies

**📊 Ongoing Monitoring:**

**Monthly Reviews:**
- Track key performance indicators
- Monitor trend changes
- Identify emerging issues
- Celebrate improvements

**Quarterly Assessments:**
- Deep-dive analysis of metrics
- Strategic planning sessions
- Resource allocation reviews
- Goal setting and adjustment

**Annual Evaluations:**
- Comprehensive performance review
- Benchmarking against external standards
- Long-term trend analysis
- Strategic planning for next year

Would you like me to focus on specific departments for detailed analysis, create improvement action plans, or set up ongoing monitoring dashboards for department comparison?`;
  }
}