# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive Passgage API MCP (Model Context Protocol) Server built with TypeScript and Node.js. The server provides 130+ tools to interact with the complete Passgage Public API surface area, enabling AI assistants like Claude to manage workforce operations, approvals, time tracking, and more.

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Development mode with hot reload using tsx
- `npm start` - Start production server from dist/main.js (note: main.js not index.js)
- `npm run type-check` - TypeScript type checking without compilation

### Code Quality
- `npm run lint` - Run ESLint on TypeScript files in src/ directory
- `npm run lint:fix` - Auto-fix linting issues
- `npm test` - Run Jest tests with NODE_OPTIONS='--experimental-vm-modules'
- `npm test -- --testNamePattern="pattern"` - Run specific test by pattern
- `npm run type-check` - TypeScript type checking (recommended before commits)

## Project Architecture

### Modern MCP Server Architecture
The server uses a **registry-based architecture** with three main registries for managing different MCP capabilities:

- **`src/main.ts`** - Modern bootstrap entry point with registry orchestration
- **`src/index.ts`** - Legacy class-based entry point (`PassgageMCPServer`) - still functional
- **`src/api/client.ts`** - Passgage API client with JWT auth, auto-refresh, session management
- **`src/types/api.ts`** - Complete TypeScript definitions for Passgage API
- **`src/config/`** - Configuration management with logger using Pino
- **`src/transports/`** - Transport layer (stdio, HTTP) for MCP protocol
- **`src/utils/`** - Validation, error handling, session management utilities

### Registry System (Modern Architecture)
- **`ToolRegistry` (`src/tools/index.ts`)** - Auto-discovers and manages 130+ tools with permission checking
- **`ResourceRegistry` (`src/resources/index.ts`)** - Provides server health, configuration resources
- **`PromptRegistry` (`src/prompts/index.ts`)** - Built-in workflow prompts (onboarding, troubleshooting, analytics)

### Tool Architecture
- **`src/tools/base.tool.ts`** - Abstract base class with consistent response patterns and permission checking
- **`src/tools/auth.tool.ts`** - Authentication tools (login, logout, refresh, mode switching)
- **`src/tools/session-auth.tool.ts`** - Session-based authentication for remote deployments
- **`src/tools/ping.tool.ts`** - Health check and connectivity testing
- **`src/tools/prompt-discovery.tool.ts`** - Prompt discovery and help tools
- **Service-specific tools in `src/tools/passgage/`**:
  - `users-service.tool.ts` - User CRUD + device/zone assignment
  - `approvals-service.tool.ts` - Approval workflows + bulk operations
  - `leaves-service.tool.ts` - Leave management + balance checking
  - `file-upload.tool.ts` - File handling with presigned URLs
  - `advanced-search.tool.ts` - Cross-resource search with query builder

### Legacy Tool System (Still Available)
- **`src/tools/auth.ts`** - Legacy auth tool handlers
- **`src/tools/crud.ts`** - Legacy CRUD operation handlers  
- **`src/tools/specialized.ts`** - Legacy specialized operation handlers

### Modern MCP Capabilities

#### Resources System
The server exposes resources via MCP resource protocol:
- **`passgage://health`** - Real-time server health, memory usage, API connectivity status
- **`passgage://config`** - Non-sensitive server configuration (transport, debug mode, versions)

#### Prompts System  
Built-in interactive prompts for common workflows:
- **Troubleshooting prompts** - `troubleshoot` - guided API debugging with context
- **Onboarding prompts** - `onboard` - setup walkthrough for new deployments  
- **API Explorer prompts** - `explore` - discover capabilities by feature area
- **Workflow prompts** - Leave management, employee onboarding, department analytics
- **Prompt Discovery tools** - `passgage_list_prompts`, `passgage_suggest_prompts`, `passgage_prompt_help`

