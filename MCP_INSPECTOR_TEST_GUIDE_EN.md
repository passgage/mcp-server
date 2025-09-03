# 🔍 Passgage MCP Server Test Guide - Testing with MCP Inspector

This guide provides step-by-step instructions for testing your Passgage MCP Server using **@modelcontextprotocol/inspector**.

## 🚀 Quick Start

### 1. Prerequisites

```bash
# 1. Build the project
npm run build

# 2. Check environment file
cat .env

# 3. Ensure credentials are correct
```

### 2. Start MCP Inspector

```bash
# Run Inspector with the server
npx @modelcontextprotocol/inspector node dist/main.js
```

**Expected output:**
```
Starting MCP inspector...
⚙️ Proxy server listening on localhost:6277  
🔑 Session token: [your-token]
🚀 MCP Inspector is up and running at:
   http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=[your-token]
🌐 Opening browser...
```

## 🌐 Web Interface Usage

### Inspector Interface Sections:

1. **Tools Tab** - View all available tools (133 tools)
2. **Resources Tab** - MCP resources (if available)  
3. **Prompts Tab** - Built-in prompts
4. **Logs Tab** - Real-time communication logs

### Testing Tools:

1. **Select Tool**: Click on tool from left panel
2. **Enter Parameters**: Input required parameters in JSON format
3. **Execute**: Click "Call Tool" button
4. **View Results**: See response in right panel

## 📋 Test Scenarios

### 🔐 Authentication Tests

#### 1. Auth Status Check
```json
Tool: ping
Parameters: {}
Expected: {"success": true, "message": "Server is running"}
```

```json
Tool: passgage_auth_status  
Parameters: {}
Expected: {"success": true, "authMode": "company", "isAuthenticated": true}
```

#### 2. Mode Switching (for Dual Auth setup)
```json
Tool: passgage_switch_to_user_mode
Parameters: {}
Expected: {"success": true, "message": "Switched to user mode"}
```

```json
Tool: passgage_switch_to_company_mode  
Parameters: {}
Expected: {"success": true, "message": "Switched to company mode"}
```

### 👥 CRUD Operations Tests

#### Users Service Tests

```json
Tool: passgage_list_users
Parameters: {
  "page": 1,
  "per_page": 5
}
Expected: {"success": true, "data": {"users": [...], "pagination": {...}}}
```

```json
Tool: passgage_get_user
Parameters: {"id": 1}
Expected: {"success": true, "data": {"user": {...}}}
```

```json
Tool: passgage_create_user
Parameters: {
  "user": {
    "first_name": "Test",
    "last_name": "User", 
    "email": "test@example.com",
    "employee_number": "EMP001"
  }
}
Expected: {"success": true, "data": {"user": {...}}}
```

#### Approvals Service Tests

```json
Tool: passgage_list_approvals
Parameters: {
  "page": 1,
  "per_page": 10,
  "q": {"status_eq": "pending"}
}
Expected: {"success": true, "data": {"approvals": [...], "pagination": {...}}}
```

```json
Tool: passgage_approve_request
Parameters: {
  "id": 123,
  "comment": "Approved via MCP Inspector test"
}
Expected: {"success": true, "data": {"approval": {...}}}
```

### 🔍 Advanced Search Tests

```json
Tool: passgage_advanced_search
Parameters: {
  "service": "users",
  "query": {
    "first_name_cont": "John",
    "is_active_eq": true
  },
  "page": 1,
  "per_page": 20
}
Expected: {"success": true, "data": {"results": [...], "query_info": {...}}}
```

```json
Tool: passgage_query_builder
Parameters: {
  "service": "leaves",
  "conditions": [
    {"field": "start_date", "operator": "gteq", "value": "2024-01-01"},
    {"field": "status", "operator": "in", "value": ["approved", "pending"]}
  ]
}
Expected: {"success": true, "data": {"generated_query": {...}}}
```

### 📁 File Upload Tests

```json
Tool: passgage_generate_presigned_url
Parameters: {
  "filename": "test-document.pdf",
  "content_type": "application/pdf",
  "file_size": 1024000
}
Expected: {"success": true, "data": {"upload_url": "...", "file_id": "..."}}
```

### 📊 Specialized Operations

```json
Tool: passgage_bulk_approval
Parameters: {
  "approval_ids": [1, 2, 3],
  "action": "approve", 
  "comment": "Bulk approved via MCP Inspector"
}
Expected: {"success": true, "data": {"processed": 3, "results": [...]}}
```

## 🐛 Debugging & Troubleshooting

### Enable Debug Mode:

In `.env` file:
```env
PASSGAGE_DEBUG=true
LOG_LEVEL=debug  
LOG_FORMAT=pretty
```

### Common Issues:

#### 1. **Authentication Errors**
```json
Error: {"success": false, "error": "Invalid API key"}
```
**Solution**: Check API key in `.env` file

#### 2. **Permission Errors**  
```json
Error: {"success": false, "error": "Insufficient permissions"}
```
**Solution**: Switch auth mode or use different credentials

#### 3. **Network Errors**
```json
Error: {"success": false, "error": "Request timeout"}
```
**Solution**: Increase `PASSGAGE_TIMEOUT` value

