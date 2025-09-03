import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Prompt, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { PassgageAPIClient } from '../api/client.js';
import { logger } from '../config/logger.js';

export interface PromptMetadata {
  name: string;
  description?: string;
  category?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array';
    default?: any;
  }>;
  tags?: string[];
  permissions?: {
    companyMode: boolean;
    userMode: boolean;
  };
}

export interface PromptContext {
  user?: any;
  company?: any;
  currentAuth?: {
    mode: 'company' | 'user';
    isAuthenticated: boolean;
  };
  [key: string]: any;
}

export abstract class BasePrompt {
  protected apiClient: PassgageAPIClient;

  constructor(apiClient: PassgageAPIClient) {
    this.apiClient = apiClient;
  }

  abstract getMetadata(): PromptMetadata;
  abstract render(args: Record<string, any>, context?: PromptContext): Promise<string>;
  
  toMCPPrompt(): Prompt {
    const metadata = this.getMetadata();
    return {
      name: metadata.name,
      description: metadata.description,
      arguments: metadata.arguments
    };
  }

  /**
   * Check if the prompt can be executed in current auth mode
   */
  async checkPermissions(): Promise<{ allowed: boolean; reason?: string }> {
    const metadata = this.getMetadata();
    
    if (!metadata.permissions) {
      return { allowed: true };
    }

    const authMode = this.apiClient.getAuthMode();
    const isAuthenticated = await this.apiClient.isAuthenticated();

    if (!isAuthenticated) {
      return { allowed: false, reason: 'Authentication required' };
    }

    if (authMode === 'company' && !metadata.permissions.companyMode) {
      return { allowed: false, reason: 'Company mode required but not allowed for this prompt' };
    }

    if (authMode === 'user' && !metadata.permissions.userMode) {
      return { allowed: false, reason: 'User mode required but not allowed for this prompt' };
    }

    return { allowed: true };
  }

  /**
   * Get context data for prompt rendering
   */
  protected async getContext(): Promise<PromptContext> {
    const authMode = this.apiClient.getAuthMode();
    const context: PromptContext = {
      currentAuth: {
        mode: authMode === 'none' ? 'company' : authMode, // Handle 'none' case
        isAuthenticated: await this.apiClient.isAuthenticated()
      }
    };

    try {
      // Try to get current user info if authenticated
      if (context.currentAuth?.isAuthenticated) {
        if (context.currentAuth.mode === 'user') {
          // Get user profile in user mode
          const response = await this.apiClient.get('/api/public/v1/profile');
          if (response.data) {
            context.user = response.data;
          }
        }
        // In company mode, we could get company info if available
      }
    } catch (error) {
      logger.debug('Could not fetch context data:', error);
    }

    return context;
  }

  /**
   * Template helper for string interpolation
   */
  protected interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Format lists for prompt output
   */
  protected formatList(items: any[], formatter?: (item: any) => string): string {
    if (!items || items.length === 0) {
      return 'None available';
    }

    return items.map((item, index) => {
      const formatted = formatter ? formatter(item) : String(item);
      return `${index + 1}. ${formatted}`;
    }).join('\n');
  }
}

export class PromptRegistry {
  private prompts = new Map<string, BasePrompt>();
  private server: Server;
  private apiClient: PassgageAPIClient;

  constructor(server: Server, apiClient: PassgageAPIClient) {
    this.server = server;
    this.apiClient = apiClient;
  }

  async registerAll(): Promise<void> {
    logger.info('Starting prompt registration...');
    
    // Register built-in prompts
    this.registerPrompt(new TroubleshootingPrompt(this.apiClient));
    this.registerPrompt(new OnboardingPrompt(this.apiClient));
    this.registerPrompt(new ApiExplorerPrompt(this.apiClient));
    
    // Register Welcome prompts
    await this.registerWelcomePrompts();
    
    // Register Leave Management prompts
    await this.registerLeaveManagementPrompts();
    
    // Register Employee Onboarding prompts
    await this.registerEmployeeOnboardingPrompts();
    
    // Register Department Analytics prompts
    await this.registerDepartmentAnalyticsPrompts();
    
    // Setup MCP handlers
    this.setupHandlers();
  }

  /**
   * Register Welcome prompts
   */
  private async registerWelcomePrompts(): Promise<void> {
    try {
      const { 
        WelcomePrompt,
        PromptGuidePrompt
      } = await import('./welcome.prompts.js');
      
      this.registerPrompt(new WelcomePrompt(this.apiClient));
      this.registerPrompt(new PromptGuidePrompt(this.apiClient));
      
      logger.debug('Welcome prompts registered');
    } catch (error) {
      logger.error('Failed to register Welcome prompts:', { error });
    }
  }