#### Session Management (Remote Deployments)
Advanced authentication handling for cloud/remote MCP deployments:
- **SessionManager** (`src/utils/session.ts`) - secure credential storage without environment exposure
- **Session-based auth tools** - create/manage authentication sessions with timeout
- **Credential encryption** - secure storage of API keys and user passwords
- **Auto-cleanup** - expired session management and memory optimization

### MCP Tools Structure  
The server provides 130+ total tools:
- **6-8 Authentication tools** - JWT session, mode management, session auth
- **125+ CRUD tools** - 5 operations × 25+ services (list, get, create, update, delete)
- **10+ Specialized tools** - File upload, bulk approvals, search, dashboard stats, prompt discovery

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
- **Type Safety** - Full TypeScript coverage with strict mode
- **Auto-retry** - Intelligent JWT token refresh

## Development Patterns

### MCP Server Architecture
The server supports **dual architectures** for different deployment needs:

#### Modern Registry Architecture (`src/main.ts`)
- **Bootstrap function** - Initializes API client and three registries
- **ToolRegistry** - Auto-discovers tools, handles permissions, manages 130+ tools
- **ResourceRegistry** - Exposes health/config resources via MCP resource protocol
- **PromptRegistry** - Provides workflow prompts with context-aware rendering
- **Transport abstraction** - Supports stdio, HTTP transports via `src/transports/`

#### Legacy Class Architecture (`src/index.ts`)  
- **PassgageMCPServer class** - Single class handling all MCP operations
- **Manual tool registration** - Explicit tool creation and routing
- **Prefix-based routing** - Tool calls routed by name pattern matching
- **Direct stdio transport** - Uses MCP SDK `StdioServerTransport` directly

### Adding New Tools

#### Modern Approach (Recommended)
1. **Create tool class** extending `BaseTool` in appropriate service directory (`src/tools/passgage/`)
2. **Implement required methods** - `getMetadata()`, `getInputSchema()`, `execute()`, `toMCPTool()`
3. **Add to service registration** in `ToolRegistry.registerXServiceTools()` method
4. **Auto-discovery** - Tools are automatically discovered and permission-checked

#### Legacy Approach  
1. Define tool schema with `inputSchema` in `src/tools/auth.ts|crud.ts|specialized.ts`
2. Implement handler function with consistent error handling pattern
3. Add tool name pattern to router logic in `src/index.ts:61-81` (prefix matching)
4. Update TypeScript types in `src/types/api.ts` if adding new API endpoints

#### Tool Development Patterns
- **Extend BaseTool** - Provides consistent response patterns (`successResponse`, `errorResponse`) 
- **Permission checking** - Automatic validation against company/user mode requirements
- **Validation** - Use Zod schemas for input validation with descriptive error messages
- **Error handling** - Use `PassgageError` hierarchy for consistent error responses

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

### Test Configuration
- **Jest** with ts-jest preset for ESM modules (NODE_OPTIONS='--experimental-vm-modules' required)
- Test files in `__tests__/` directory
- Coverage reporting to `coverage/` directory
- Run specific test file: `npm test __tests__/path/to/test.ts`
- Run by pattern: `npm test -- --testNamePattern="pattern"`
- Run single test suite: `npm test __tests__/utils/errors.test.ts`

### MCP Integration
Add to Claude Desktop config (choose architecture):

#### Modern Registry Architecture (Recommended)
```json
{
  "mcpServers": {
    "passgage": {
      "command": "node", 
      "args": ["./dist/main.js"],
      "env": { "PASSGAGE_API_KEY": "your_key" }
    }
  }
}
```

#### Legacy Class Architecture
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
- TypeScript 5.6+ with strict mode and Node16 module resolution

