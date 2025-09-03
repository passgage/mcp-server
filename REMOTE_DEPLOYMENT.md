# Remote MCP Deployment Guide

Bu guide Passgage MCP Server'ı remote ortamda (Cloudflare Workers, Vercel, etc.) güvenli bir şekilde deploy etmek için gerekli adımları açıklar.

## Local vs Remote Authentication

### Local (Claude Desktop) 
❌ **Environment variables'da credentials**
❌ **Config dosyalarında API keys**
❌ **Güvenlik riski vardır**

### Remote (Production)
✅ **Session-based authentication**
✅ **Runtime credential girişi**  
✅ **No credentials in config**
✅ **Güvenli JWT management**

## Remote Deployment Architecture

### 1. Session-Based Authentication
```typescript
// No credentials in environment
env: {
  "PASSGAGE_BASE_URL": "https://api.passgage.com",
  "PASSGAGE_SESSION_BASED": "true",
  "PASSGAGE_DEBUG": "false"
}

// Runtime authentication
Claude: "Passgage'e email ve password ile giriş yap"
Server: Creates secure session, stores encrypted credentials
```

### 2. Mode Switching
```typescript
// Users can switch modes during conversation
Claude: "Company mode'a geç"
Server: Switches to API key authentication (if provided)

Claude: "User mode'a geç"  
Server: Switches to JWT token authentication
```

### 3. Session Management
- 8 hour session timeout
- Automatic JWT refresh
- Session cleanup
- Multiple concurrent sessions

## Deployment Steps

### 1. Build for Production
```bash
npm run build
npm run type-check
```

### 2. Environment Configuration
```json
{
  "PASSGAGE_BASE_URL": "https://api.passgage.com",
  "PASSGAGE_SESSION_BASED": "true",
  "PASSGAGE_DEBUG": "false",
  "PASSGAGE_TIMEOUT": "30000"
}
```

### 3. Claude Desktop Config (Remote)
```json
{
  "mcpServers": {
    "passgage": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://your-mcp-server.domain.com/mcp",
        "-H", "Content-Type: application/json"
      ]
    }
  }
}
```

## User Authentication Flow

### Initial Setup (User)
```
User: "Passgage'e giriş yapmak istiyorum"

Claude: "Giriş yapmak için email ve password girin:"

User: "email@company.com ve password123 ile giriş yap"

Claude: ✅ "Giriş başarılı! Session ID: sess_abc123"
```

### Mode Switching
```
User: "Company admin yetkilerim var mı?"

Claude: "Company mode'a geçmek için API key girin:"

User: "API key: comp_key_xyz ile company mode'a geç"

Claude: ✅ "Company mode aktif! Admin yetkileri ile işlem yapabilirsiniz"
```

### Session Management
```
User: "Session durumum nasıl?"

Claude: "Session bilgileri:
- ID: sess_abc123  
- Mode: company
- Expires: 6 saat 23 dakika sonra
- Available modes: [user, company]"
```

## Security Features

### 1. Credential Protection
- No plaintext passwords in memory
- Base64 encoding (demo) - production'da proper encryption
- Session-based storage
- Automatic cleanup

### 2. JWT Management  
- Automatic token refresh
- Token expiry handling
- Refresh token rotation
- Session invalidation

### 3. Session Security
- Unique session IDs
- Time-based expiration
- Last-used tracking
- Concurrent session limits

## API Tools Available

### Session Management Tools
- `passgage_session_login` - Email/password login
- `passgage_session_login_api_key` - API key login  
- `passgage_session_switch_mode` - Runtime mode switching
- `passgage_session_status` - Session status check
- `passgage_session_logout` - Session destruction

### Standard Passgage Tools
- All 130+ Passgage API tools available
- Permission-aware tool availability
- Mode-specific access controls

## Deployment Platforms

### Cloudflare Workers
```bash
# wrangler.toml
[env.production.vars]
PASSGAGE_BASE_URL = "https://api.passgage.com"
PASSGAGE_SESSION_BASED = "true"
```

### Vercel Functions
```bash
# vercel.json
{
  "env": {
    "PASSGAGE_BASE_URL": "https://api.passgage.com",
    "PASSGAGE_SESSION_BASED": "true"
  }
}
```

### AWS Lambda
```bash
# serverless.yml
environment:
  PASSGAGE_BASE_URL: https://api.passgage.com
  PASSGAGE_SESSION_BASED: true
```

## Monitoring & Debugging

### Session Analytics
```typescript
// Monitor active sessions
sessionManager.getActiveSessionsCount()

// Debug session state
sessionManager.getSession(sessionId)

// Session cleanup logs
"Cleaned up 3 expired sessions"
```

### Error Handling
- Session not found → Re-authentication prompt
- Token expired → Automatic refresh attempt  
- Invalid credentials → Clear error messages
- Network issues → Retry mechanisms

## User Experience Examples

### HR Manager Workflow
```
User: "Merhaba, şirketimizdeki bekleyen izin taleplerini görmek istiyorum"

Claude: "Passgage'e giriş yapmanız gerekiyor. Email ve password'nüzü paylaşabilir misiniz?"

User: "hr.manager@company.com ve HRpass123"

Claude: ✅ "Giriş başarılı! Ancak izin taleplerini görmek için admin yetkisi gerekiyor. Company API key'inizi paylaşabilir misiniz?"

User: "comp_abc123xyz"

Claude: ✅ "Company mode aktif! Bekleyen izin talepleri:
- John Doe: 5 gün annual leave (Mar 15-19)
- Jane Smith: 2 gün sick leave (Mar 20-21)
- Mike Johnson: 3 gün personal leave (Mar 25-27)"
```

### Employee Workflow  
```
User: "Benim izin bakiyemi kontrol etmek istiyorum"

Claude: "Giriş yapmak için Passgage credentials'ınızı girin:"

User: "john.employee@company.com ve MyPass456"

Claude: ✅ "Giriş başarılı! İzin bakiyeniz:
- Annual Leave: 12 gün kaldı
- Sick Leave: 5 gün kaldı  
- Personal Leave: 3 gün kaldı"
```

## Best Practices

### 1. Security
- Never log passwords or API keys
- Use HTTPS for all communications
- Implement proper encryption in production
- Regular session cleanup
- Rate limiting for authentication attempts

### 2. User Experience
- Clear authentication prompts
- Mode switching explanations
- Session status visibility
- Helpful error messages

### 3. Performance
- Session caching
- JWT token reuse
- Batch API operations
- Connection pooling

### 4. Monitoring
- Session analytics
- Authentication success/failure rates
- API usage patterns
- Error tracking

## Troubleshooting

### Common Issues

**"Session not found"**
- Session expired (8 hours)
- Invalid session ID
- Server restart

**"Invalid credentials"** 
- Wrong email/password
- API key expired
- Account suspended

**"Mode switch failed"**
- Missing credentials for target mode
- Insufficient permissions
- Network issues

**"Tools not available"**
- Wrong authentication mode
- Permission restrictions
- Session issues

### Debug Steps

1. Check session status
2. Verify credentials
3. Test API connectivity
4. Review server logs
5. Check session expiry