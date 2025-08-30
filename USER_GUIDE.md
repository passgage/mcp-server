# Passgage MCP Server - Kullanım Kılavuzu

Bu kılavuz, Passgage MCP Server'ını Claude ile nasıl kullanacağınızı örneklerle açıklar.

## Kurulum ve Başlangıç

### 1. MCP Server'ı Claude'a Bağlama

Claude Desktop ayarlarınıza şu konfigürasyonu ekleyin:

```json
{
  "mcpServers": {
    "passgage": {
      "command": "node",
      "args": ["/path/to/passgage-mcp-server/dist/index.js"],
      "env": {
        "PASSGAGE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### 2. Authentication Modes

Passgage MCP Server iki farklı authentication modunu destekler:

#### 🏢 Company Mode (Şirket Modu)
- **Tam admin erişimi** - Tüm kullanıcılar ve veriler
- **Sistem yönetimi** - Departman, şube, cihaz yönetimi
- **Toplu işlemler** - Bulk approval, data export
- **En iyi seçenek:** Admin işlemleri, sistem entegrasyonları

#### 👤 User Mode (Kullanıcı Modu)  
- **Kişisel erişim** - Sadece kendi verilerine erişim
- **Sınırlı işlemler** - Kendi izin talepleri, profil görüntüleme
- **Güvenli** - Diğer kullanıcıların verilerine erişim yok
- **En iyi seçenek:** Bireysel kullanım, kişisel işlemler

### 3. İlk Giriş ve Mod Yönetimi

#### Company Mode ile başlangıç:
> "Passgage company mode'da çalışmaya başla"

#### User login ile başlangıç:
> "Passgage sistemine giriş yap. Email: kullanici@sirket.com, şifrem: mypassword"

#### Mod değiştirme:
> "Company mode'a geç" veya "User mode'a geç"

#### Mevcut durumu kontrol etme:
> "Passgage authentication durumumu göster"

## İzin Sembolleri

Bu kılavuzda kullanılan semboller:
- ✅ **Her iki modda** - Hem Company hem User mode'da kullanılabilir
- ⚠️ **Sadece Company Mode** - Admin yetkileri gerektirir
- 👤 **Sadece User Mode** - Kişisel işlemler için

## Temel Kullanım Örnekleri

### 👥 Kullanıcı Yönetimi

#### Aktif kullanıcıları listele (Her iki modda)
> "Şirketteki tüm aktif çalışanları göster"

#### Belirli departmandaki kullanıcıları bul (Her iki modda)
> "İnsan Kaynakları departmanında çalışan kişileri listele"

#### Yeni kullanıcı ekle ⚠️ (Sadece Company Mode)
> "Yeni bir çalışan kaydet: Ahmet Yılmaz, email: ahmet@sirket.com, departman: IT"
> 
> *Not: Bu işlem admin yetkileri gerektirir. User mode'dayken "Company mode'a geç" demeniz gerekebilir.*

#### Kullanıcı bilgilerini güncelle ⚠️ (Sadece Company Mode)  
> "Ali Demir'in telefon numarasını 0532 123 4567 olarak güncelle"

### 📝 İzin Yönetimi

#### Bekleyen izin taleplerini göster (Her iki modda)
> "Onay bekleyen izin taleplerini listele"

#### İzin taleplerini filtrele (Her iki modda)
> "Bu ay içindeki yıllık izin taleplerini göster"

#### Kendi izin talebini oluştur (Her iki modda)
> "5 Haziran'dan 10 Haziran'a kadar yıllık izin talebi oluştur"

#### İzin talebi onayla ⚠️ (Sadece Company Mode)
> "ID'si abc123 olan izin talebini onayla, not: Departman müdürü onayı"

#### Toplu izin onayı ⚠️ (Sadece Company Mode)  
> "Bekleyen tüm yıllık izin taleplerini onayla"

### 🏢 Şube ve Departman İşlemleri

#### Şube listesi
> "Tüm şubelerimizi ve adreslerini listele"

#### Departman hiyerarşisi
> "Şirket organizasyon şemasını göster"

#### Yeni departman ekle
> "Dijital Pazarlama adında yeni bir departman oluştur"

### ⏰ Vardiya ve Çalışma Saatleri

#### Vardiya planını görüntüle
> "Bu haftaki vardiya programını göster"

#### Kullanıcıyı vardiyaya ata
> "Mehmet Acar'ı yarın sabah vardiyasına ata"

#### Gece vardiyalarını listele
> "Gece çalışan personeli göster"

### 📊 Raporlama ve İstatistikler

#### Dashboard özeti
> "Bugünkü özet istatistikleri göster"

#### Giriş-çıkış raporları
> "Bu ayki personel giriş-çıkış raporunu hazırla"

#### Veri export etme
> "Son 3 aydaki izin verilerini Excel olarak export et"

### 🔍 Arama ve Filtreleme

#### Genel arama
> "Sistem genelinde 'Ahmet' anahtar kelimesini ara"

#### Gelişmiş filtreleme
> "İstanbul şubesinde, IT departmanında, son 30 günde işe başlayan çalışanları listele"

#### Tarih aralığı ile arama
> "2024 yılında onaylanmış tüm izinleri göster"

## Gelişmiş Kullanım Senaryoları

### 🎯 İş Akışları

#### Onay süreci yönetimi
> "Bekleyen tüm onayları listele ve acil olanları belirle"

#### Toplu işlemler
> "IT departmanındaki tüm çalışanların email adreslerini güncelle"

#### Otomatik raporlama
> "Aylık personel devam raporu hazırla ve özet ver"

### 📈 Analytics ve İzleme

#### Trend analizi
> "Son 6 aydaki izin kullanım trendlerini analiz et"

#### Karşılaştırmalı raporlar
> "Bu ay ile geçen ayın çalışan performansını karşılaştır"

#### Kritik metrikleri takip et
> "Geç kalan çalışan sayısı ve departmanlarını göster"

### 🔧 Sistem Yönetimi

#### Toplu veri girişi
> "Excel dosyasındaki çalışan listesini sisteme aktar"

#### Veri temizleme
> "Pasif kullanıcı hesaplarını temizle"

#### Yedekleme
> "Tüm kullanıcı verilerini JSON formatında export et"

## Pratik İpuçları

### 💡 Etkili Sorgular İçin

1. **Spesifik olun**: "Çalışanları listele" yerine "IT departmanındaki aktif çalışanları listele"

2. **Tarih belirtin**: "İzinleri göster" yerine "Bu ayki onaylanmış izinleri göster"

3. **Filtreleri kullanın**: "Tüm veriler" yerine "Son 30 gündeki veriler"

4. **Toplu işlemler**: Tek tek yapmak yerine "toplu" veya "tüm" ifadelerini kullanın

### 🚀 Zaman Kazandıran Örnekler

#### Haftalık rutin kontrolü
> "Bu hafta için: 1) Bekleyen onayları listele, 2) Bugün izne çıkacakları göster, 3) Vardiya değişikliklerini kontrol et"

#### Aylık raporlama
> "Ay sonu raporu hazırla: personel devamı, izin kullanımı, geç kalma istatistikleri"

#### Acil durum yönetimi
> "Bugün izinli olmayan ve mesaiye kalabilecek IT departmanı çalışanlarını listele"

### ⚡ Hızlı Komutlar

| Ne istiyorsunuz | Claude'a söyleyin |
|-----------------|------------------|
| Giriş yap | "Passgage'a giriş yap" |
| Bekleyen onaylar | "Onay bekleyen işleri göster" |
| Bugün izinliler | "Bugün izinli olan personeli listele" |
| Yeni çalışan | "Yeni personel kaydet" |
| Departman listesi | "Tüm departmanları göster" |
| Vardiya planı | "Bu haftaki vardiyaları listele" |
| İstatistikler | "Dashboard özetini göster" |
| Arama | "Sistemde [anahtar kelime] ara" |
| Export | "[veri türü] verilerini excel olarak indir" |
| Logout | "Passgage oturumunu kapat" |

## Sık Karşılaşılan Durumlar

### ❓ Problem Çözme

**"Giriş yapamıyorum"**
> "Passgage bağlantı durumumu kontrol et"

**"Veriler güncel değil"**
> "Passgage token'ımı yenile"

**"İşlem başarısız oldu"**
> "Son hatayı detaylı göster"

**"Yetkim yok"**
> "Mevcut yetkileriми kontrol et"

### 🔄 Rutin İşlemler

**Günlük başlangıç kontrolü:**
> "Günlük özet: bugünün onayları, izinlileri, vardiya değişiklikleri"

**Haftalık planlama:**
> "Gelecek haftanın vardiya planını ve izin durumlarını göster"

**Aylık raporlama:**
> "Bu ayki tüm HR verilerini özetle ve rapor hazırla"

## Destek ve Yardım

Herhangi bir sorunuz olduğunda Claude'a şöyle sorabilirsiniz:

> "Passgage MCP server'daki mevcut araçları listele"
> 
> "Izin yönetimi için hangi komutları kullanabilirim?"
> 
> "Kullanıcı arama nasıl yapılır?"

Bu kılavuz sayesinde Passgage MCP Server'ını maksimum verimlilikle kullanabilir, HR süreçlerinizi Claude ile otomatize edebilirsiniz!