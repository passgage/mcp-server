import { BasePrompt, PromptMetadata, PromptContext } from './index.js';

/**
 * Welcome Onboarding Prompt - Auto-triggers for new users
 */
export class WelcomePrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'welcome',
      description: 'Interactive welcome and system introduction for new users',
      category: 'Getting Started',
      tags: ['welcome', 'introduction', 'getting-started', 'help'],
      arguments: [
        {
          name: 'user_type',
          description: 'Type of user (manager, employee, admin, developer)',
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
    const userType = args.user_type || 'user';
    const authMode = context?.currentAuth?.mode || 'unknown';
    const isAuthenticated = context?.currentAuth?.isAuthenticated || false;

    let authStatus = '';
    if (isAuthenticated) {
      authStatus = `✅ You're authenticated in **${authMode}** mode`;
      if (context?.user) {
        authStatus += ` as ${context.user.first_name} ${context.user.last_name}`;
      }
    } else {
      authStatus = '⚠️ Not authenticated yet - some features may be limited';
    }

    const roleBasedSuggestions = this.getRoleBasedSuggestions(userType);
    const quickActions = this.getQuickActions(userType, authMode);

    return `# 👋 Welcome to Passgage MCP Server!

I'm your intelligent assistant with **133 specialized tools** and **12 workflow prompts** designed to help you manage workforce operations efficiently.

**Current Status:**
${authStatus}

## 🚀 What I Can Help You With:

### 📋 **Available Workflow Prompts** (12 total)

**HR & Employee Management:**
- 🏢 **new_employee_onboarding** - Complete onboarding checklist
- 👋 **employee_offboarding** - Systematic departure process
- 👥 **team_onboarding** - Bulk hiring workflows

**Leave Management:**
- 📅 **leave_request_workflow** - Submit and track leave requests
- 📊 **leave_balance_analysis** - Personal/team leave analytics
- ✅ **leave_approval_management** - Review and approve requests

**Analytics & Insights:**
- 📈 **department_performance_analytics** - KPIs and metrics
- ⚖️ **team_workload_analysis** - Capacity planning
- 🔍 **department_comparison** - Cross-department benchmarking

**Support & Discovery:**
- 🛠 **troubleshoot** - Solve API issues
- 🎯 **onboard** - API setup guide
- 🔍 **explore** - Discover features

## 💡 **How to Use Prompts:**

Simply say:
- "Use the **leave_request_workflow** prompt"
- "Help me with **new employee onboarding**"
- "Show me **department analytics**"

Or describe your need:
- "I need to request time off" → I'll suggest leave prompts
- "We're hiring new employees" → I'll guide you to onboarding prompts
- "Show team performance" → I'll recommend analytics prompts

## 🎯 **Quick Start for ${userType.charAt(0).toUpperCase() + userType.slice(1)}s:**

${roleBasedSuggestions}

## ⚡ **Most Common Actions:**

${quickActions}

## 🔧 **Discover More:**

- **See all prompts**: \`passgage_list_prompts\`
- **Get help on a prompt**: \`passgage_prompt_help --name [prompt_name]\`
- **Find relevant prompts**: \`passgage_suggest_prompts --need "your need"\`
- **Check auth status**: \`passgage_auth_status\`

## 📚 **Pro Tips:**

1. **Natural Language Works**: Just describe what you need, and I'll find the right tools
2. **Prompts Save Time**: Use workflow prompts for complex multi-step processes
3. **Explore Features**: Each prompt provides comprehensive guidance
4. **Context Aware**: Prompts adapt based on your authentication mode

## 🎬 **Get Started Now:**

What would you like to do today? Here are some suggestions:

1. 📋 **"Show me all available prompts"** - See everything I can do
2. 🏢 **"I need to onboard a new employee"** - Start onboarding process
3. 📅 **"Check my leave balance"** - View your time off status
4. 📊 **"Analyze department performance"** - Get insights and metrics
5. 🔍 **"Explore Passgage features"** - Discover capabilities

---

💬 **Just ask me anything!** I understand natural language and will guide you to the right solution.

Type **"help"** anytime for assistance or **"show prompts"** to see all available workflows.`;
  }

  private getRoleBasedSuggestions(_userType: string): string {
    const suggestions: Record<string, string> = {
      manager: `**As a Manager, you'll find these prompts most useful:**
- **leave_approval_management** - Review team leave requests
- **department_performance_analytics** - Track team KPIs
- **team_workload_analysis** - Balance team capacity
- **new_employee_onboarding** - Onboard team members`,
      
      employee: `**As an Employee, start with these prompts:**
- **leave_request_workflow** - Request time off
- **leave_balance_analysis** - Check your balance
- **explore** - Discover available features
- **troubleshoot** - Get help with issues`,
      
      admin: `**As an Admin, leverage these power features:**
- **team_onboarding** - Bulk employee setup
- **department_comparison** - Benchmark performance
- **employee_offboarding** - Manage departures
- **All analytics prompts** - Company-wide insights`,
      
      developer: `**As a Developer, explore these technical prompts:**
- **troubleshoot** - Debug API issues
- **onboard** - API integration guide
- **explore** - Discover all endpoints
- **Test all 133 tools** - Full API coverage`
    };

    return suggestions[_userType] || suggestions.employee;
  }

  private getQuickActions(_userType: string, authMode: string): string {
    if (authMode === 'company') {
      return `1. List all users: \`passgage_list_users\`
2. View pending approvals: \`passgage_list_approvals\`
3. Department overview: \`passgage_list_departments\`
4. Check leave requests: Use **leave_approval_management** prompt
5. Onboard new employee: Use **new_employee_onboarding** prompt`;
    } else {
      return `1. Check leave balance: Use **leave_balance_analysis** prompt
2. Request time off: Use **leave_request_workflow** prompt
3. View my profile: \`passgage_get_user\`
4. Check my approvals: \`passgage_get_my_approvals\`
5. Explore features: Use **explore** prompt`;
    }
  }
}

