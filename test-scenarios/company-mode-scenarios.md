# Company Mode Test Senaryoları

Şirket admin erişimi için Claude Desktop ile test senaryoları.

## Ön Hazırlık
```bash
# Company mode config'i aktifleştir
cp configs/claude-desktop-company-mode.json ~/.config/Claude/claude_desktop_config.json

# API key'i güncelleyin
# Claude Desktop'ı restart edin
```

## Test Senaryoları

### 1. Authentication Kontrolü
**Claude'a Sor**:
```
"Passgage authentication durumumu kontrol et"
```

**Beklenen Sonuç**:
- Mode: "company"
- API Key: [masked]
- Status: authenticated
- Available tools: admin-level tools

### 2. Kullanıcı Yönetimi (Admin)
**Claude'a Sor**:
```
"Tüm kullanıcıları listele"
"Engineering departmanındaki kullanıcıları göster"
"İnsan Kaynaklarındaki kullanıcıları listele"
```

**Beklenen Sonuç**:
- Şirket genelinde kullanıcı listesi
- Departman bazında filtreleme
- Admin yetkisiyle erişim

### 3. İzin Talepları Yönetimi
**Claude'a Sor**:
```
"Tüm bekleyen izin taleplerini listele"
"Bu haftaki izin taleplerini göster"
"Onaylanmış izinleri kontrol et"
```

**Beklenen Sonuç**:
- Şirket genelinde izin talepleri
- İzin talep detayları
- Onay/red işlemi yapabilme yetkinliği

### 4. Toplu İşlemler
**Claude'a Sor**:
```
"Bekleyen tüm izin taleplerini toplu onayla"
"Department bazında raporlar oluştur"
"Dashboard istatistiklerini getir"
```

**Beklenen Sonuç**:
- Bulk operations çalışması
- Raporlama yetkisi
- Dashboard erişimi

### 5. Sistem Yönetimi
**Claude'a Sor**:
```
"Tüm access zone'ları listele"
"Device durumlarını kontrol et"
"Güvenlik audit raporu oluştur"
```

**Beklenen Sonuç**:
- Sistem geneli erişim
- Cihaz yönetimi
- Güvenlik raporları

## Advanced Test Senaryoları

### Data Export
**Claude'a Sor**:
```
"HR department'ın kullanıcı verilerini CSV'ye aktar"
"Bu ayın çalışma saatleri raporunu oluştur"
"Payroll verilerini export et"
```

### User Creation
**Claude'a Sor**:
```
"john.doe@company.com için yeni kullanıcı oluştur Marketing department'da"
```

### Approval Workflows
**Claude'a Sor**:
```
"[specific approval ID] numaralı izin talebini onayla"
"[specific user] kullanıcısının tüm taleplerini kontrol et"
```

## Sorun Giderme

### API Key ile ilgili:
1. API key'in geçerli olduğunu kontrol edin
2. Company-level permissions olduğunu doğrulayın
3. Key'in expire olmadığını kontrol edin

### Permission hatları:
- Company mode'da tüm admin tools available olmalı
- User-level restrictions olmamalı
- Bulk operations çalışmalı