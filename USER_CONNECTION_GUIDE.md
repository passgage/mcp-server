# 👥 Global Passgage MCP Server - User Connection Guide

Complete guide for connecting your Claude Desktop to the global Passgage MCP server and managing your workforce data.

## 🎯 Overview

The global Passgage MCP server allows you to connect Claude Desktop directly to your Passgage account without running any local software. Multiple users can safely share the same server instance with complete data isolation.

### Key Benefits
- ✅ **No local installation** - Connect directly to global server
- ✅ **Your data only** - Complete user isolation and privacy
- ✅ **Always updated** - Latest tools and features automatically
- ✅ **Global availability** - Fast access worldwide via Cloudflare
- ✅ **Secure sessions** - Encrypted credential storage

## 🚀 Quick Start (5 Minutes)

### Step 1: Get Your Server URL
Contact your administrator for the global server URL:
```
https://passgage-global-mcp.your-company.workers.dev/mcp
```

### Step 2: Initial Claude Desktop Setup
Add this to your Claude Desktop configuration:

**Config file locations:**
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "passgage": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://passgage-global-mcp.your-company.workers.dev/mcp",
        "-H", "Content-Type: application/json",
        "-d", "@-"
      ]
    }
  }
}
```

### Step 3: Restart Claude Desktop
1. Completely quit Claude Desktop
2. Restart Claude Desktop
3. Start a new conversation

### Step 4: Authenticate
In Claude, run:
```
Please login to my Passgage account using email: your@email.com and password: your-password
```

Claude will use the `passgage_session_login` tool and provide you with a session ID.

### Step 5: Update Configuration
Add the session ID to your config:
```json
{
  "mcpServers": {
    "passgage": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://passgage-global-mcp.your-company.workers.dev/mcp",
        "-H", "Content-Type: application/json",
        "-H", "X-Session-ID: sess_lx3k9_a8b7c6d5e4f3",
        "-d", "@-"
      ]
    }
  }
}
```

### Step 6: Restart and Start Using!
Restart Claude Desktop and you're ready to use all Passgage tools!

## 🔐 Authentication Methods

### User Mode (Most Common)
Perfect for individual employees accessing their own data:

```json
{
  "email": "john.smith@company.com",
  "password": "secure_password"
}
```

**What you can do:**
- ✅ View your own profile and settings
- ✅ Submit leave requests
- ✅ Check leave balances
- ✅ View your shifts and schedules
- ✅ Track your time and attendance
- ❌ Cannot see other employees' data
- ❌ Cannot approve requests

### Company Mode (Admins/HR)
For administrators and HR personnel with company-wide access:

**Setup:** Contact your IT administrator to get company API key, then:
```
Please switch to company mode and use my company API key
```

**What you can do:**
- ✅ Everything from User Mode
- ✅ Manage all employees
- ✅ Approve/reject requests
- ✅ Create new users
- ✅ Generate company reports
- ✅ Bulk operations

## 🛠️ Common Commands

### Authentication Management
```
"Check my authentication status"
"Switch to user mode"
"Switch to company mode" 
"Refresh my session"
```

### User & HR Management
```
"Show me all pending leave requests"
"List employees in the Engineering department"
"Create a leave request for next Friday"
"Check my leave balance"
"Show my upcoming shifts"
```

### Reporting & Analytics
```
"Generate attendance report for last month"
"Show department overtime statistics"
"Export user data to CSV"
"Get dashboard statistics"
```

### Advanced Operations
```
"Help me onboard a new employee named Sarah Johnson"
"Bulk approve all reasonable leave requests from this week"
"Analyze attendance patterns for Q4"
```

## 🔧 Troubleshooting

### "Tools not found" or "Server not responding"

**Check 1: Config file syntax**
```bash
# Validate your JSON
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
```

**Check 2: Server URL**
Test the server directly:
```bash
curl -X POST https://your-server-url/health
# Should return: {"status": "healthy", ...}
```

**Check 3: Restart process**
1. Quit Claude Desktop completely (from system tray)
2. Wait 10 seconds
3. Start Claude Desktop
4. Try a new conversation

### "Authentication required" errors

**Common causes:**
- Session expired (sessions last 8 hours)
- Missing X-Session-ID header in config
- Invalid credentials

**Solutions:**
1. Re-authenticate:
   ```
   Please login again with my Passgage credentials
   ```

2. Update config with new session ID

3. Check with your administrator if credentials changed

### "Rate limit exceeded" errors

**Cause:** Too many requests in short time (protection against abuse)

**Solution:**
- Wait 1-2 minutes
- Reduce request frequency
- Contact admin if persistent

### Permission Errors

**"This operation requires company-level access"**

**Solutions:**
- Switch to company mode: `"Switch to company mode"`
- Contact HR/admin for company API key access
- Use user-specific alternatives

**"Cannot switch to company mode"**

**Cause:** No company API key configured

**Solution:** Contact your administrator to:
1. Get company API key
2. Create new session with both credentials:
   ```
   Please create a session with both my user credentials and company API key
   ```

## 📊 Session Management

### Understanding Sessions
- **Session ID**: Unique identifier for your connection
- **Expiry**: 8 hours of inactivity
- **Security**: Credentials encrypted in server storage
- **Isolation**: Your session is completely separate from others

### Session Commands
```bash
# Check session status
"Check my session status"