/**
 * Interactive Prompt Guide
 */
export class PromptGuidePrompt extends BasePrompt {
  getMetadata(): PromptMetadata {
    return {
      name: 'prompt_guide',
      description: 'Interactive guide to discover and use prompts effectively',
      category: 'Help',
      tags: ['guide', 'help', 'tutorial', 'prompts'],
      arguments: [
        {
          name: 'topic',
          description: 'Specific topic to focus on (leave, onboarding, analytics, etc.)',
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

  async render(args: Record<string, any>, _context?: PromptContext): Promise<string> {
    const topic = args.topic || 'all';

    const guides: Record<string, string> = {
      leave: `## 📅 Leave Management Guide

**Available Prompts:**
1. **leave_request_workflow** - Complete leave request process
2. **leave_balance_analysis** - Analyze your leave balance
3. **leave_approval_management** - Manage team leave requests

**Common Scenarios:**

### Requesting Leave:
\`\`\`
You: "I need to take 5 days off next month"
Me: "I'll help you with that using the leave_request_workflow prompt..."
\`\`\`

### Checking Balance:
\`\`\`
You: "How much leave do I have left?"
Me: "Let me check that with the leave_balance_analysis prompt..."
\`\`\`

### Managing Approvals (Managers):
\`\`\`
You: "Show pending leave requests"
Me: "I'll use the leave_approval_management prompt to show you..."
\`\`\``,

      onboarding: `## 🏢 Employee Onboarding Guide

**Available Prompts:**
1. **new_employee_onboarding** - Single employee onboarding
2. **team_onboarding** - Multiple employees at once
3. **employee_offboarding** - Departure process

**Step-by-Step Process:**

### New Employee:
1. Use **new_employee_onboarding** prompt
2. Provide: name, department, position, start date
3. Follow the generated checklist
4. Track progress through phases

### Bulk Hiring:
1. Use **team_onboarding** prompt
2. Specify team size and department
3. Get bulk processing templates
4. Monitor group progress`,

      analytics: `## 📊 Analytics & Reporting Guide

**Available Prompts:**
1. **department_performance_analytics** - Department KPIs
2. **team_workload_analysis** - Capacity planning
3. **department_comparison** - Benchmarking

**Using Analytics Prompts:**

### Performance Review:
\`\`\`
You: "Show me engineering department performance"
Me: "I'll analyze that using department_performance_analytics..."
\`\`\`

### Workload Planning:
\`\`\`
You: "Is my team overloaded?"
Me: "Let's check with team_workload_analysis prompt..."
\`\`\`

### Comparisons:
\`\`\`
You: "Compare all departments"
Me: "I'll use department_comparison to benchmark..."
\`\`\``,

      all: `## 📚 Complete Prompt Usage Guide

### 🎯 **Understanding Prompts**

**What are prompts?**
- Pre-built workflows that guide complex processes
- Interactive assistants for specific tasks
- Context-aware helpers that use live data

**How to use them:**
1. **Direct Request**: "Use the [prompt_name] prompt"
2. **Natural Language**: Describe your need
3. **With Parameters**: Provide specific details

### 📋 **Prompt Categories**

**HR Workflows (6 prompts):**
- Employee lifecycle management
- Leave and absence handling
- Team coordination

**Analytics (3 prompts):**
- Performance metrics
- Capacity planning
- Benchmarking

**Support (3 prompts):**
- Troubleshooting
- Getting started
- Feature discovery

### 💡 **Best Practices**

1. **Start Simple**: Try prompts without parameters first
2. **Provide Context**: More details = better results
3. **Chain Prompts**: Use multiple prompts for complex tasks
4. **Save Patterns**: Remember successful prompt combinations

### 🔍 **Discovery Commands**

- List all: \`passgage_list_prompts\`
- Get help: \`passgage_prompt_help --name [prompt]\`
- Find relevant: \`passgage_suggest_prompts --need "description"\`

### ⚡ **Quick Examples**

**Scenario 1: New Manager**
1. Use **welcome** prompt for orientation
2. Try **department_performance_analytics** for team insights
3. Learn **leave_approval_management** for requests

**Scenario 2: HR Admin**
1. Master **new_employee_onboarding** for hires
2. Use **team_onboarding** for bulk processing
3. Apply **employee_offboarding** for departures

**Scenario 3: Employee**
1. Start with **leave_balance_analysis**
2. Use **leave_request_workflow** when needed
3. Explore features with **explore** prompt`
    };

    const content = guides[topic.toLowerCase()] || guides.all;

    return `# 🎓 Interactive Prompt Guide

${content}

## 🚀 **Next Steps**

1. **Try a prompt now**: Pick one and test it
2. **Explore parameters**: Add optional details
3. **Combine prompts**: Chain them for workflows
4. **Share feedback**: Help us improve

**Need more help?**
- Type: \`passgage_list_prompts\` to see all prompts
- Type: \`passgage_suggest_prompts --need "your need"\` for recommendations
- Ask me anything in natural language!

Ready to start? What would you like to try first?`;
  }
}