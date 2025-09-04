# Claude Desktop Configuration Files

Bu klasörde Claude Desktop'ı Passgage MCP Server'a bağlamak için gerekli config dosyaları bulunur.

## 🔧 Local MCP Server Bağlantısı

**Dosya**: `claude-desktop-local.json`

Bu config'i Claude Desktop'ın settings dosyasına ekleyin:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```bash
# Önce projeyi build edin
npm run build

# Sonra Claude Desktop'ı restart edin
```

## 🌐 Global MCP Server Bağlantısı (HTTP)

**Dosya**: `claude-desktop-remote.json`

Remote Cloudflare Workers server'a bağlanmak için:

1. İlk önce session oluşturun:
```bash
curl -X POST https://passgage-global-mcp-server.passgage.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "passgage_session_login",
      "arguments": {
        "email": "your-email@example.com",
        "password": "your-password"
      }
    }
  }'
```

2. Dönen sessionId'yi not alın
3. Claude Desktop'da tools kullanırken sessionId'yi argüman olarak geçin

## 📊 Cloudflare Logs & Monitoring

Cloudflare'da log'ları aktifleştirdikten sonra:

```bash
# Canlı log takibi
npx wrangler tail --format=pretty

# Son log'ları görme
npx wrangler tail --format=pretty --since=1m

# Specific error filtering
npx wrangler tail --format=pretty --search="ERROR"
```

### Log Configuration (Cloudflare Dashboard)
1. **Analytics** → **Logs** → **Logpush**
2. **Real-time Logs** enabled
3. **Error tracking** enabled
4. **Custom log fields**: request_id, response_status, exception_details

## 🔧 Troubleshooting

### 500 Internal Server Error
1. **Log kontrol**: `npx wrangler tail --format=pretty`
2. **Environment variables**: wrangler.toml kontrol et
3. **KV binding**: PASSGAGE_SESSIONS namespace aktif mi?
4. **Dependencies**: Node.js compatibility kontrol et

### Authentication Error
- Session login yapıldığından emin olun
- SessionId doğru geçildiğinden emin olun  
- Session expire olmamış olduğundan emin olun (8 saat)

### Local Build Issues
```bash
# Dependencies yükleyin
npm install

# Build yapın
npm run build

# Type check yapın
npm run type-check

# Lint kontrol
npm run lint
```

## 🌍 Environment Variables

### Local Development (.env)
```env
PASSGAGE_USER_EMAIL=your-email@example.com
PASSGAGE_USER_PASSWORD=your-password
PASSGAGE_BASE_URL=https://api.passgage.com
PASSGAGE_DEBUG=true
NODE_ENV=development
LOG_LEVEL=debug
```

### Global Deployment (Cloudflare)
Wrangler.toml'da tanımlı:
- `PASSGAGE_BASE_URL`
- `PASSGAGE_TIMEOUT` 
- `ENCRYPTION_KEY`
- `SESSION_TIMEOUT_HOURS`
- `RATE_LIMIT_*`

## 🚀 Deployment Commands

```bash
# Development deploy
npx wrangler deploy --env development

# Production deploy  
npx wrangler deploy --env production

# Rollback
npx wrangler rollback --compatibility-date=previous
```

## 🔐 Security Best Practices

1. **Production Encryption Key**:
```bash
openssl rand -hex 32
# Add to wrangler.toml production vars
```

2. **KV Namespace Separation**:
- Development: `dev-sessions-namespace`
- Production: `prod-sessions-namespace`

3. **Rate Limiting**: 
- Development: 500 req/min
- Production: 50 req/min