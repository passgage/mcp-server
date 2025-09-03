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

### Core Components
- **`src/main.ts`** - Main MCP server entry point (production executable)
- **`src/api/client.ts`** - Passgage API client with JWT auth, auto-refresh, error handling
- **`src/types/api.ts`** - Complete TypeScript definitions for Passgage API
- **`src/config/`** - Configuration management (env.ts, logger.ts, index.ts)
- **`src/tools/index.ts`** - Tool registry and orchestration
- **`src/resources/index.ts`** - Resource registry for MCP resources
- **`src/prompts/index.ts`** - Prompt registry with built-in troubleshooting/onboarding prompts

### Tool Structure (Modern Architecture)
- **`src/tools/passgage/`** - Service-specific tool implementations (users-service.tool.ts, etc.)
- **`src/tools/auth.tool.ts`** - Authentication tools (login, logout, refresh, status)
- **`src/tools/base.tool.ts`** - Base tool class with common functionality
- **Legacy tools** - `auth.ts`, `crud.ts`, `specialized.ts` (may be deprecated)

### MCP Tools Structure
The server provides 133 total tools:
- **8 Authentication tools** - JWT session and mode management
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
- **Type Safety** - Full TypeScript coverage with strict mode
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
3. Add tool name pattern to router logic in `src/index.ts:61-81` (prefix matching)
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

### Test Configuration
- **Jest** with ts-jest preset for ESM modules (NODE_OPTIONS='--experimental-vm-modules' required)
- Test files in `__tests__/` directory
- Coverage reporting to `coverage/` directory
- Run specific test file: `npm test __tests__/path/to/test.ts`
- Run by pattern: `npm test -- --testNamePattern="pattern"`
- Run single test suite: `npm test __tests__/utils/errors.test.ts`

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
- TypeScript 5.6+ with strict mode and Node16 module resolution

### Build Output
- **dist/** - Compiled JavaScript output from TypeScript compilation
- **dist/main.js** - Main executable entry point for production (CLI binary)
- **dist/index.js** - Legacy entry point (may be deprecated)
- The server must be built (`npm run build`) before production deployment

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
- Entry point is `src/main.ts` (not `src/index.ts`)
- Binary target is `dist/main.js` configured in package.json
- Build must complete successfully before running tests or deployment

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

      
      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.