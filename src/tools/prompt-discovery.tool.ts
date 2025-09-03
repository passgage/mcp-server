import { BaseTool } from './base.tool.js';
import { PassgageAPIClient } from '../api/client.js';

interface ToolMetadata {
  name: string;
  description: string;
  category: string;
  scopes?: string[];
  permissions?: {
    companyMode: boolean;
    userMode: boolean;
  };
  inputSchema?: any;
}

/**
 * List Available Prompts Tool
 */
export class ListPromptsTool extends BaseTool {
  constructor(apiClient?: PassgageAPIClient) {
    super(apiClient);
  }

  getInputSchema(): any {
    return this.getMetadata().inputSchema;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_list_prompts',
      description: 'List all available MCP prompts organized by category',
      category: 'Help',
      scopes: [],
      permissions: {
        companyMode: true,
        userMode: true
      },
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Filter by category (hr-workflows, analytics, support, etc.)',
            required: false
          },
          search: {
            type: 'string',
            description: 'Search term to filter prompts',
            required: false
          }
        }
      }
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const category = args.category;
    const search = args.search?.toLowerCase();

    const allPrompts = [
      // HR Workflows
      {
        name: 'leave_request_workflow',
        category: 'HR Workflows',
        description: 'Guide through complete leave request process',
        usage: 'Use when: Employee needs to request time off',
        parameters: ['leave_type', 'start_date', 'duration'],
        tags: ['leave', 'workflow', 'hr', 'requests']
      },
      {
        name: 'leave_balance_analysis',
        category: 'HR Analytics',
        description: 'Analyze leave balance and utilization patterns',
        usage: 'Use when: Checking leave balance or analyzing usage patterns',
        parameters: ['user_id', 'period'],
        tags: ['leave', 'balance', 'analytics', 'reporting']
      },
      {
        name: 'leave_approval_management',
        category: 'Management',
        description: 'Manage leave approval workflows and pending requests',
        usage: 'Use when: Manager needs to review/approve leave requests',
        parameters: ['filter'],
        tags: ['leave', 'approval', 'management', 'workflow']
      },
      // Employee Onboarding
      {
        name: 'new_employee_onboarding',
        category: 'HR Workflows',
        description: 'Complete onboarding checklist for new employees',
        usage: 'Use when: Onboarding a new employee to the company',
        parameters: ['employee_name', 'department', 'position', 'start_date'],
        tags: ['onboarding', 'hr', 'new-employee', 'checklist']
      },
      {
        name: 'employee_offboarding',
        category: 'HR Workflows',
        description: 'Complete offboarding checklist for departing employees',
        usage: 'Use when: Employee is leaving the company',
        parameters: ['user_id', 'last_day', 'reason'],
        tags: ['offboarding', 'hr', 'departing-employee', 'checklist']
      },
      {
        name: 'team_onboarding',
        category: 'HR Workflows',
        description: 'Bulk onboarding for multiple new team members',
        usage: 'Use when: Hiring multiple employees for the same team',
        parameters: ['team_size', 'department', 'start_date'],
        tags: ['team-onboarding', 'bulk', 'hr', 'multiple-employees']
      },
      // Department Analytics
      {
        name: 'department_performance_analytics',
        category: 'Analytics',
        description: 'Analyze department performance metrics and KPIs',
        usage: 'Use when: Reviewing department performance and productivity',
        parameters: ['department_id', 'period', 'metrics'],
        tags: ['analytics', 'department', 'performance', 'kpi']
      },
      {
        name: 'team_workload_analysis',
        category: 'Analytics',
        description: 'Analyze team workload distribution and capacity planning',
        usage: 'Use when: Planning resource allocation and workload balancing',
        parameters: ['department_id', 'time_period'],
        tags: ['workload', 'capacity', 'team', 'planning']
      },
      {
        name: 'department_comparison',
        category: 'Analytics',
        description: 'Compare performance and metrics across multiple departments',
        usage: 'Use when: Benchmarking departments against each other',
        parameters: ['metric_focus', 'time_period'],
        tags: ['comparison', 'departments', 'benchmarking', 'analytics']
      },
      // General Prompts
      {
        name: 'troubleshoot',
        category: 'Support',
        description: 'Help troubleshoot Passgage API issues',
        usage: 'Use when: Encountering errors or problems with the API',
        parameters: ['error', 'context'],
        tags: ['troubleshooting', 'support', 'debugging']
      },
      {
        name: 'onboard',
        category: 'Getting Started',
        description: 'Guide through Passgage API onboarding',
        usage: 'Use when: Setting up Passgage API for the first time',
        parameters: ['company', 'useCase'],
        tags: ['onboarding', 'setup', 'getting-started']
      },
      {
        name: 'explore',
        category: 'Discovery',
        description: 'Explore Passgage API capabilities',
        usage: 'Use when: Learning about available API features',
        parameters: ['feature'],
        tags: ['exploration', 'discovery', 'api']
      }
    ];

    // Filter by category if specified
    let filteredPrompts = category 
      ? allPrompts.filter(p => p.category.toLowerCase().includes(category.toLowerCase()))
      : allPrompts;

    // Filter by search term if specified
    if (search) {
      filteredPrompts = filteredPrompts.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.usage.toLowerCase().includes(search) ||
        p.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Group by category
    const groupedPrompts: Record<string, any[]> = {};
    filteredPrompts.forEach(prompt => {
      if (!groupedPrompts[prompt.category]) {
        groupedPrompts[prompt.category] = [];
      }
      groupedPrompts[prompt.category].push(prompt);
    });

    return {
      success: true,
      message: `Found ${filteredPrompts.length} prompts in ${Object.keys(groupedPrompts).length} categories`,
      data: {
        total: filteredPrompts.length,
        categories: Object.keys(groupedPrompts),
        prompts: groupedPrompts,
        usage_tip: "To use a prompt, ask: 'Use the [prompt_name] prompt' or simply describe your need and I'll suggest relevant prompts."
      }
    };
  }
}

