# 📚 Passgage MCP Server - Prompts Guide

Welcome to the comprehensive guide for using MCP Prompts with the Passgage API Server. This guide will help you discover, understand, and effectively use all 14 available prompts.

## 🚀 Quick Start

### What are MCP Prompts?

MCP Prompts are interactive, context-aware workflows that guide you through complex multi-step processes. They:
- **Adapt to your context**: Different content based on authentication mode
- **Use live data**: Pull real information from Passgage API
- **Provide guidance**: Step-by-step instructions and best practices
- **Save time**: Pre-built workflows for common tasks

### How to Use Prompts

There are three ways to use prompts:

1. **Direct Request**: 
   ```
   Use the leave_request_workflow prompt
   ```

2. **Natural Language**:
   ```
   I need to request time off for next week
   ```

3. **With Parameters**:
   ```
   Use the new_employee_onboarding prompt with employee_name='John Doe' and department='Engineering'
   ```

## 🔍 Discovering Prompts

### Discovery Tools

We provide three specialized tools to help you find the right prompt:

#### 1. **List All Prompts**
```
passgage_list_prompts
```
Shows all 14 prompts organized by category.

#### 2. **Get Prompt Help**
```
passgage_prompt_help --name leave_request_workflow
```
Detailed information about a specific prompt including parameters and examples.

#### 3. **Suggest Prompts**
```
passgage_suggest_prompts --need "manage team leaves"
```
Get prompt recommendations based on your needs.

## 📋 Available Prompts (14 Total)

### 🎯 Getting Started & Help (4 prompts)

#### **welcome**
- **Purpose**: Interactive welcome and system introduction
- **When to use**: First time using the system
- **Parameters**: `user_type` (optional)
- **Example**: `Use the welcome prompt`

#### **prompt_guide**
- **Purpose**: Interactive guide to discover and use prompts
- **When to use**: Learning about available prompts
- **Parameters**: `topic` (optional)
- **Example**: `Use the prompt_guide prompt with topic='leave'`

#### **onboard**
- **Purpose**: Guide through Passgage API onboarding
- **When to use**: Initial API setup
- **Parameters**: `company` (required), `useCase` (optional)
- **Example**: `Use the onboard prompt with company='Acme Inc'`

#### **troubleshoot**
- **Purpose**: Help troubleshoot Passgage API issues
- **When to use**: Encountering errors or problems
- **Parameters**: `error` (required), `context` (optional)
- **Example**: `Use the troubleshoot prompt with error='401 Unauthorized'`

### 📅 Leave Management (3 prompts)

#### **leave_request_workflow**
- **Purpose**: Complete leave request process guide
- **When to use**: Employee needs to request time off
- **Parameters**: `leave_type`, `start_date`, `duration` (all optional)
- **Example**: `Use the leave_request_workflow prompt with leave_type='annual' and duration=5`

#### **leave_balance_analysis**
- **Purpose**: Analyze leave balance and utilization
- **When to use**: Checking balance or analyzing patterns
- **Parameters**: `user_id`, `period` (both optional)
- **Example**: `Use the leave_balance_analysis prompt`

#### **leave_approval_management**
- **Purpose**: Manage leave approval workflows
- **When to use**: Manager reviewing leave requests
- **Parameters**: `filter` (optional)
- **Example**: `Use the leave_approval_management prompt with filter='urgent'`

### 🏢 Employee Lifecycle (3 prompts)

#### **new_employee_onboarding**
- **Purpose**: Complete onboarding checklist
- **When to use**: New employee joining
- **Parameters**: `employee_name` (required), `department`, `position`, `start_date` (optional)
- **Example**: `Use the new_employee_onboarding prompt with employee_name='Jane Smith'`

#### **employee_offboarding**
- **Purpose**: Systematic departure process
- **When to use**: Employee leaving company
- **Parameters**: `user_id` (required), `last_day`, `reason` (optional)
- **Example**: `Use the employee_offboarding prompt with user_id=123`

#### **team_onboarding**
- **Purpose**: Bulk onboarding for multiple employees
- **When to use**: Hiring multiple team members
- **Parameters**: `team_size` (required), `department` (required), `start_date` (optional)
- **Example**: `Use the team_onboarding prompt with team_size=5 and department='Sales'`

### 📊 Analytics & Insights (3 prompts)

#### **department_performance_analytics**
- **Purpose**: Analyze department KPIs and metrics
- **When to use**: Performance reviews and planning
- **Parameters**: `department_id`, `period`, `metrics` (all optional)
- **Example**: `Use the department_performance_analytics prompt with period='last_quarter'`

#### **team_workload_analysis**
- **Purpose**: Analyze workload distribution
- **When to use**: Capacity planning
- **Parameters**: `department_id`, `time_period` (both optional)
- **Example**: `Use the team_workload_analysis prompt`

#### **department_comparison**
- **Purpose**: Cross-department benchmarking
- **When to use**: Comparative analysis
- **Parameters**: `metric_focus`, `time_period` (both optional)
- **Example**: `Use the department_comparison prompt with metric_focus='productivity'`

