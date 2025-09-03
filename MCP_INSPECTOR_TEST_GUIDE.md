# 🔍 Passgage MCP Server Test Guide - MCP Inspector ile

Bu rehber Passgage MCP Server'ınızı **@modelcontextprotocol/inspector** ile nasıl test edeceğinizi adım adım anlatır.

## 🚀 Hızlı Başlangıç

### 1. Ön Hazırlık

```bash
# 1. Projeyi build et
npm run build

# 2. Environment dosyasını kontrol et
cat .env

# 3. Credentials'ların doğru olduğundan emin ol
```

### 2. MCP Inspector'ı Başlat

```bash
# Inspector'ı server ile birlikte çalıştır
npx @modelcontextprotocol/inspector node dist/main.js
```

**Çıktı örneği:**
```
Starting MCP inspector...
⚙️ Proxy server listening on localhost:6277  
🔑 Session token: [your-token]
🚀 MCP Inspector is up and running at:
   http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=[your-token]
🌐 Opening browser...
```

## 🌐 Web Arayüzü Kullanımı

### Inspector Arayüzü Bölümleri:

1. **Tools Tab** - Tüm available tools'ları görürsün (133 tool)
2. **Resources Tab** - MCP resources (eğer varsa)  
3. **Prompts Tab** - Built-in prompts
4. **Logs Tab** - Real-time communication logs

### Tool Test Etme:

1. **Tool Seç**: Sol panelden tool'a tıkla
2. **Parameters Gir**: Gerekli parametreleri JSON formatında gir
3. **Execute**: "Call Tool" butonuna tıkla
4. **Sonuç Gör**: Response'u sağ panelde görürsün

## 📋 Test Senaryoları

### 🔐 Authentication Tests

#### 1. Auth Status Kontrol
```json
Tool: ping
Parameters: {}
Expected: {"success": true, "message": "Server is running"}
```

```json
Tool: passgage_auth_status  
Parameters: {}
Expected: {"success": true, "authMode": "company", "isAuthenticated": true}
```

#### 2. Mode Switching (Dual Auth durumunda)
```json
Tool: passgage_switch_to_user_mode
Parameters: {}
Expected: {"success": true, "message": "Switched to user mode"}
```

```json
Tool: passgage_switch_to_company_mode  
Parameters: {}
Expected: {"success": true, "message": "Switched to company mode"}
```

### 👥 CRUD Operations Tests

#### Users Service Tests

```json
Tool: passgage_list_users
Parameters: {
  "page": 1,
  "per_page": 5
}
Expected: {"success": true, "data": {"users": [...], "pagination": {...}}}
```

```json
Tool: passgage_get_user
Parameters: {"id": 1}
Expected: {"success": true, "data": {"user": {...}}}
```

```json
Tool: passgage_create_user
Parameters: {
  "user": {
    "first_name": "Test",
    "last_name": "User", 
    "email": "test@example.com",
    "employee_number": "EMP001"
  }
}
Expected: {"success": true, "data": {"user": {...}}}
```

#### Approvals Service Tests

```json
Tool: passgage_list_approvals
Parameters: {
  "page": 1,
  "per_page": 10,
  "q": {"status_eq": "pending"}
}
Expected: {"success": true, "data": {"approvals": [...], "pagination": {...}}}
```

```json
Tool: passgage_approve_request
Parameters: {
  "id": 123,
  "comment": "Approved via MCP Inspector test"
}
Expected: {"success": true, "data": {"approval": {...}}}
```

### 🔍 Advanced Search Tests

```json
Tool: passgage_advanced_search
Parameters: {
  "service": "users",
  "query": {
    "first_name_cont": "John",
    "is_active_eq": true
  },
  "page": 1,
  "per_page": 20
}
Expected: {"success": true, "data": {"results": [...], "query_info": {...}}}
```

```json
Tool: passgage_query_builder
Parameters: {
  "service": "leaves",
  "conditions": [
    {"field": "start_date", "operator": "gteq", "value": "2024-01-01"},
    {"field": "status", "operator": "in", "value": ["approved", "pending"]}
  ]
}
Expected: {"success": true, "data": {"generated_query": {...}}}
```

### 📁 File Upload Tests

```json
Tool: passgage_generate_presigned_url
Parameters: {
  "filename": "test-document.pdf",
  "content_type": "application/pdf",
  "file_size": 1024000
}
Expected: {"success": true, "data": {"upload_url": "...", "file_id": "..."}}
```

### 📊 Specialized Operations

```json
Tool: passgage_bulk_approval
Parameters: {
  "approval_ids": [1, 2, 3],
  "action": "approve", 
  "comment": "Bulk approved via MCP Inspector"
}
Expected: {"success": true, "data": {"processed": 3, "results": [...]}}
```