  /**
   * Register Leave Management prompts
   */
  private async registerLeaveManagementPrompts(): Promise<void> {
    try {
      const { 
        LeaveRequestWorkflowPrompt, 
        LeaveBalanceAnalysisPrompt,
        LeaveApprovalManagementPrompt
      } = await import('./leave-management.prompts.js');
      
      this.registerPrompt(new LeaveRequestWorkflowPrompt(this.apiClient));
      this.registerPrompt(new LeaveBalanceAnalysisPrompt(this.apiClient));
      this.registerPrompt(new LeaveApprovalManagementPrompt(this.apiClient));
      
      logger.debug('Leave Management prompts registered');
    } catch (error) {
      logger.error('Failed to register Leave Management prompts:', { error });
    }
  }

  /**
   * Register Employee Onboarding prompts
   */
  private async registerEmployeeOnboardingPrompts(): Promise<void> {
    try {
      const { 
        NewEmployeeOnboardingPrompt,
        EmployeeOffboardingPrompt,
        TeamOnboardingPrompt
      } = await import('./employee-onboarding.prompts.js');
      
      this.registerPrompt(new NewEmployeeOnboardingPrompt(this.apiClient));
      this.registerPrompt(new EmployeeOffboardingPrompt(this.apiClient));
      this.registerPrompt(new TeamOnboardingPrompt(this.apiClient));
      
      logger.debug('Employee Onboarding prompts registered');
    } catch (error) {
      logger.error('Failed to register Employee Onboarding prompts:', { error });
    }
  }

  /**
   * Register Department Analytics prompts
   */
  private async registerDepartmentAnalyticsPrompts(): Promise<void> {
    try {
      const { 
        DepartmentPerformanceAnalyticsPrompt,
        TeamWorkloadAnalysisPrompt,
        DepartmentComparisonPrompt
      } = await import('./department-analytics.prompts.js');
      
      this.registerPrompt(new DepartmentPerformanceAnalyticsPrompt(this.apiClient));
      this.registerPrompt(new TeamWorkloadAnalysisPrompt(this.apiClient));
      this.registerPrompt(new DepartmentComparisonPrompt(this.apiClient));
      
      logger.debug('Department Analytics prompts registered');
    } catch (error) {
      logger.error('Failed to register Department Analytics prompts:', { error });
    }
  }

  registerPrompt(prompt: BasePrompt): void {
    const metadata = prompt.getMetadata();
    this.prompts.set(metadata.name, prompt);
    logger.debug(`Registered prompt: ${metadata.name}`);
  }

  private setupHandlers(): void {
    // List prompts handler
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts: Prompt[] = [];
      
      for (const prompt of this.prompts.values()) {
        prompts.push(prompt.toMCPPrompt());
      }
      
      return { prompts };
    });

    // Get prompt handler
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const prompt = this.prompts.get(name);
      if (!prompt) {
        throw new Error(`Unknown prompt: ${name}`);
      }
      
      try {
        // Check permissions
        const canExecute = await prompt.checkPermissions();
        if (!canExecute.allowed) {
          return {
            messages: [{
              role: 'user',
              content: {
                type: 'text',
                text: `❌ Permission denied: ${canExecute.reason}`
              }
            }]
          };
        }

        // Get context and render
        const context = await (prompt as any).getContext();
        const rendered = await prompt.render(args || {}, context);
        
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: rendered
            }
          }]
        };
      } catch (error: any) {
        logger.error(`Error rendering prompt ${name}:`, error);
        
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `❌ Error rendering prompt: ${error.message}`
            }
          }]
        };
      }
    });
  }

  getPromptCount(): number {
    return this.prompts.size;
  }
}

// Example Troubleshooting Prompt
class TroubleshootingPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'troubleshoot',
      description: 'Help troubleshoot Passgage API issues',
      category: 'Support',
      tags: ['troubleshooting', 'support', 'debugging'],
      arguments: [
        {
          name: 'error',
          description: 'The error message or issue description',
          required: true,
          type: 'string'
        },
        {
          name: 'context',
          description: 'Additional context about when the error occurred',
          required: false,
          type: 'string'
        }
      ],
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  async render(args: Record<string, any>, context?: PromptContext): Promise<string> {
    const authInfo = context?.currentAuth?.mode === 'user' 
      ? `Current user: ${context.user?.first_name} ${context.user?.last_name} (${context.user?.email})`
      : `Authentication mode: ${context?.currentAuth?.mode}`;

    return `I'm experiencing an issue with the Passgage API:

Error: ${args.error}
${args.context ? `Context: ${args.context}` : ''}

System Information:
- ${authInfo}
- API Base URL: ${(this.apiClient as any).baseURL || 'Not available'}
- Authentication: ${context?.currentAuth?.isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}

Please help me:
1. Understand what this error means
2. Identify the root cause
3. Provide steps to resolve it
4. Suggest preventive measures for the future

Additional debugging information you may need:
- Review the API documentation for the failing endpoint
- Check rate limiting and request quotas
- Verify authentication credentials and permissions
- Consider environment-specific configuration differences`;
  }
}

