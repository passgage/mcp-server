# <img src="logo.svg" width="24" height="24" alt="Passgage Logo" style="vertical-align: middle;"> Passgage MCP Server

[![npm version](https://badge.fury.io/js/passgage-mcp-server.svg)](https://badge.fury.io/js/passgage-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6.svg)](https://www.typescriptlang.org/)

A comprehensive Model Context Protocol (MCP) server for integrating with the Passgage Public API. This server provides 130+ tools to interact with all aspects of the Passgage workforce management system through Claude and other MCP-compatible AI assistants.

## Quick Start

1. **Get Passgage API credentials** → Contact `deneyim@passgage.com`
2. **No installation needed** → Uses NPX automatically  
3. **Configure Claude Desktop** → Follow platform-specific setup below
4. **Restart Claude Desktop** → Start using Passgage tools!

## Table of Contents
- [Overview](#overview)
- [FAQ](#faq)  
- [Key Features](#key-features)
- [Installation](#installation)
- [Claude Desktop Setup](#using-the-server-with-claude-desktop)
- [Configuration](#configuration)
- [First Steps](#first-steps-after-installation)
- [Use Cases](#use-cases)
- [Troubleshooting](#troubleshooting)

## Overview

### What is Passgage MCP Server?
Passgage MCP Server is a comprehensive Model Context Protocol server that provides browser automation capabilities for workforce management using the Passgage API. It allows large language models (LLMs) like Claude to interact with your complete HR system through 130+ structured tools, eliminating the need for manual navigation or complex API knowledge.

### How to use Passgage MCP Server?
To use Passgage MCP Server, install it locally, configure it with your Passgage credentials in Claude Desktop using the command examples below, and start asking Claude to help with workforce management tasks. You can configure it to run with either company admin access or personal user access, depending on your needs.

### Key features of Passgage MCP Server?
- **Fast and comprehensive** operation covering all 25 Passgage services with 130+ tools
- **LLM-friendly** - requiring no manual API knowledge and operating purely on natural language
- **Permission-aware** tool availability, automatically adjusting based on your access level
- **Dual authentication modes** - switch between company admin and personal user access

### Use cases of Passgage MCP Server?
- **HR management and leave approvals** - Review and process employee requests efficiently
- **Employee onboarding and user management** - Create accounts and assign roles automatically
- **Data analysis and reporting** - Export and analyze workforce metrics and trends
- **Shift management and scheduling** - Assign staff and track working hours seamlessly

## FAQ

### Can Passgage MCP Server be used for all types of workforce management?
Yes! Passgage MCP Server supports the complete Passgage API surface area, covering user management, time tracking, approvals, payroll, shift management, device management, and all other workforce operations available in your Passgage system.

### Is Passgage MCP Server free to use?
Yes! The MCP server itself is open-source and free to use for everyone. However, you need valid Passgage API credentials and an active Passgage subscription to access the workforce management system.

### How does Passgage MCP Server handle security and permissions?
Passgage MCP Server implements comprehensive permission management with dual authentication modes. It securely handles JWT tokens and API keys, automatically adapts tool availability based on your access level, and includes comprehensive error handling for authentication issues.

### What happens if my API credentials expire or change?
The server handles JWT token refresh automatically for user credentials. For API key changes, simply update your Claude Desktop configuration and restart. The server includes comprehensive error handling and clear error messages for authentication issues.

### Does the server work with on-premises Passgage installations?
Yes! Simply configure the `PASSGAGE_BASE_URL` environment variable to point to your on-premises Passgage instance instead of the default cloud API at `https://api.passgage.com`.

## Key Features

✅ **Complete Passgage Integration** - Access all 25 services with 130+ tools  
✅ **Smart Authentication** - Dual mode system (company admin + personal user)  
✅ **Permission Management** - Tools adapt based on your access level  
✅ **Advanced Querying** - Ransack filters with 20+ operators (_eq, _cont, _in, etc.)  
✅ **Bulk Operations** - Mass approvals, data exports, batch processing  
✅ **Real-time API** - Instant responses with automatic JWT refresh  
✅ **Type-Safe** - Full TypeScript implementation with comprehensive error handling  
✅ **Production Ready** - Debug mode, timeouts, retry logic, and monitoring  


## Permission System

The MCP server implements a comprehensive permission system based on authentication modes:

### Company Mode Permissions
- ✅ **Full admin access** - All CRUD operations on all resources
- ✅ **User management** - Create, update, delete users
- ✅ **System administration** - Manage departments, branches, devices
- ✅ **Payroll access** - View payroll data
- ✅ **Bulk operations** - Mass approval, data export
- ✅ **All specialized tools** - File upload, dashboard stats, search

### User Mode Permissions  
- ✅ **Read access** - View users, departments, branches, devices
- ✅ **Personal operations** - Create/update own leave requests
- ✅ **Limited approvals** - Create approval requests (not approve them)
- ✅ **Basic tools** - File upload, search, entrance tracking
- ❌ **Admin operations** - Cannot create/delete users or manage system
- ❌ **Payroll data** - Cannot access salary information
- ❌ **Bulk operations** - Cannot perform mass operations

### Permission Errors
When a tool is not available in the current mode, you'll receive clear error messages:
```
"This operation requires company-level access. Creating users requires admin privileges"
```

To resolve permission issues, switch to the appropriate authentication mode using the mode management tools.

## Installation

### Prerequisites
- **Node.js** 18.0.0 or higher
- **Passgage API credentials** (contact `deneyim@passgage.com`)

### Option 1: NPX (Recommended - No Installation Required)

**NPX automatically downloads and runs the package when needed:**
```bash
npx passgage-mcp-server
# Should start without errors, press Ctrl+C to stop
```

### Option 2: Global Installation

1. **Install globally**:
   ```bash
   npm install -g passgage-mcp-server
   ```

2. **Verify installation**:
   ```bash
   passgage-mcp-server
   # Should start without errors, press Ctrl+C to stop
   ```

### Option 3: Development Setup

1. **Clone and build**:
   ```bash
   git clone https://github.com/passgage/mcp-server.git
   cd mcp-server
   npm install
   npm run build
   ```

2. **Verify installation**:
   ```bash
   node dist/index.js
   # Should start without errors, press Ctrl+C to stop
   ```

## Claude Desktop Setup

### Step 1: Find Your Node.js Path
```bash
# On any platform, run:
which node    # macOS/Linux
where node    # Windows
```

### Step 2: Create Configuration

Create or edit your Claude Desktop config file:

**Config file locations:**
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

**Option A: Using NPX (Recommended)**
```json
{
  "mcpServers": {
    "passgage": {
      "command": "npx",
      "args": ["passgage-mcp-server"],
      "env": {
        "PASSGAGE_API_KEY": "your_api_key_here",
        "PASSGAGE_BASE_URL": "https://api.passgage.com"
      }
    }
  }
}
```

**Option B: Using Global NPM Package**
```json
{
  "mcpServers": {
    "passgage": {
      "command": "passgage-mcp-server",
      "env": {
        "PASSGAGE_API_KEY": "your_api_key_here",
        "PASSGAGE_BASE_URL": "https://api.passgage.com"
      }
    }
  }
}
```

**Option C: Using Node.js directly (Development)**
```json
{
  "mcpServers": {
    "passgage": {
      "command": "/path/to/node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "PASSGAGE_API_KEY": "your_api_key_here",
        "PASSGAGE_BASE_URL": "https://api.passgage.com"
      }
    }
  }
}
```

**Replace paths with your actual paths (Option B only):**
- `/path/to/node` → Your Node.js path from Step 1
- `/path/to/mcp-server` → Where you cloned this repository

### Step 3: Restart Claude Desktop

1. **Completely quit** Claude Desktop (from system tray/dock)
2. **Restart** Claude Desktop
3. **Test:** Ask Claude "What Passgage tools do you have available?"


## First Steps After Installation

Once you've successfully configured Claude Desktop with the Passgage MCP Server, here are the essential first steps to verify everything is working and get started.

### Verify Installation Success

**Step 1: Check Tool Availability**

In a new Claude conversation, ask:
```
"What Passgage tools do you have available?"
```

**Expected Response:** Claude should list categories like:
- Authentication tools (8 tools)
- User management tools (5 tools) 
- Leave management tools (5 tools)
- And 25+ other service categories

**Step 2: Test Authentication Status**

Check your authentication setup:
```
"Check my Passgage authentication status"
```

**Expected Response:** Claude should show your current authentication mode (company/user) and available permissions.

### Your First Passgage Tasks

Try these beginner-friendly commands to get familiar with the system:

#### For HR Managers (Company API Key):
```
"Show me all pending leave requests from the last 7 days"
```
```
"List all users in the Engineering department"
```
```
"Get dashboard statistics for this month"
```

#### For Employees (User Credentials):
```
"Show my recent clock-in times"
```
```
"Check my leave balance and upcoming time off"
```
```
"List my upcoming shift assignments"
```

#### For System Administrators:
```
"Show me all access zones and their current status"
```
```
"List all devices and when they were last active"
```
```
"Export user data for the Sales department to CSV"
```

### Understanding Tool Responses

Passgage tools return structured data that Claude can interpret. Here's what to expect:

**✅ Successful Response Example:**
```
Found 15 pending leave requests:
- John Smith: Annual leave, March 15-20, 2024
- Sarah Johnson: Sick leave, March 18, 2024
- Mike Davis: Personal leave, March 22-23, 2024
...
```

**⚠️ Permission-Related Response:**
```
"This operation requires company-level access. Creating users requires admin privileges. 
Switch to company mode using your API key to perform this action."
```

**❌ Authentication Error:**
```
"Authentication failed. Please check your Passgage credentials or contact deneyim@passgage.com"
```

### Next Steps: Advanced Operations

Once you're comfortable with basic queries, try these more advanced workflows:

#### Multi-Step HR Workflow:
```
"Find all employees who have used more than 15 days of annual leave this year, 
show their remaining balance, and help me review any pending requests from them"
```

#### Data Analysis Workflow:
```
"Analyze attendance patterns for the last quarter, identify departments with the highest 
absenteeism, and export a detailed report"
```

#### Employee Onboarding Workflow:
```
"I need to onboard a new employee: Create user account for alice.brown@company.com in Marketing,
assign her to the main branch office, set up her access card, and assign her to the standard day shift"
```

### Quick Troubleshooting

**❌ Tools not appearing in Claude?**
1. Restart Claude Desktop completely (quit from system tray)
2. Check your config file paths are correct
3. Test server manually: `node dist/index.js`

**❌ Authentication errors?**
1. Verify API key with Passgage support: `deneyim@passgage.com`
2. Check `PASSGAGE_BASE_URL` matches your instance


## Use Cases

### HR Leave Management
```
User: "Show me all pending leave requests from March and help me approve them"

Claude: "I found 23 pending leave requests from March:
- Engineering: 8 requests (5 annual, 2 sick, 1 personal)
- Marketing: 7 requests (6 annual, 1 sick)
- Sales: 8 requests (5 annual, 3 personal)

Would you like me to show the details for a specific department?"

User: "Show me Engineering requests and approve the reasonable ones"

Claude: "Here are Engineering requests with my recommendations:
- John Smith: 5 days annual leave (Apr 15-19) ✅ Approve - good attendance
- Sarah Wilson: 2 days sick leave (Mar 28-29) ✅ Approve - has sick days
- Mike Chen: 1 day personal (Apr 5) ⚠️ Check - already has leave that week

I'll approve the first two now."
```

### Employee Onboarding
```
User: "Onboard Alex Rodriguez starting Monday in Sales"

Claude: "I'll set up Alex's complete profile:

✅ Created user account (alex.rodriguez@company.com)
✅ Assigned to Sales department  
✅ Set up access card (AC2024-0318-001)
✅ Assigned standard day shift (9 AM - 6 PM)
✅ Added to main branch and sales floor access

Equipment checklist created:
- Laptop assignment (pending IT)
- Phone ext: 2847 available
- Parking: Level 2, spot 47
- Security badge ready for pickup"
```

## Quick Reference

### Configuration Templates

#### Basic Configuration Template (NPX)
```json
{
  "mcpServers": {
    "passgage": {
      "command": "npx",
      "args": ["passgage-mcp-server"],
      "env": {
        "PASSGAGE_API_KEY": "your_api_key",
        "PASSGAGE_BASE_URL": "https://api.passgage.com"
      }
    }
  }
}
```

#### Advanced Configuration Template (NPX)
```json
{
  "mcpServers": {
    "passgage": {
      "command": "npx",
      "args": ["passgage-mcp-server"],
      "env": {
        "PASSGAGE_API_KEY": "your_company_api_key",
        "PASSGAGE_USER_EMAIL": "user@company.com",
        "PASSGAGE_USER_PASSWORD": "secure_password",
        "PASSGAGE_BASE_URL": "https://api.passgage.com",
        "PASSGAGE_DEFAULT_AUTH_MODE": "company",
        "PASSGAGE_TIMEOUT": "30000",
        "PASSGAGE_DEBUG": "false"
      }
    }
  }
}
```

#### Alternative: Global Installation Template
```json
{
  "mcpServers": {
    "passgage": {
      "command": "passgage-mcp-server",
      "env": {
        "PASSGAGE_API_KEY": "your_company_api_key",
        "PASSGAGE_USER_EMAIL": "user@company.com",
        "PASSGAGE_USER_PASSWORD": "secure_password",
        "PASSGAGE_BASE_URL": "https://api.passgage.com",
        "PASSGAGE_DEFAULT_AUTH_MODE": "company",
        "PASSGAGE_TIMEOUT": "30000",
        "PASSGAGE_DEBUG": "false"
      }
    }
  }
}
```

#### Development Configuration Template
```json
{
  "mcpServers": {
    "passgage": {
      "command": "/path/to/node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "PASSGAGE_API_KEY": "your_company_api_key",
        "PASSGAGE_USER_EMAIL": "user@company.com",
        "PASSGAGE_USER_PASSWORD": "secure_password",
        "PASSGAGE_BASE_URL": "https://api.passgage.com",
        "PASSGAGE_DEFAULT_AUTH_MODE": "company",
        "PASSGAGE_TIMEOUT": "30000",
        "PASSGAGE_DEBUG": "false"
      }
    }
  }
}
```

### Common Commands Cheat Sheet

#### Authentication Commands
```
"Check my Passgage authentication status"
"Switch to company mode"
"Switch to user mode" 
"Login with my user credentials"
"What authentication modes are available?"
```

#### User Management (Admin)
```
"List all users in [department name]"
"Create a new user for [name] ([email]) in [department]"
"Show me user details for [name/email]"
"Update user [name] to [new department]"
"Deactivate user [name/email]"
```

#### Leave Management
```
"Show all pending leave requests"
"List leave requests for [department/user]"
"Approve leave request [ID] with note [message]"
"Show my leave balance and history"
"Submit annual leave request for [dates]"
```

#### Reporting & Analytics
```
"Get dashboard statistics for [period]"
"Show attendance report for [department] [period]"
"Export [data type] for [department] to CSV"
"Analyze overtime patterns for [team/period]"
"Generate security audit report"
```

#### Device & Access Management
```
"List all access zones and their status"
"Show device status for all entrances"
"Check who has access to [zone/building]"
"List all active access cards"
"Generate access audit for [user]"
```

### Filtering Examples

#### Date Filters
```
"created_at_gteq": "2024-01-01"    # Created after January 1st
"updated_at_lteq": "2024-12-31"    # Updated before December 31st
"start_date_eq": "2024-03-15"      # Exact start date match
```

#### Text Filters  
```
"name_cont": "john"                # Name contains "john"
"email_eq": "user@company.com"     # Exact email match
"department_name_cont": "engineer" # Department contains "engineer"
```

#### Status Filters
```
"is_active_eq": true               # Active records only
"status_in": ["pending","approved"] # Multiple status values
"approval_status_not_eq": "rejected" # Exclude rejected items
```

#### Numeric Filters
```
"salary_gt": 50000                 # Salary greater than 50,000
"leave_days_lteq": 10             # Leave days 10 or fewer
"overtime_hours_gteq": 5          # 5+ overtime hours
```

### Development Mode

For development and testing:

```bash
npm run dev  # Development with hot reload
npm start    # Production mode
```

### Tool Categories

#### Authentication Tools
- `passgage_login` - Login with email/password (switches to user mode)
- `passgage_refresh_token` - Refresh current JWT token
- `passgage_logout` - Logout and clear user session
- `passgage_auth_status` - Check authentication status and available modes
- `passgage_set_company_mode` - Switch to company API key mode
- `passgage_switch_to_user_mode` - Switch to user JWT mode (requires previous login)
- `passgage_switch_to_company_mode` - Switch to company mode (requires API key)
- `passgage_get_auth_modes` - Get detailed information about available modes

#### CRUD Tools (5 tools per service × 25 services = 125 tools)
For each service (users, branches, departments, etc.):
- `passgage_list_{service}` - List with filtering and pagination
- `passgage_get_{service}` - Get single item by ID
- `passgage_create_{service}` - Create new item
- `passgage_update_{service}` - Update existing item
- `passgage_delete_{service}` - Delete item by ID

#### Specialized Tools
- `passgage_upload_file` - File upload with presigned URLs
- `passgage_approve_request` - Approve/reject single request
- `passgage_bulk_approve` - Bulk approval operations
- `passgage_assign_user_to_shift` - Staff shift assignments
- `passgage_track_entrance` - Record entry/exit events
- `passgage_search` - Universal search across resources
- `passgage_export_data` - Data export in multiple formats
- `passgage_get_dashboard_stats` - Dashboard metrics

## Examples

### Authentication & Mode Management
```javascript
// Login with user credentials (switches to user mode)
{
  "name": "passgage_login",
  "arguments": {
    "email": "user@company.com",
    "password": "secure_password"
  }
}

// Switch to company mode for admin operations
{
  "name": "passgage_set_company_mode",
  "arguments": {
    "api_key": "your_company_api_key"
  }
}

// Switch back to user mode (if previously logged in)
{
  "name": "passgage_switch_to_user_mode",
  "arguments": {}
}

// Check current authentication status and available modes
{
  "name": "passgage_auth_status",
  "arguments": {}
}

// Get detailed information about authentication modes
{
  "name": "passgage_get_auth_modes",
  "arguments": {}
}
```

### User Management
```javascript
// List users with filtering
{
  "name": "passgage_list_users",
  "arguments": {
    "page": 1,
    "per_page": 25,
    "filters": {
      "is_active_eq": true,
      "department_id_eq": "dept-uuid",
      "name_cont": "john"
    }
  }
}

// Get specific user
{
  "name": "passgage_get_user",
  "arguments": {
    "id": "user-uuid-here"
  }
}

// Create new user
{
  "name": "passgage_create_user",
  "arguments": {
    "data": {
      "email": "newuser@company.com",
      "first_name": "John",
      "last_name": "Doe",
      "department_id": "dept-uuid"
    }
  }
}
```

### Leave Management
```javascript
// List pending leave requests
{
  "name": "passgage_list_leaves",
  "arguments": {
    "filters": {
      "status_eq": "pending",
      "start_date_gteq": "2024-01-01"
    }
  }
}

// Approve leave request
{
  "name": "passgage_approve_request",
  "arguments": {
    "approval_id": "approval-uuid",
    "action": "approve",
    "notes": "Approved by manager"
  }
}
```

### Advanced Search
```javascript
// Search across multiple resources
{
  "name": "passgage_search",
  "arguments": {
    "query": "john doe",
    "resources": ["users", "departments", "leaves"],
    "limit": 10
  }
}

// Export user data
{
  "name": "passgage_export_data",
  "arguments": {
    "resource": "users",
    "format": "csv",
    "date_range": {
      "start_date": "2024-01-01",
      "end_date": "2024-12-31"
    }
  }
}
```

## API Coverage

This MCP server provides comprehensive coverage of the Passgage Public API:

- **25 Core Services** with full CRUD operations
- **Advanced Filtering** using Ransack query syntax
- **Pagination Support** for large datasets (max 50 per page)
- **File Upload** with presigned URL support
- **Approval Workflows** with single and bulk operations
- **Time Tracking** and entrance management
- **Dashboard Analytics** and reporting
- **Multi-format Export** (CSV, JSON, Excel)

## Filtering Examples

The server supports advanced Ransack-style filtering:

```javascript
{
  "filters": {
    "name_cont": "john",              // Contains "john"
    "email_eq": "user@example.com",   // Exact email match
    "created_at_gteq": "2024-01-01",  // Created after date
    "is_active_eq": true,             // Boolean exact match
    "department_id_in": ["id1","id2"] // ID in array
  }
}
```

### Available Filter Operations
- `_eq` - Equal to
- `_not_eq` - Not equal to
- `_cont` - Contains (case insensitive)
- `_in` / `_not_in` - In/not in array
- `_gt` / `_gteq` - Greater than / greater than or equal
- `_lt` / `_lteq` - Less than / less than or equal
- `_present` / `_blank` - Field present / blank
- `_null` / `_not_null` - Null / not null

## Development

### Scripts
```bash
npm run dev          # Development mode with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
npm run type-check   # TypeScript type checking
```

### Project Structure
```
src/
├── api/           # API client implementation
├── config/        # Configuration management
├── tools/         # MCP tool implementations
│   ├── auth.ts    # Authentication tools
│   ├── crud.ts    # CRUD operation tools
│   └── specialized.ts # Specialized tools
├── types/         # TypeScript type definitions
└── index.ts       # Main server entry point
```

## Error Handling

The server provides comprehensive error handling:
- **Authentication errors** - Clear messages for login failures
- **API errors** - Detailed error information from Passgage API
- **Validation errors** - Field-level validation feedback
- **Network errors** - Connection and timeout handling
- **Permission errors** - Access control feedback

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and type checking
6. Submit a pull request


## Troubleshooting

### Common Issues

**❌ Tools not appearing in Claude?**
- Restart Claude Desktop completely (quit from system tray)
- Check Node.js path: `which node` (macOS/Linux) or `where node` (Windows)
- Verify server path points to `dist/index.js`
- Test manually: `node dist/index.js`

**❌ Path issues on Windows?**
- Use double backslashes: `"C:\\Program Files\\nodejs\\node.exe"`
- Avoid paths with spaces if possible

**❌ Authentication errors?**
- Verify API key with Passgage: `deneyim@passgage.com`
- Check `PASSGAGE_BASE_URL` matches your instance
- Enable debug: `"PASSGAGE_DEBUG": "true"`

**❌ JSON syntax errors?**
- Validate at jsonlint.com
- Check for missing commas, extra quotes

### Debug Mode
```json
{
  "env": {
    "PASSGAGE_DEBUG": "true"
  }
}
```

### Getting Help
- **Technical Issues:** Create an issue in this repository
- **API Access:** Contact `deneyim@passgage.com`


## License

MIT License - see LICENSE file for details.