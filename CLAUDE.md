# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive Passgage API MCP (Model Context Protocol) Server project built with TypeScript and Node.js. The server provides 130+ tools to interact with the complete Passgage Public API surface area, enabling AI assistants like Claude to manage workforce operations, approvals, time tracking, and more.

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Development mode with hot reload using tsx
- `npm start` - Start production server from dist/
- `npm run type-check` - TypeScript type checking without compilation

### Code Quality
- `npm run lint` - Run ESLint on TypeScript files in src/ directory
- `npm run lint:fix` - Auto-fix linting issues
- `npm test` - Run Jest tests (test framework configured but no tests implemented yet)
- `npm run type-check` - TypeScript type checking without compilation (recommended before commits)

## Project Architecture

### Core Components
- **`src/api/client.ts`** - Passgage API client with JWT auth, auto-refresh, error handling
- **`src/types/api.ts`** - Complete TypeScript definitions for Passgage API
- **`src/config/index.ts`** - Environment configuration and validation
- **`src/index.ts`** - MCP server implementation with stdio transport

### Tool Categories
- **`src/tools/auth.ts`** - Authentication tools (login, logout, refresh, status)
- **`src/tools/crud.ts`** - CRUD operations for 25+ Passgage services (125 tools)
- **`src/tools/specialized.ts`** - Advanced tools (file upload, approvals, search, export)

### MCP Tools Structure
The server provides 133 total tools:
- **4 Authentication tools** - JWT session management
- **125 CRUD tools** - 5 operations × 25 services (list, get, create, update, delete)
- **8 Specialized tools** - File upload, bulk approvals, search, dashboard stats

## Configuration

### Environment Variables (.env)
```env
# Required: Choose one authentication method
PASSGAGE_API_KEY=company_api_key          # OR
PASSGAGE_USER_EMAIL=user@company.com      
PASSGAGE_USER_PASSWORD=password

# API Configuration
PASSGAGE_BASE_URL=https://api.passgage.com
PASSGAGE_TIMEOUT=30000
PASSGAGE_DEBUG=false
```

### Authentication Methods
1. **API Key** - Long-lived company-level access for integrations
2. **User Credentials** - JWT-based user authentication with auto-refresh

## API Architecture

### Services Covered (25 total)
- Users, Approvals, Approval Flows, Access Zones, Assignment Requests
- Branches, Branch Groups, Cards, Departments, Devices, Entrances
- Holidays, Job Positions, Leaves, Leave Rules, Leave Types, Night Works
- Organization Units, Shifts, Slacks, Sub Companies, User Rates
- User Shifts, Working Days, Payrolls, User Extra Works, Shift Settings

### Advanced Features
- **Ransack Filtering** - Complex query syntax with 20+ operators (_eq, _cont, _in, etc.)
- **Pagination** - Configurable page size (max 50)
- **Error Handling** - Comprehensive API error mapping
- **Type Safety** - Full TypeScript coverage
- **Auto-retry** - Intelligent JWT token refresh

## Development Patterns

### MCP Server Architecture
The server uses a class-based architecture (`PassgageMCPServer`) with:
- **Stdio Transport** - Communication via stdin/stdout for MCP protocol
- **Tool Registration** - Tools are grouped by category and registered with MCP SDK
- **Request Routing** - Tool calls are routed to appropriate handlers based on naming patterns

### Adding New Tools
1. Define tool schema with `inputSchema` in appropriate file under `src/tools/`
2. Implement handler function with consistent error handling pattern
3. Add tool name pattern to router logic in `src/index.ts` (e.g., prefix matching)
4. Update TypeScript types in `src/types/api.ts` if adding new API endpoints

### Tool Naming Convention
- **Auth tools**: `passgage_login`, `passgage_refresh_token`, `passgage_auth_status`
- **CRUD tools**: `passgage_list_{service}`, `passgage_get_{singular}`, `passgage_create_{singular}`
- **Specialized tools**: `passgage_upload_file`, `passgage_search`, `passgage_export_data`

### API Client Usage
```typescript
// The client handles authentication, retries, and error mapping
const result = await client.get('/api/public/v1/users', {
  page: 1, 
  per_page: 25,
  q: { is_active_eq: true }
});
```

### Error Handling Pattern
All tools return consistent format:
```javascript
{
  success: boolean,
  message: string,
  data?: any,
  error?: string
}
```

## Testing and Deployment

### MCP Integration
Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "passgage": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": { "PASSGAGE_API_KEY": "your_key" }
    }
  }
}
```

### Key Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol implementation with stdio transport
- `axios` - HTTP client with request/response interceptors for auth and error handling
- `dotenv` - Environment configuration management
- `tsx` - TypeScript execution for development (replaces ts-node)
- TypeScript toolchain with strict mode and Node16 module resolution

### Build Output
- **dist/** - Compiled JavaScript output from TypeScript compilation
- **dist/index.js** - Main executable entry point for production
- The server must be built (`npm run build`) before production deployment

### Environment Requirements
- **Node.js >=18.0.0** - Required for MCP SDK compatibility
- **TypeScript 5.6+** - For latest language features and strict type checking