### 🔍 Discovery (1 prompt)

#### **explore**
- **Purpose**: Explore Passgage API capabilities
- **When to use**: Learning about features
- **Parameters**: `feature` (optional)
- **Example**: `Use the explore prompt with feature='leave management'`

## 💡 Best Practices

### 1. Start Simple
Try prompts without parameters first to understand their basic functionality:
```
Use the leave_balance_analysis prompt
```

### 2. Add Context Gradually
Once comfortable, add parameters for more specific results:
```
Use the leave_balance_analysis prompt with period='current_year'
```

### 3. Chain Prompts for Complex Workflows
Combine multiple prompts for comprehensive processes:
1. Start with `welcome` for orientation
2. Use `department_performance_analytics` for insights
3. Apply `team_workload_analysis` for planning
4. Implement changes with `new_employee_onboarding`

### 4. Use Natural Language
The system understands natural language:
- "I need help onboarding a new employee"
- "Show me how to request leave"
- "Analyze my department's performance"

## 🎯 Common Scenarios

### Scenario 1: New Manager
```
1. Use the welcome prompt
2. Use the prompt_guide prompt with topic='analytics'
3. Use the department_performance_analytics prompt
4. Use the leave_approval_management prompt
```

### Scenario 2: HR Administrator
```
1. Use the team_onboarding prompt for bulk hires
2. Use the new_employee_onboarding prompt for individuals
3. Use the employee_offboarding prompt for departures
4. Use the department_comparison prompt for insights
```

### Scenario 3: Employee
```
1. Use the welcome prompt with user_type='employee'
2. Use the leave_balance_analysis prompt
3. Use the leave_request_workflow prompt
4. Use the explore prompt to learn more
```

## 🔧 Prompt Parameters

### Understanding Parameters

Parameters allow you to customize prompt behavior:

- **Required**: Must be provided
- **Optional**: Enhance the prompt but not necessary
- **Types**: 
  - `string`: Text values
  - `number`: Numeric values
  - `boolean`: true/false values

### Parameter Examples

**Simple (no parameters):**
```
Use the welcome prompt
```

**Single parameter:**
```
Use the prompt_guide prompt with topic='leave'
```

**Multiple parameters:**
```
Use the new_employee_onboarding prompt with employee_name='John Doe' and department='IT' and start_date='2024-01-15'
```

## 🚨 Troubleshooting

### Prompt Not Found
```
Error: Unknown prompt: xyz
Solution: Use passgage_list_prompts to see available prompts
```

### Missing Required Parameters
```
Error: Required parameter 'employee_name' not provided
Solution: Add the parameter: with employee_name='Name'
```

### Permission Denied
```
Error: This prompt requires company mode
Solution: Switch to company mode or use a different prompt
```

## 📈 Advanced Usage

### Context-Aware Prompts

Prompts adapt based on:
- **Authentication mode**: Company vs User mode
- **User role**: Manager, Employee, Admin
- **Current data**: Live API information

### Dynamic Content

Prompts can:
- Fetch current user information
- Pull department data
- Analyze leave balances
- Generate real-time reports

### Integration with Tools

Prompts work seamlessly with the 136 available tools:
- Prompts guide the process
- Tools execute specific actions
- Results feed back into prompts

## 🎬 Getting Help

### Interactive Help
```
Use the welcome prompt
Use the prompt_guide prompt
```

### Discovery Commands
```
passgage_list_prompts
passgage_prompt_help --name [prompt_name]
passgage_suggest_prompts --need "your need"
```

### Natural Language
Just describe what you need:
- "Help me onboard someone"
- "I need to check leave balance"
- "Show department analytics"

## 📚 Reference

### All Prompts Summary

| Prompt | Category | Purpose | Auth Mode |
|--------|----------|---------|-----------|
| welcome | Getting Started | System introduction | Both |
| prompt_guide | Help | Learn about prompts | Both |
| onboard | Getting Started | API setup | Both |
| troubleshoot | Support | Solve problems | Both |
| explore | Discovery | Learn features | Both |
| leave_request_workflow | HR Workflows | Request leave | Both |
| leave_balance_analysis | HR Analytics | Check balance | Both |
| leave_approval_management | Management | Approve leaves | Company |
| new_employee_onboarding | HR Workflows | Onboard employee | Company |
| employee_offboarding | HR Workflows | Offboard employee | Company |
| team_onboarding | HR Workflows | Bulk onboarding | Company |
| department_performance_analytics | Analytics | KPI analysis | Company |
| team_workload_analysis | Analytics | Capacity planning | Company |
| department_comparison | Analytics | Benchmarking | Company |

### Quick Commands Reference

| Need | Command |
|------|---------|
| See all prompts | `passgage_list_prompts` |
| Get help on prompt | `passgage_prompt_help --name [prompt]` |
| Find relevant prompts | `passgage_suggest_prompts --need "description"` |
| Start with welcome | `Use the welcome prompt` |
| Learn about prompts | `Use the prompt_guide prompt` |

---

**Ready to start?** Try the `welcome` prompt now or use `passgage_list_prompts` to explore all available options!