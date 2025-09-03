# Claude Desktop Configuration Templates

Bu klasör Passgage MCP Server'ı farklı authentication modlarında test etmek için Claude Desktop config şablonları içerir.

## Local Test Konfigürasyonları

### 1. User Mode (Tekli Kullanıcı)
**Dosya**: `claude-desktop-user-mode.json`
```bash
# Kendi config dosyanızı kopyalayın ve bilgilerinizi güncelleyin
cp claude-desktop-user-mode.json ~/.config/Claude/claude_desktop_config.json
```

**Test Senaryoları**:
- "Passgage authentication durumumu kontrol et"
- "Benim izin taleplerimi listele"
- "İzin bakiyemi göster"
- "Son giriş-çıkış zamanlarımı göster"

### 2. Company Mode (Şirket Admin)
**Dosya**: `claude-desktop-company-mode.json`
```bash
cp claude-desktop-company-mode.json ~/.config/Claude/claude_desktop_config.json
```

**Test Senaryoları**:
- "Tüm bekleyen izin taleplerini listele"
- "Kullanıcıları departmana göre listele"
- "Yeni kullanıcı oluştur"
- "Dashboard istatistikleri getir"

### 3. Dual Mode (Çift Kimlik)
**Dosya**: `claude-desktop-dual-mode.json`
```bash
cp claude-desktop-dual-mode.json ~/.config/Claude/claude_desktop_config.json
```

**Test Senaryoları**:
- "Company mode'a geç"
- "User mode'a geç"
- "Mevcut authentication mode nedir?"
- "Hangi modlara erişimim var?"

## Remote Production Konfigürasyonu

### Session-Based Auth (Cloudflare vb. için)
**Dosya**: `claude-desktop-remote-production.json`

Bu konfigürasyon credential'ları environment'da saklamaz, bunun yerine:
- Runtime'da credential girişi
- Session-based authentication
- JWT token management
- Secure credential handling

## Kullanım Talimatları

### 1. Local Test İçin:
```bash
# Tercih ettiğiniz config'i seçin
cp configs/claude-desktop-user-mode.json ~/.config/Claude/claude_desktop_config.json

# Credentials'ları güncelleyin
nano ~/.config/Claude/claude_desktop_config.json

# Claude Desktop'ı restart edin
# Test edin
```

### 2. Config Değiştirme:
```bash
# User mode'a geçiş
cp configs/claude-desktop-user-mode.json ~/.config/Claude/claude_desktop_config.json

# Company mode'a geçiş  
cp configs/claude-desktop-company-mode.json ~/.config/Claude/claude_desktop_config.json

# Her değişiklikten sonra Claude Desktop restart gerekli
```

### 3. Path Güncellemeleri:
Tüm config dosyalarında `"args": ["./dist/main.js"]` path'ini kendi proje path'inize güncelleyin:
```json
"args": ["/full/path/to/your/mcp-server/dist/main.js"]
```

## Güvenlik Notları

⚠️ **Local configs'de gerçek credentials saklamayın**
⚠️ **Config dosyalarını git'e commit etmeyin**  
⚠️ **Production'da session-based auth kullanın**