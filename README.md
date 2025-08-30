# Passgage MCP Server

A comprehensive Model Context Protocol (MCP) server for integrating with the Passgage Public API. This server provides 100+ tools to interact with all aspects of the Passgage workforce management system through Claude and other MCP-compatible AI assistants.

## Features

### Authentication
- **JWT-based user authentication** with automatic token refresh
- **API key authentication** for system integrations
- **Session management** with automatic logout

### Core CRUD Operations (125 tools)
Complete create, read, update, delete operations for all Passgage services:
- **Users** - User management and profiles
- **Approvals** - Approval workflow management
- **Approval Flows** - Workflow configuration
- **Access Zones** - Security zone management
- **Assignment Requests** - Staff assignment/rotation
- **Branches** - Location/branch management
- **Branch Groups** - Branch grouping system
- **Cards** - Access card management
- **Departments** - Department hierarchy
- **Devices** - Device/hardware management
- **Entrances** - Entry point tracking
- **Holidays** - Holiday calendar management
- **Job Positions** - Role/position management
- **Leaves** - Leave request management
- **Leave Rules & Types** - Leave policy management
- **Night Works** - Night shift management
- **Organization Units** - Organizational structure
- **Shifts** - Shift scheduling and management
- **Slacks** - Slack time management
- **Sub Companies** - Multi-company support
- **User Rates** - Rate/compensation management
- **User Shifts** - Individual shift assignments
- **Working Days** - Working day configurations
- **Payrolls** - Payroll data access
- **User Extra Works** - Overtime/extra work tracking
- **Shift Settings** - Shift configuration management

### Specialized Tools (8 tools)
- **File Upload** - Document and image upload with presigned URLs
- **Approval Actions** - Single and bulk approval/rejection
- **Staff Assignment** - User-to-shift assignments
- **Time Tracking** - Entrance/exit event recording
- **Universal Search** - Cross-resource search functionality
- **Data Export** - CSV, JSON, Excel export capabilities
- **Dashboard Statistics** - Key metrics and analytics

### Advanced Features
- **Dual authentication modes** - Switch between company and user access
- **Permission-based access control** - Tools restricted based on authentication mode
- **Ransack-style filtering** - Advanced query capabilities
- **Pagination support** - Handle large datasets efficiently
- **Error handling** - Comprehensive error management
- **Type safety** - Full TypeScript implementation
- **Auto-retry logic** - Automatic token refresh
- **Debug mode** - Detailed logging for development

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

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd passgage-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Passgage API credentials
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

## Configuration

### Environment Variables

Create a `.env` file with your configuration:

```env
# Required: API Authentication (choose one)
PASSGAGE_API_KEY=your_api_key_here           # For system/company-level access
# OR
PASSGAGE_USER_EMAIL=user@example.com         # For user-level access
PASSGAGE_USER_PASSWORD=your_password

# Required: API Configuration
PASSGAGE_BASE_URL=https://api.passgage.com   # Default: https://api.passgage.com

# Optional: Performance Settings
PASSGAGE_TIMEOUT=30000                       # Request timeout in ms (default: 30000)
PASSGAGE_DEBUG=false                         # Enable debug logging (default: false)
```

### Authentication Methods

The MCP server supports **dual authentication modes** that can be switched dynamically:

#### 1. Company Mode (System Integration)
```env
PASSGAGE_API_KEY=your_company_api_key
PASSGAGE_DEFAULT_AUTH_MODE=company
```
**Features:**
- **Full admin access** to all company data and users
- **Long-lived authentication** - no token refresh needed
- **All operations allowed** - create, update, delete users, manage departments, etc.
- **Best for:** System integrations, admin operations, bulk data management

#### 2. User Mode (Personal Access)
```env
PASSGAGE_USER_EMAIL=user@company.com
PASSGAGE_USER_PASSWORD=secure_password
PASSGAGE_DEFAULT_AUTH_MODE=user
```
**Features:**
- **Limited personal access** - user's own data and permissions
- **JWT token-based** with automatic refresh
- **Restricted operations** - cannot manage other users, departments, payroll data
- **Best for:** Personal use, individual employee operations

#### 3. Dual Mode Setup (Recommended)
```env
# Configure both authentication methods
PASSGAGE_API_KEY=your_company_api_key
PASSGAGE_USER_EMAIL=user@company.com  
PASSGAGE_USER_PASSWORD=secure_password
PASSGAGE_DEFAULT_AUTH_MODE=company
```
**Features:**
- **Switch between modes** using authentication tools
- **Best of both worlds** - admin access when needed, personal access when appropriate
- **Flexible permissions** based on current context

## Usage

### Starting the Server

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

### Integration with Claude Desktop

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "passgage": {
      "command": "node",
      "args": ["/path/to/passgage-mcp-server/dist/index.js"],
      "env": {
        "PASSGAGE_API_KEY": "your_api_key_here"
      }
    }
  }
}
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

## Support

For issues and questions:
- **API Documentation**: Check the Passgage API documentation
- **API Access**: Contact deneyim@passgage.com for API keys
- **Server Issues**: Create an issue in this repository

## License

MIT License - see LICENSE file for details.