#### 4. **Tool Not Found**
```json
Error: {"error": "Unknown tool: invalid_tool_name"}
```
**Solution**: Check tool name with `passgage_list_tools`

### Log Monitoring:

```bash
# Monitor server logs in terminal
# (while Inspector is running in separate terminal)

# Check background process stdout:
# Process ID: 88df30 (example)
```

## 🎯 Test Checklist

### ✅ Basic Tests:
- [ ] Server startup (`ping` tool works)
- [ ] Auth status check
- [ ] Tool list retrieved (133 tools visible)

### ✅ Authentication Tests:
- [ ] Company mode works
- [ ] User mode works (if credentials available)
- [ ] Mode switching works

### ✅ CRUD Tests:
- [ ] Users: list, get, create, update, delete
- [ ] Approvals: list, get, approve, reject
- [ ] Leaves: list, get, create, update
- [ ] Departments: list, get, create

### ✅ Advanced Features:
- [ ] Advanced search works
- [ ] Query builder works
- [ ] File upload presigned URL works
- [ ] Bulk operations work

### ✅ Error Handling:
- [ ] Invalid parameters return errors
- [ ] Auth errors properly handled
- [ ] Network timeouts work

## 🔧 Advanced Usage

### Custom Test Scripts:

For automated testing of tools in Inspector:

```javascript
// Can be run in browser console
const testAuth = async () => {
  const authStatus = await callTool('passgage_auth_status', {});
  console.log('Auth Status:', authStatus);
  
  const users = await callTool('passgage_list_users', {page: 1, per_page: 5});
  console.log('Users:', users);
};

testAuth();
```

### Performance Testing:

```javascript
// Multiple parallel requests
const performanceTest = async () => {
  const startTime = performance.now();
  
  const promises = [
    callTool('passgage_list_users', {}),
    callTool('passgage_list_approvals', {}),
    callTool('passgage_list_leaves', {}),
    callTool('passgage_list_departments', {})
  ];
  
  const results = await Promise.all(promises);
  const endTime = performance.now();
  
  console.log(`Test completed in ${endTime - startTime}ms`);
  console.log('Results:', results);
};
```

## 📱 Mobile/Remote Testing

Inspector web interface is responsive for mobile device testing:

```bash
# For access from other devices on network:
# Get local IP address
ifconfig | grep inet

# Start Inspector with external access
npx @modelcontextprotocol/inspector --host 0.0.0.0 node dist/main.js
```

## 🔒 Production Testing

For testing in production environment:

```bash
# With session-based auth
NODE_ENV=production npx @modelcontextprotocol/inspector node dist/main.js

# Or with environment-specific config
cp configs/claude-desktop-remote-production.json .env
npx @modelcontextprotocol/inspector node dist/main.js
```

---

## 💡 Tips & Best Practices

1. **Start with basics**: Always begin with `ping` and `passgage_auth_status`
2. **Test error handling**: Also test error scenarios (invalid IDs, empty parameters)
3. **Rate limiting**: Don't send too many requests, API may have rate limits
4. **Data cleanup**: Remember to delete test data (`delete` operations)
5. **Log monitoring**: Follow logs in debug mode
6. **Browser dev tools**: Monitor MCP communication in Network tab

## 📚 Tool Reference

### Authentication Tools (8 tools):
- `passgage_login` - User login
- `passgage_logout` - Logout
- `passgage_auth_status` - Check auth status
- `passgage_refresh_token` - Refresh token
- `passgage_switch_to_company_mode` - Switch to company mode
- `passgage_switch_to_user_mode` - Switch to user mode

### CRUD Tools (125 tools - 25 services × 5 operations):
**Services**: Users, Approvals, Leaves, Departments, Shifts, Cards, etc.
- `passgage_list_{service}` - List records
- `passgage_get_{singular}` - Get single record
- `passgage_create_{singular}` - Create new record
- `passgage_update_{singular}` - Update record
- `passgage_delete_{singular}` - Delete record

### Specialized Tools (8 tools):
- `passgage_upload_file` - File upload
- `passgage_advanced_search` - Advanced search
- `passgage_bulk_approval` - Bulk approval
- `passgage_dashboard_stats` - Dashboard statistics
- `passgage_query_builder` - Build complex queries
- `passgage_explain_operators` - Explain search operators

## 🔄 Workflow Examples

### Complete User Management Test Flow:
1. `passgage_auth_status` - Check authentication
2. `passgage_list_users` - Get current users
3. `passgage_create_user` - Create test user
4. `passgage_get_user` - Retrieve created user
5. `passgage_update_user` - Update user details
6. `passgage_delete_user` - Clean up test data

### Approval Workflow Test:
1. `passgage_list_approvals` - Get pending approvals
2. `passgage_get_approval` - Get specific approval details
3. `passgage_approve_request` - Approve request
4. `passgage_bulk_approval` - Test bulk operations

### Advanced Search Test:
1. `passgage_explain_operators` - Understand available operators
2. `passgage_query_builder` - Build complex query
3. `passgage_advanced_search` - Execute search
4. Test various filter combinations

Happy Testing! 🚀