/**
 * Prompt Help Tool
 */
export class PromptHelpTool extends BaseTool {
  constructor(apiClient?: PassgageAPIClient) {
    super(apiClient);
  }

  getInputSchema(): any {
    return this.getMetadata().inputSchema;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_prompt_help',
      description: 'Get detailed help and usage information for a specific prompt',
      category: 'Help',
      scopes: [],
      permissions: {
        companyMode: true,
        userMode: true
      },
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the prompt to get help for',
            required: true
          }
        },
        required: ['name']
      }
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const promptName = args.name;

    const promptDetails: Record<string, any> = {
      // Leave Management
      'leave_request_workflow': {
        name: 'Leave Request Workflow',
        description: 'Comprehensive guide for requesting and managing employee leave',
        when_to_use: [
          'Employee needs to request time off',
          'Planning vacation or personal leave',
          'Emergency leave situations',
          'Understanding leave policies'
        ],
        parameters: {
          leave_type: 'Type of leave (annual, sick, personal, etc.) - optional',
          start_date: 'Start date of leave (YYYY-MM-DD) - optional',
          duration: 'Duration in days - optional'
        },
        example_usage: "Use the leave_request_workflow prompt with leave_type='annual' and duration=5",
        output: 'Step-by-step guide including balance check, submission process, approval workflow, and policy information'
      },
      'new_employee_onboarding': {
        name: 'New Employee Onboarding',
        description: 'Complete checklist and process for onboarding new employees',
        when_to_use: [
          'New employee joining the company',
          'Bulk hiring for a department',
          'Setting up access and permissions',
          'Planning first day/week activities'
        ],
        parameters: {
          employee_name: 'Name of the new employee - required',
          department: 'Department the employee will join - optional',
          position: 'Job position/title - optional',
          start_date: 'Employee start date (YYYY-MM-DD) - optional'
        },
        example_usage: "Use the new_employee_onboarding prompt with employee_name='John Doe' and department='Engineering'",
        output: 'Comprehensive checklist covering pre-arrival setup, first day tasks, system access, training, and monitoring'
      },
      'department_performance_analytics': {
        name: 'Department Performance Analytics',
        description: 'Analyze department KPIs, metrics, and performance indicators',
        when_to_use: [
          'Monthly/quarterly performance reviews',
          'Resource planning and allocation',
          'Identifying performance trends',
          'Benchmarking against goals'
        ],
        parameters: {
          department_id: 'Department ID to analyze - optional',
          period: 'Analysis period (current_month, last_quarter, current_year) - optional',
          metrics: 'Specific metrics to focus on - optional'
        },
        example_usage: "Use the department_performance_analytics prompt with period='last_quarter'",
        output: 'Detailed analytics including team structure, leave patterns, performance metrics, and recommendations'
      }
    };

    const details = promptDetails[promptName];
    
    if (!details) {
      return {
        success: false,
        error: `Prompt '${promptName}' not found`,
        suggestion: 'Use passgage_list_prompts to see all available prompts'
      };
    }

    return {
      success: true,
      data: details
    };
  }
}

