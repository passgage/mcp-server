# Dual Mode Test Senaryoları

Runtime'da mode switching için Claude Desktop ile test senaryoları.

## Ön Hazırlık
```bash
# Dual mode config'i aktifleştir
cp configs/claude-desktop-dual-mode.json ~/.config/Claude/claude_desktop_config.json

# Hem API key hem de user credentials'ları güncelleyin
# Claude Desktop'ı restart edin
```

## Test Senaryoları

### 1. Initial State
**Claude'a Sor**:
```
"Passgage authentication durumumu kontrol et"
"Hangi authentication modları mevcut?"
```

**Beklenen Sonuç**:
- Current mode: "company" (default)
- Available modes: ["company", "user"]
- Credentials for both modes available

### 2. Mode Switching - Company to User
**Claude'a Sor**:
```
"User mode'a geç"
"Authentication durumumu tekrar kontrol et"
```

**Beklenen Sonuç**:
- Mode: "company" → "user"
- Available tools değişmeli
- User-level permissions aktif

### 3. User Mode Operations
**Claude'a Sor**:
```
"Benim izin taleplerimi listele"
"İzin bakiyemi göster"
```

**Beklenen Sonuç**:
- Kişisel data'ya erişim
- User-level operations

### 4. Mode Switching - User to Company  
**Claude'a Sor**:
```
"Company mode'a geç"
"Authentication durumumu kontrol et"
```

**Beklenen Sonuç**:
- Mode: "user" → "company"
- Admin tools available
- Company-level permissions

### 5. Company Mode Operations
**Claude'a Sor**:
```
"Tüm kullanıcıları listele"
"Bekleyen izin taleplerini göster"
```

**Beklenen Sonuç**:
- Şirket geneli data'ya erişim
- Admin-level operations

### 6. Mode Comparison Test
**Claude'a Sor**:
```
"User mode'dayken hangi tools'lara erişimim var?"
"Company mode'da hangi ek yetkilerim var?"
```

### 7. Session Management
**Claude'a Sor**:
```
"JWT token'ımı yenile"
"Authentication session'ımı sonlandır"
"Tekrar login yap"
```

## Advanced Switching Scenarios

### Fast Mode Switch
```
"Company mode'a geç, tüm bekleyen izin taleplerini listele, sonra user mode'a geç, benim taleplerimi göster"
```

### Context Aware Operations
```
"Önce kendi izin bakiyemi kontrol et (user mode), sonra company admin olarak tüm izin politikalarını göster"
```

### Permission Validation
```
"User mode'dayken yeni kullanıcı oluşturmaya çalış - hata mesajını göster"
"Company mode'a geç ve aynı işlemi başarıyla yap"
```

## Debug ve Monitoring

### State Tracking
**Claude'a Sor**:
```
"Mode geçişi geçmişimi göster"
"Hangi mode'da ne kadar süre geçirdim?"
```

### Token Management
**Claude'a Sor**:
```
"JWT token'ım ne zaman expire oluyor?"
"Token refresh gerekiyor mu?"
```

## Error Handling Tests

### Invalid Credentials
```
"Geçersiz credentials ile login olmaya çalış"
```

### Network Issues
```
"Network timeout durumunda mode switching nasıl davranır?"
```

### Session Expiry
```
"Expired JWT token ile işlem yapmaya çalış"
```

## Performance Tests

### Mode Switch Speed
- Mode geçişi ne kadar sürer?
- Cache'lenen authentication state var mı?
- Concurrent operations sırasında mode switch?

## Sorun Giderme

### Mode switching çalışmıyorsa:
1. Both credentials'ların doğru olduğunu kontrol edin
2. Authentication tools'ların mevcut olduğunu kontrol edin
3. Debug mode açın ve switching process'i trace edin

### State inconsistency:
1. Clear cache/restart server
2. Re-authenticate manually
3. Check token validity