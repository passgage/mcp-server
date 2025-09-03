# Quick Start Guide - Passgage MCP Server

Bu guide local test ve remote deployment için hızlı başlangıç adımlarını içerir.

## 🚀 5 Dakikada Başlangıç

### Adım 1: Build
```bash
npm install
npm run build
```

### Adım 2: Test Mode Seç

#### Option A: User Mode (Kişisel Erişim)
```bash
cp configs/claude-desktop-user-mode.json ~/.config/Claude/claude_desktop_config.json
```

#### Option B: Company Mode (Admin Erişim)  
```bash
cp configs/claude-desktop-company-mode.json ~/.config/Claude/claude_desktop_config.json
```

#### Option C: Dual Mode (Both)
```bash
cp configs/claude-desktop-dual-mode.json ~/.config/Claude/claude_desktop_config.json
```

### Adım 3: Credentials Güncelle
```bash
nano ~/.config/Claude/claude_desktop_config.json

# User mode için:
"PASSGAGE_USER_EMAIL": "your-email@company.com"
"PASSGAGE_USER_PASSWORD": "your-password"

# Company mode için:
"PASSGAGE_API_KEY": "your-company-api-key"
```

### Adım 4: Claude Desktop Restart
- Claude Desktop'ı tamamen kapatın
- Tekrar açın

### Adım 5: Test Et
Claude'a sor:
```
"Passgage authentication durumumu kontrol et"
```

## 📋 Test Senaryoları

### User Mode Test
```
"Benim izin taleplerimi listele"
"İzin bakiyemi göster"
"Son giriş-çıkış zamanlarımı göster"
```

### Company Mode Test
```
"Tüm bekleyen izin taleplerini listele"  
"Engineering departmanındaki kullanıcıları göster"
"Dashboard istatistiklerini getir"
```

### Dual Mode Test
```
"User mode'a geç"
"Company mode'a geç"
"Hangi authentication modları mevcut?"
```

## 🔧 Sorun Giderme

### Tools görünmüyorsa:
```bash
# Path kontrol et
which node

# Build kontrol et
npm run build

# Claude Desktop restart
```

### Authentication hatası:
```bash
# Debug mode aç
"PASSGAGE_DEBUG": "true"

# Credentials kontrol et
# API connectivity test et
```

### Config hatası:
```bash
# JSON syntax kontrol et
cat ~/.config/Claude/claude_desktop_config.json | jq .

# Path'leri kontrol et
ls -la ~/Developer/projects/passgage/mcp-server/dist/
```

## 🌐 Remote Deployment

### Cloudflare Workers
```bash
# Session-based auth için
cp configs/claude-desktop-remote-production.json config.json

# Deploy et
wrangler deploy
```

### Vercel
```bash
# Config hazırla
cp configs/claude-desktop-remote-production.json vercel.json

# Deploy et
vercel deploy
```

### Remote Test
```
User: "Passgage'e giriş yapmak istiyorum"
Claude: "Email ve password girin:"
User: "user@company.com ve password123 ile giriş yap"
```

## 📊 Test Checklist

### ✅ Local Test Checklist
- [ ] Build başarılı
- [ ] Config dosyası doğru path'te
- [ ] Credentials güncel
- [ ] Claude Desktop restart edildi
- [ ] Tools görünüyor
- [ ] Authentication çalışıyor
- [ ] Mode switching çalışıyor

### ✅ Remote Deployment Checklist
- [ ] Session-based config
- [ ] Environment variables doğru
- [ ] HTTPS endpoint hazır
- [ ] Session management çalışıyor
- [ ] Runtime authentication test edildi
- [ ] Error handling doğru

### ✅ Production Readiness Checklist
- [ ] Credentials environment'da yok
- [ ] Session timeout configured
- [ ] JWT refresh working
- [ ] Error logging active
- [ ] Rate limiting implemented
- [ ] Security best practices applied

## 🔍 Debug Commands

### Local Debug
```bash
# Server manuel start
node dist/main.js

# Debug mode ile
PASSGAGE_DEBUG=true node dist/main.js

# Test specific
npm test __tests__/auth.tool.test.ts
```

### Session Debug (Remote)
```
"Session durumumu kontrol et"
"Active session count nedir?"
"JWT token expire süresi?"
```

## 📞 Support

### Local Issues
- Build problems → Check Node.js version >=22.0.0
- Config issues → Validate JSON syntax
- Path problems → Check absolute paths

### Remote Issues  
- Authentication → Check session management
- Mode switching → Verify credentials
- Performance → Check session cleanup

### API Issues
- Contact: `deneyim@passgage.com`
- Check API status
- Verify credentials with Passgage

## 🎯 Use Cases

### For HR Managers
```
"Departman bazında izin raporları oluştur"
"Bekleyen onay süreçlerini listele"
"Çalışan performans metrikleri"
```

### For Employees
```
"İzin talep etmek istiyorum"
"Çalışma saatlerim nasıl?"
"Vardiya programımı göster"
```

### For IT Admins
```
"Sistem kullanıcılarını yönet"
"Access control ayarları"
"Güvenlik audit raporları"
```

## 🚀 Next Steps

1. **Production Deploy**: Remote authentication setup
2. **Custom Tools**: Add company-specific tools
3. **Integration**: Connect with other systems
4. **Monitoring**: Add analytics and logging
5. **Scaling**: Multi-tenant support