# List session info
"Show my session details"

# Switch between modes (if you have both credentials)
"Switch to company mode"
"Switch to user mode"
```

### Session Renewal
When your session expires:
1. You'll get authentication errors
2. Simply re-authenticate: `"Please login again"`  
3. Update your config with the new session ID
4. Restart Claude Desktop

## 🔒 Security & Privacy

### Data Protection
- **Encryption**: All credentials encrypted with AES-256
- **Isolation**: Complete separation between users
- **No logging**: Personal data never logged
- **Secure transport**: HTTPS-only communication

### What's Shared vs Private

**Shared (with server operator):**
- ❌ Request frequency and patterns
- ❌ Error rates and performance metrics
- ❌ Session creation/expiry events

**Private (never shared):**
- ✅ Your Passgage credentials
- ✅ Your workforce data
- ✅ Specific request contents
- ✅ Personal information

### Best Practices
1. **Strong passwords**: Use secure Passgage passwords
2. **Regular sessions**: Let sessions expire after work
3. **Shared computers**: Always logout on shared devices
4. **Monitor access**: Check session status regularly

## 📈 Advanced Usage

### Workflow Automation
```bash
# Morning routine
"Check my pending approvals and today's schedule"

# Weekly reports
"Generate my team's attendance summary for this week"

# Bulk operations
"Process all pending leave requests with recommendations"
```

### Integration with Other Tools
```bash
# Export for Excel analysis
"Export overtime data to CSV for Q4 analysis"

# Data for presentations
"Generate department statistics for board meeting"
```

### Custom Prompts
The server includes built-in prompts for common workflows:

```bash
# Onboarding workflow
"Help me with employee onboarding process"

# Troubleshooting
"I'm having issues with leave requests, please troubleshoot"

# API exploration  
"Show me what I can do with the Passgage API"
```

## 💡 Tips & Best Practices

### Efficient Usage
- **Batch requests**: Ask for multiple items at once
- **Specific queries**: Be precise about date ranges and departments
- **Use filters**: Narrow down results with specific criteria

### Example Efficient Requests
```bash
# Instead of multiple requests
"Show me leave requests from John, Sarah, and Mike for this week"

# Instead of vague requests  
"List all sick leave requests from Engineering department submitted in December 2024"

# Use date ranges
"Generate attendance report for Sales team between Dec 1-15, 2024"
```

### Staying Organized
- **Regular cleanup**: Archive old leave requests
- **Consistent naming**: Use standard department/position names
- **Document changes**: Keep track of policy updates

## 🆘 Getting Help

### Built-in Help
```bash
"What Passgage tools are available?"
"Help me troubleshoot authentication issues"  
"Show me examples of leave management workflows"
```

### Support Channels

**For Authentication Issues:**
- Contact: `deneyim@passgage.com`
- Include: Your email and approximate time of issue

**For Server Issues:**
- Contact: Your IT administrator
- Include: Error messages and session ID

**For Feature Requests:**
- GitHub Issues: Create feature requests
- Include: Use case and expected behavior

### Common Questions

**Q: Can I use this with multiple Passgage accounts?**
A: Yes! Create separate sessions for each account and switch between them.

**Q: How long do sessions last?**
A: 8 hours of inactivity. Active usage extends the session automatically.

**Q: Is my data safe on the global server?**
A: Yes! Credentials are encrypted, and your data never touches the server - it goes directly from Passgage API to Claude.

**Q: Can my colleagues see my requests?**
A: No! Each user has complete isolation. Even server administrators cannot see your workforce data.

**Q: What happens if the server goes down?**
A: You can switch to local deployment or wait for service restoration. Your sessions are safely stored and will resume when available.

## 🚀 Next Steps

### Power User Features
Once comfortable with basics, explore:
- **Bulk operations**: Process multiple items efficiently
- **Advanced filters**: Complex queries with Ransack syntax
- **Workflow automation**: Chain multiple operations
- **Custom reporting**: Generate specific analytics

### Integration Opportunities
- **Calendar systems**: Sync leave requests with calendars
- **Reporting tools**: Export data for analysis
- **Notification systems**: Alert on important changes

### Stay Updated
- Server features update automatically
- New tools become available without configuration changes
- Check announcements for new capabilities

---

**Ready to get started?** Follow the Quick Start guide above and you'll be using Passgage with Claude in under 5 minutes! 🎉