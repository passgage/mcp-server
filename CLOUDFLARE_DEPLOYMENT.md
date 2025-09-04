# Cloudflare Workers Global MCP Server Deployment Guide

This guide shows how to deploy the Passgage MCP Server as a global, multi-user service on Cloudflare Workers.

## 🎯 Overview

The global deployment allows multiple users to connect their Claude Desktop to a single MCP server instance. Each user authenticates with their own Passgage credentials and only sees their own data.

### Key Features
- **Multi-user isolation** - Each user has their own session
- **Session persistence** - Uses Cloudflare KV for session storage
- **Auto-scaling** - Handles thousands of concurrent users
- **Rate limiting** - Built-in abuse protection
- **Global CDN** - Low latency worldwide

## 🚀 Quick Deployment

### 1. Prerequisites

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Clone and build
git clone <repo-url>
cd mcp-server
npm install
npm run build
```

### 2. Setup KV Storage

```bash
# Create KV namespaces for different environments
wrangler kv:namespace create "PASSGAGE_SESSIONS"
wrangler kv:namespace create "PASSGAGE_SESSIONS" --preview

# Update wrangler.toml with the returned IDs
```

### 3. Configure Secrets

```bash
# Optional: Set encryption key for enhanced security
wrangler secret put ENCRYPTION_KEY
# Enter a 64-character hex string for AES-256 encryption
```

### 4. Deploy

```bash
# Deploy to development
wrangler deploy --env development

# Deploy to production
wrangler deploy --env production
```

## 📋 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PASSGAGE_BASE_URL` | `https://api.passgage.com` | Passgage API endpoint |
| `PASSGAGE_TIMEOUT` | `30000` | API timeout in milliseconds |
| `PASSGAGE_DEBUG` | `false` | Enable debug logging |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (1 minute) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `SESSION_TIMEOUT_HOURS` | `8` | Session expiry time |

### KV Storage

Sessions are stored in Cloudflare KV with automatic expiration. No manual cleanup required.

## 🔗 User Connection

### Claude Desktop Configuration

Users add this to their Claude Desktop config:

```json
{
  "mcpServers": {
    "passgage": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://your-worker.your-subdomain.workers.dev/mcp",
        "-H", "Content-Type: application/json",
        "-H", "X-Session-ID: USER_SESSION_ID",
        "-d", "@-"
      ]
    }
  }
}
```

### User Onboarding Flow

1. **Initial Connection**: User connects without session ID
2. **Authentication**: Claude shows authentication tool
3. **Login**: User runs `passgage_session_login` with their credentials
4. **Session Created**: User receives session ID 
5. **Update Config**: User adds session ID to Claude config
6. **Ready**: User can now use all Passgage tools

### Authentication Example

```typescript
// User runs this in Claude
await tool('passgage_session_login', {
  email: 'user@company.com',
  password: 'secure_password'
});

// Response includes session ID:
{
  "sessionId": "sess_lx3k9_a8b7c6d5e4f3",
  "authMode": "user",
  "expiresAt": "2024-01-01T16:00:00.000Z",
  "instructions": {
    "message": "Session created successfully!",
    "usage": [
      "Add X-Session-ID header to HTTP requests",
      "Session will auto-expire after 8 hours"
    ]
  }
}
```

## 🛡️ Security Features

### Session Security
- **Encrypted credentials** - AES-256-CBC encryption in KV storage
- **Secure session IDs** - Cryptographically secure generation
- **Auto-expiration** - Sessions expire automatically
- **Isolation** - Complete user data separation

### Rate Limiting
- **Per-IP limits** - Prevents abuse from single sources
- **Configurable windows** - Adjust limits per environment
- **Cloudflare integration** - Uses Cloudflare IP headers

### Access Control
- **Permission checking** - Each tool validates user permissions
- **Auth mode switching** - Users can switch between company/user modes
- **Session validation** - All requests validate session status

## 📊 Monitoring

### Health Endpoints

```bash
# Health check
curl https://your-worker.workers.dev/health

# Server statistics
curl https://your-worker.workers.dev/stats
```

### Cloudflare Dashboard
- Monitor request volume and errors
- Track KV storage usage
- View performance metrics
- Set up alerts

### Logging
- Structured logging with request IDs
- Error tracking and reporting
- Session creation/expiration events
- Rate limit violations

## 🔧 Advanced Configuration

### Custom Domain

```toml
# In wrangler.toml
[env.production]
routes = [
  { pattern = "passgage-api.yourcompany.com/*", zone_name = "yourcompany.com" }
]
```

### Enhanced Security

```bash
# Custom encryption key
wrangler secret put ENCRYPTION_KEY

# API-specific timeouts
wrangler secret put PASSGAGE_TIMEOUT
```

### Scaling Configuration

```toml
# In wrangler.toml
[placement]
mode = "smart"  # Use Cloudflare's smart placement

[limits]
cpu_ms = 50000  # Max 50 seconds per request
```

## 🐛 Troubleshooting

### Common Issues

**"KV namespace not found"**
```bash
# Recreate KV namespace
wrangler kv:namespace create "PASSGAGE_SESSIONS"
# Update wrangler.toml with new ID
```

**"Session not found"** 
- Sessions expire after 8 hours
- User needs to re-authenticate
- Check KV storage limits

**Rate limiting errors**
- Adjust `RATE_LIMIT_MAX_REQUESTS`
- Check Cloudflare request patterns
- Consider upgrading Cloudflare plan

### Debug Mode

```bash
# Deploy with debug enabled
wrangler deploy --env development
```

Check logs:
```bash
wrangler tail
```

## 📚 API Documentation

### Session Management Tools

| Tool Name | Description |
|-----------|-------------|
| `passgage_session_login` | Create session with email/password |
| `passgage_session_status` | Check session status |
| `passgage_session_switch_mode` | Switch between company/user mode |
| `passgage_session_list` | List active sessions (admin) |

### Standard MCP Tools

All 130+ Passgage tools are available once authenticated:
- User management (company mode)
- Leave requests (user mode)
- Approval workflows
- Time tracking
- Reporting and analytics

## 💰 Cost Estimation

### Cloudflare Workers
- **Free tier**: 100,000 requests/day
- **Paid tier**: $5/month for 10M requests
- **KV storage**: $0.50/GB/month + $0.50/million reads

### Example Usage
- **100 users × 50 requests/day** = ~150,000 requests/month
- **Cost**: Free tier sufficient for most deployments

## 🆘 Support

### Issues
- Create issue in GitHub repository
- Include session ID and timestamp for faster debugging

### API Access
- Contact `deneyim@passgage.com` for API keys
- Mention "Global MCP Server" for priority support

### Enterprise
- Custom deployment assistance available
- Dedicated support channels
- Advanced security configurations