// Example Onboarding Prompt
class OnboardingPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'onboard',
      description: 'Guide through Passgage API onboarding',
      category: 'Getting Started',
      tags: ['onboarding', 'setup', 'getting-started'],
      arguments: [
        {
          name: 'company',
          description: 'Company name',
          required: true,
          type: 'string'
        },
        {
          name: 'useCase',
          description: 'Primary use case for the API',
          required: false,
          type: 'string'
        }
      ],
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  async render(args: Record<string, any>, context?: PromptContext): Promise<string> {
    const currentMode = context?.currentAuth?.mode || 'unknown';
    const isAuthenticated = context?.currentAuth?.isAuthenticated || false;
    
    let authStatus = '';
    if (isAuthenticated) {
      authStatus = `✅ You are currently authenticated in ${currentMode} mode.`;
      if (context?.user) {
        authStatus += ` User: ${context.user.first_name} ${context.user.last_name}`;
      }
    } else {
      authStatus = '❌ You need to authenticate first.';
    }

    return `Help me set up Passgage API for ${args.company}.

${args.useCase ? `Primary use case: ${args.useCase}` : ''}

Current Status:
- ${authStatus}
- Available tools: 133 tools across 25 services
- Authentication modes: Both company and user mode available

Please guide me through:
1. **Authentication Setup**
   - Understanding company vs user mode
   - Setting up API keys or user credentials
   - Testing authentication status

2. **Basic Configuration**
   - Environment setup (.env configuration)
   - MCP server configuration
   - Claude Desktop integration

3. **First API Calls**
   - Testing ping and auth status
   - Listing users or departments
   - Understanding response formats

4. **Best Practices for ${args.useCase || 'your use case'}**
   - Recommended tools and workflows
   - Error handling patterns
   - Rate limiting considerations

5. **Next Steps**
   - Advanced features and integrations
   - Workflow automation
   - Custom reporting and analytics

Would you like me to start with any specific step, or do you have questions about the current setup?`;
  }
}

// Example API Explorer Prompt
class ApiExplorerPrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'explore',
      description: 'Explore Passgage API capabilities',
      category: 'Discovery',
      tags: ['exploration', 'discovery', 'api'],
      arguments: [
        {
          name: 'feature',
          description: 'Specific feature or area to explore (users, leaves, approvals, etc.)',
          required: false,
          type: 'string'
        }
      ],
      permissions: {
        companyMode: true,
        userMode: true
      }
    };
  }

  async render(args: Record<string, any>, context?: PromptContext): Promise<string> {
    const feature = args.feature || 'all available features';
    const authMode = context?.currentAuth?.mode || 'unknown';
    
    // Feature-specific capabilities based on auth mode
    let capabilities = '';
    if (authMode === 'company') {
      capabilities = `
**Company Mode Capabilities:**
- Full administrative access
- User management and onboarding
- Department and organizational structure
- Approval workflows and bulk operations
- Advanced reporting and analytics
- System configuration and settings`;
    } else if (authMode === 'user') {
      capabilities = `
**User Mode Capabilities:**
- Personal profile and settings
- Leave requests and balance
- Time tracking and attendance
- Personal approvals and notifications
- Limited reporting (own data)`;
    }

    return `I want to explore ${feature} in the Passgage API.

Current Context:
- Authentication mode: ${authMode}
- Available tools: 133 tools across 25 services
${capabilities}

**Available Services:**
1. **User Management**: Users, profiles, authentication
2. **Leave Management**: Leave requests, types, balances
3. **Approval Workflows**: Approval processes, bulk operations
4. **Time Tracking**: Shifts, working days, attendance
5. **Organization**: Departments, branches, job positions
6. **Access Control**: Zones, devices, cards
7. **Reporting**: Analytics, dashboards, exports

Please show me:
1. **Available endpoints and operations** for ${feature}
2. **Common use cases and examples** relevant to your current auth mode
3. **Required parameters and authentication** requirements
4. **Response formats and error handling** patterns
5. **Limitations and best practices** I should know about
6. **Related tools and workflows** that complement this feature

Would you like me to demonstrate specific operations or provide code examples for ${feature}?`;
  }
}