/**
 * Suggest Prompts Tool
 */
export class SuggestPromptsTool extends BaseTool {
  constructor(apiClient?: PassgageAPIClient) {
    super(apiClient);
  }

  getInputSchema(): any {
    return this.getMetadata().inputSchema;
  }

  getMetadata(): ToolMetadata {
    return {
      name: 'passgage_suggest_prompts',
      description: 'Get prompt suggestions based on your needs',
      category: 'Help',
      scopes: [],
      permissions: {
        companyMode: true,
        userMode: true
      },
      inputSchema: {
        type: 'object',
        properties: {
          need: {
            type: 'string',
            description: 'Describe what you need help with',
            required: true
          }
        },
        required: ['need']
      }
    };
  }

  async execute(args: Record<string, any>): Promise<any> {
    const need = args.need.toLowerCase();

    const suggestions: any[] = [];

    // Keywords mapping
    const keywordMap = [
      {
        keywords: ['leave', 'vacation', 'time off', 'holiday', 'absence'],
        prompts: ['leave_request_workflow', 'leave_balance_analysis', 'leave_approval_management']
      },
      {
        keywords: ['onboard', 'new employee', 'hire', 'hiring', 'new hire', 'first day'],
        prompts: ['new_employee_onboarding', 'team_onboarding']
      },
      {
        keywords: ['offboard', 'leaving', 'departure', 'resign', 'termination'],
        prompts: ['employee_offboarding']
      },
      {
        keywords: ['analytics', 'performance', 'kpi', 'metrics', 'report'],
        prompts: ['department_performance_analytics', 'team_workload_analysis', 'department_comparison']
      },
      {
        keywords: ['workload', 'capacity', 'resource', 'allocation'],
        prompts: ['team_workload_analysis']
      },
      {
        keywords: ['compare', 'benchmark', 'comparison'],
        prompts: ['department_comparison']
      },
      {
        keywords: ['error', 'problem', 'issue', 'trouble', 'help', 'debug'],
        prompts: ['troubleshoot']
      },
      {
        keywords: ['setup', 'start', 'begin', 'configure', 'initial'],
        prompts: ['onboard', 'explore']
      },
      {
        keywords: ['explore', 'learn', 'discover', 'understand', 'features'],
        prompts: ['explore']
      }
    ];

    // Find matching prompts
    keywordMap.forEach(mapping => {
      const matches = mapping.keywords.filter(keyword => need.includes(keyword));
      if (matches.length > 0) {
        mapping.prompts.forEach(promptName => {
          if (!suggestions.some(s => s.name === promptName)) {
            suggestions.push({
              name: promptName,
              relevance: matches.length,
              matched_keywords: matches
            });
          }
        });
      }
    });

    // Sort by relevance
    suggestions.sort((a, b) => b.relevance - a.relevance);

    if (suggestions.length === 0) {
      return {
        success: true,
        message: 'No specific prompts found for your need, but here are some general options:',
        data: {
          suggestions: [
            { name: 'explore', reason: 'To discover available features' },
            { name: 'troubleshoot', reason: 'For help with problems' },
            { name: 'onboard', reason: 'For getting started' }
          ],
          tip: 'Try using passgage_list_prompts to see all available prompts'
        }
      };
    }

    return {
      success: true,
      message: `Found ${suggestions.length} relevant prompts for your need`,
      data: {
        need: args.need,
        suggestions: suggestions.slice(0, 5).map(s => ({
          name: s.name,
          matched: s.matched_keywords,
          usage: `Ask: "Use the ${s.name} prompt"`
        })),
        tip: 'You can also use passgage_prompt_help to learn more about any specific prompt'
      }
    };
  }
}