### Build Output
- **dist/** - Compiled JavaScript output from TypeScript compilation  
- **dist/main.js** - Modern registry-based entry point (recommended for new deployments)
- **dist/index.js** - Legacy class-based entry point (still maintained for compatibility)
- **package.json** - Binary configured as `passgage-mcp-server` pointing to `./dist/main.js`
- The server must be built (`npm run build`) before production deployment

### Development vs Production Entry Points
- **Development**: Use `npm run dev` (runs `tsx src/main.ts`) or `npm run dev:main`
- **Legacy development**: `npm run dev:old` (runs `tsx src/index.ts`)
- **Production**: `npm start` (runs `node dist/main.js`) or `node dist/index.js` for legacy

### Environment Requirements
- **Node.js >=22.0.0** - Required for MCP SDK compatibility (see package.json:61)
- **TypeScript 5.6+** - For latest language features and strict type checking

## Key Development Patterns

### Error Handling Architecture
The codebase uses a sophisticated error handling system in `src/utils/errors.ts`:

- **PassgageError** - Base error class with constructor overloading for (message, code, details) or (message, code, statusCode, details)
- **Circular reference handling** - toJSON() method safely handles circular objects without throwing
- **Error mapping** - createErrorFromResponse() maps HTTP status codes to specific error types
- **Error inheritance** - ValidationError, AuthenticationError, NotFoundError, etc. extend PassgageError

### Validation Patterns
Comprehensive validation utilities in `src/utils/validation.ts`:

- **Zod integration** - validateInput() and safeParse() for schema validation
- **Individual validators** - validateEmail(), validateUUID(), validateDate(), validateRequired()
- **Schema creation** - createValidationSchema() for dynamic schema generation
- **Ransack validation** - validateRansackQuery() for complex API query validation

### API Client Architecture
The PassgageAPIClient (`src/api/client.ts`) implements:

- **Dual authentication modes** - Company API key vs User JWT tokens
- **Automatic token refresh** - JWT tokens auto-refresh with proper error handling
- **Request/response interceptors** - Comprehensive logging and error handling
- **Method consistency** - setApiKey(), getAuthMode(), hasValidAuth(), isAuthenticated()

### Testing Practices
When working with tests, be aware of:

- **ES Modules configuration** - All tests require NODE_OPTIONS='--experimental-vm-modules'
- **Mock patterns** - winston, MCP SDK components use specific mocking approaches
- **Async imports** - Use `await import()` instead of require() in ES module tests
- **Test isolation** - Each test file uses beforeEach/afterEach for clean state

### Common Development Issues

#### TypeScript Configuration
- Uses `"module": "Node16"` with `.js` imports for ES modules
- Strict mode enabled with comprehensive type checking
- All imports must use `.js` extension even for `.ts` files

#### Test Mocking Patterns
- **Winston logger** - Mock at module level with jest.mock() before imports
- **MCP SDK** - Components require manual mock implementation 
- **Circular references** - Handle with WeakSet pattern in JSON serialization

#### Build Process
- **Primary entry point**: `src/main.ts` (modern registry architecture)
- **Legacy entry point**: `src/index.ts` (class-based architecture)  
- **Binary target**: `dist/main.js` configured in package.json
- **Build requirement**: Must complete successfully before running tests or deployment

#### Permission System Architecture
The modern architecture includes sophisticated permission management:
- **BaseTool.checkPermissions()** - Automatic validation against auth modes
- **Tool metadata** - Declarative permission requirements (`companyMode`, `userMode`)  
- **Runtime validation** - Tools check current authentication context before execution
- **Error responses** - Consistent permission denied messages with actionable guidance

#### Enhanced Error Handling
Recent improvements to error handling (`src/utils/errors.ts`):
- **PassgageError hierarchy** - Structured error types (Auth, Validation, NotFound, etc.)
- **Circular reference protection** - Safe JSON serialization using WeakSet pattern
- **Constructor overloading** - Flexible error creation with (message, code, details) or (message, code, statusCode, details)
- **API error mapping** - Automatic conversion of HTTP status codes to appropriate error types
- **Tool error formatting** - Consistent error response structure across all tools

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

      
      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.