## 🐛 Debugging & Troubleshooting

### Debug Mode Aktif Etme:

`.env` dosyasında:
```env
PASSGAGE_DEBUG=true
LOG_LEVEL=debug  
LOG_FORMAT=pretty
```

### Common Issues:

#### 1. **Authentication Errors**
```json
Error: {"success": false, "error": "Invalid API key"}
```
**Çözüm**: `.env` dosyasında API key'i kontrol et

#### 2. **Permission Errors**  
```json
Error: {"success": false, "error": "Insufficient permissions"}
```
**Çözüm**: Auth mode'unu değiştir veya farklı credentials kullan

#### 3. **Network Errors**
```json
Error: {"success": false, "error": "Request timeout"}
```
**Çözüm**: `PASSGAGE_TIMEOUT` değerini artır

#### 4. **Tool Not Found**
```json
Error: {"error": "Unknown tool: invalid_tool_name"}
```
**Çözüm**: Tool ismini `passgage_list_tools` ile kontrol et

### Log Monitoring:

```bash
# Terminal'de server loglarını takip et
# (Inspector çalışırken ayrı terminal'de)

# Server stdout'u görmek için background process'i kontrol et:
# Process ID: 88df30 (örnekte)
```

## 🎯 Test Checklist

### ✅ Temel Testler:
- [ ] Server başlatma (`ping` tool çalışıyor)
- [ ] Auth status kontrolü
- [ ] Tool listesi alınıyor (133 tool görünüyor)

### ✅ Authentication Testleri:
- [ ] Company mode çalışıyor
- [ ] User mode çalışıyor (eğer credentials varsa)
- [ ] Mode switching çalışıyor

### ✅ CRUD Testleri:
- [ ] Users: list, get, create, update, delete
- [ ] Approvals: list, get, approve, reject
- [ ] Leaves: list, get, create, update
- [ ] Departments: list, get, create

### ✅ Advanced Features:
- [ ] Advanced search çalışıyor
- [ ] Query builder çalışıyor
- [ ] File upload presigned URL alınıyor
- [ ] Bulk operations çalışıyor

### ✅ Error Handling:
- [ ] Invalid parameters hata döndürüyor
- [ ] Auth errors düzgün handle ediliyor
- [ ] Network timeouts çalışıyor

## 🔧 Advanced Usage

### Custom Test Scripts:

Inspector'da çalışan tool'ları otomatik test etmek için:

```javascript
// Browser console'da çalıştırılabilir
const testAuth = async () => {
  const authStatus = await callTool('passgage_auth_status', {});
  console.log('Auth Status:', authStatus);
  
  const users = await callTool('passgage_list_users', {page: 1, per_page: 5});
  console.log('Users:', users);
};

testAuth();
```

### Performance Testing:

```javascript
// Multiple parallel requests
const performanceTest = async () => {
  const startTime = performance.now();
  
  const promises = [
    callTool('passgage_list_users', {}),
    callTool('passgage_list_approvals', {}),
    callTool('passgage_list_leaves', {}),
    callTool('passgage_list_departments', {})
  ];
  
  const results = await Promise.all(promises);
  const endTime = performance.now();
  
  console.log(`Test completed in ${endTime - startTime}ms`);
  console.log('Results:', results);
};
```

## 📱 Mobile/Remote Testing

Inspector web arayüzü responsive olduğu için mobil cihazlardan da test edebilirsin:

```bash
# Network'teki diğer cihazlardan erişim için:
# Local IP adresini öğren
ifconfig | grep inet

# Inspector'ı external access ile başlat
npx @modelcontextprotocol/inspector --host 0.0.0.0 node dist/main.js
```

## 🔒 Production Testing

Production environment'da test etmek için:

```bash
# Session-based auth ile
NODE_ENV=production npx @modelcontextprotocol/inspector node dist/main.js

# Veya environment-specific config ile
cp configs/claude-desktop-remote-production.json .env
npx @modelcontextprotocol/inspector node dist/main.js
```

---

## 💡 Tips & Best Practices

1. **İlk test**: Her zaman `ping` ve `passgage_auth_status` ile başla
2. **Error handling**: Hata durumlarını da test et (geçersiz ID, boş parametreler)
3. **Rate limiting**: Çok fazla request gönderme, API rate limit'e takılabilir
4. **Data cleanup**: Test verilerini silmeyi unutma (`delete` operations)
5. **Log monitoring**: Debug mode'da logları takip et
6. **Browser dev tools**: Network tab'ında MCP communication'ı izle

Happy Testing! 🚀