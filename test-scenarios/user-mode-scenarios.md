# User Mode Test Senaryoları

Tekli kullanıcı erişimi için Claude Desktop ile test senaryoları.

## Ön Hazırlık
```bash
# User mode config'i aktifleştir
cp configs/claude-desktop-user-mode.json ~/.config/Claude/claude_desktop_config.json

# Credentials'ları güncelleyin
# Claude Desktop'ı restart edin
```

## Test Senaryoları

### 1. Authentication Kontrolü
**Claude'a Sor**:
```
"Passgage authentication durumumu kontrol et"
```

**Beklenen Sonuç**:
- Mode: "user" 
- Email: your-email@company.com
- Status: authenticated/not authenticated
- Available tools: user-level tools

### 2. Kişisel Bilgiler
**Claude'a Sor**:
```
"Benim kullanıcı bilgilerimi ve profilimi göster"
```

**Beklenen Sonuç**:
- Kişisel bilgileriniz
- Departman bilgisi
- Aktif durumunuz

### 3. İzin Yönetimi
**Claude'a Sor**:
```
"Benim izin taleplerimi listele"
"İzin bakiyemi göster" 
"Gelecek izinlerimi kontrol et"
```

**Beklenen Sonuç**:
- Kişisel izin talepleri
- İzin bakiyeleri
- Approved/pending durumları

### 4. Çalışma Saatleri
**Claude'a Sor**:
```
"Son giriş-çıkış zamanlarımı göster"
"Bu haftaki çalışma saatlerimi listele"
"Vardiya atamalarımı kontrol et"
```

**Beklenen Sonuç**:
- Giriş-çıkış kayıtları
- Çalışma saatleri
- Vardiya bilgileri

### 5. Sınırlı Erişim Testi (Başarısız Olmalı)
**Claude'a Sor**:
```
"Tüm kullanıcıları listele"
"Yeni kullanıcı oluştur" 
"Başkasının izin talebini onayla"
```

**Beklenen Sonuç**:
- Permission denied mesajları
- "Company mode gerekli" uyarıları
- Admin yetkisi gerektiren işlemler reddedilmeli

## Debug Mode Testi

Config'de `"PASSGAGE_DEBUG": "true"` ile:
- Console'da detaylı loglar görülmeli
- API istekleri trace edilmeli
- Authentication akışı detayları gözükmeli

## Sorun Giderme

### Tools görünmüyorsa:
1. Claude Desktop tamamen kapatın (system tray)
2. Config path'leri kontrol edin
3. `npm run build` çalıştırın
4. Claude Desktop restart

### Authentication hatası:
1. Email/password doğruluğunu kontrol edin
2. PASSGAGE_BASE_URL kontrol edin
3. Debug mode açın ve logları inceleyin