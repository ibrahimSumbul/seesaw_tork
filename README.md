# Seesaw Tork Simülasyonu

Tork tabanlı fizik mekanikleri ile interaktif seesaw simülasyonu. Pure JavaScript ile geliştirilmiş, multi-seesaw desteği olan eğitici bir fizik simülasyonu.

![Seesaw Simulation Demo](screenshot.png)

## Özellikler

### Fizik Motoru
- Tork hesaplaması: `torque = weight × distance`
- Açı formülü: `angle = clamp((rightTorque - leftTorque) / 10, -30°, 30°)`
- Gerçekçi düşüş ve bounce animasyonları
- Plank koordinat sistemine göre nesne konumlandırma

### Multi-Seesaw Sistemi
- Maksimum 10 adet bağımsız seesaw
- Tab-based navigation
- Her seesaw'ın kendi state'i ve LocalStorage kaydı
- Dinamik ekleme/silme

### Kullanıcı Arayüzü
- Mesafe ölçeği (ruler) - plank üzerinde pixel bazlı mesafe gösterimi
- Tork hesaplama paneli - sol/sağ tork, net tork ve formüller
- Dinamik plank genişliği kontrolü (400-1000px)
- Gerçek zamanlı istatistikler (ağırlık, açı)
- Preview sistemi - hover ile nesne konumunu önizleme

### Ses Efektleri
- Web Audio API ile synthesized sesler
- Nesne düşüş sesi
- İniş sesi (ağırlığa göre ton değişimi)
- Reset butonu için melodi

### Kalıcılık
- LocalStorage ile otomatik kayıt
- Sayfa yenilendiğinde state geri yükleme
- Her seesaw'ın bağımsız kaydı

## Teknolojiler

- **Pure JavaScript (ES6+)** - Framework/library kullanılmadı
- **HTML5** - Semantic markup
- **CSS3** - Modern styling, gradients, transforms
- **Web Audio API** - Ses efektleri için
- **LocalStorage API** - State persistence

## Proje Yapısı

```
seesaw_tork/
├── index.html          # Ana HTML yapısı
├── css/
│   └── styles.css      # Tüm stil tanımları
├── js/
│   ├── config.js       # Sabitler ve konfigürasyon
│   ├── storage.js      # LocalStorage yönetimi
│   ├── Seesaw.js       # Seesaw class'ı (fizik, render, events)
│   └── app.js          # SeesawManager ve AudioManager
└── README.md
```

## Çalıştırma

```bash
# HTTP server başlat
python3 -m http.server 8080

# Tarayıcıda aç
open http://localhost:8080
```

## Design Decisions & Thought Process

### 1. Reverse Rotation Algorithm for Click Detection

Plank eğik durumdayken kullanıcı tıklamalarını doğru algılamak için **inverse rotation transformation** kullanıldı. Mouse koordinatları plank'in yerel koordinat sistemine dönüştürülüyor:

```javascript
// Mouse koordinatlarını plank'in yerel sistemine dönüştür
const unrotatedX = relX * Math.cos(-angleRad) - relY * Math.sin(-angleRad);
const unrotatedY = relX * Math.sin(-angleRad) + relY * Math.cos(-angleRad);
```

**Neden bu yaklaşım?**
- Plank CSS `transform: rotate()` ile döndürülüyor, ancak mouse koordinatları global sistemde
- Tıklama algılama için plank'in yerel koordinat sistemine dönüşüm gerekli
- Alternatif: Her açı için ayrı hesaplama (daha karmaşık ve hatalı)

### 2. Trigonometric Calculations for Object Positioning

Eğik plank üzerinde nesnelerin doğru konumlandırılması için **rotation transformation** kullanıldı:

```javascript
// Plank koordinat sisteminden global koordinatlara dönüşüm
const rotatedX = positionX * Math.cos(angleRad);
const rotatedY = positionX * Math.sin(angleRad);
```

**Karar:** Nesneler plank'in yerel koordinat sisteminde (`positionX`) saklanıyor, render sırasında global koordinatlara dönüştürülüyor. Bu sayede:
- Torque hesaplamaları her zaman plank'e göre doğru mesafeyi kullanıyor
- Plank açısı değişse bile nesneler plank üzerinde kalıyor
- Preview ve gerçek drop pozisyonları tutarlı

### 3. Multi-Seesaw Architecture

**Class-based approach** seçildi çünkü:
- Her seesaw instance'ı bağımsız state'e sahip olmalı
- Activate/deactivate mekanizması gerekiyordu
- Event listener'ların doğru cleanup'ı önemliydi

**Alternatifler:**
- Functional approach: State yönetimi daha karmaşık olurdu
- Singleton pattern: Multi-seesaw desteği zorlaşırdı

### 4. Coordinate System Choice

**Plank-centric coordinate system** kullanıldı:
- Merkez (pivot) = 0px
- Sol taraf: negatif değerler (-200px, -150px, ...)
- Sağ taraf: pozitif değerler (+150px, +200px, ...)

**Avantajlar:**
- Torque hesaplamaları doğrudan `distance = |position|` ile yapılabiliyor
- Ruler gösterimi sezgisel
- Fizik formülleri ile uyumlu

## Trade-offs & Limitations

### Trade-offs

1. **Pure JavaScript vs Framework**
   - ✅ **Seçilen:** Pure JavaScript
   - **Neden:** Kütüphane bağımlılığı olmadan, hafif ve öğrenilebilir kod
   - **Ödün:** Bazı utility fonksiyonları manuel yazıldı (ör. debounce)

2. **DOM Manipulation vs Canvas**
   - ✅ **Seçilen:** DOM manipulation
   - **Neden:** CSS animasyonları, hover efektleri, accessibility daha kolay
   - **Ödün:** Çok fazla nesne olduğunda performans sorunu olabilir (şu an sorun yok)

3. **LocalStorage vs IndexedDB**
   - ✅ **Seçilen:** LocalStorage
   - **Neden:** Basit state persistence için yeterli, sync API
   - **Ödün:** Büyük veri setleri için sınırlı (5-10MB), async değil

4. **Class-based vs Functional**
   - ✅ **Seçilen:** Class-based (Seesaw class)
   - **Neden:** Instance state yönetimi, lifecycle metodları (activate/deactivate)
   - **Ödün:** Functional programming avantajlarından feragat

### Limitations

1. **Browser Compatibility**
   - Web Audio API: Modern tarayıcılar (Chrome, Firefox, Safari, Edge)
   - CSS Transform: IE11+ (ancak test edilmedi)
   - LocalStorage: Tüm modern tarayıcılar

2. **Performance Constraints**
   - Maksimum 10 seesaw sınırı: DOM element sayısını kontrol altında tutmak için
   - Animation loop: Her seesaw için ayrı `requestAnimationFrame` (aktif olanlar için)
   - Çok fazla nesne (>50): Render performansı düşebilir

3. **Feature Limitations**
   - Nesneler sadece plank üzerine düşebilir (dışarıya düşme yok)
   - Plank genişliği dinamik ama nesneler dışında kalamaz (min width constraint)
   - Ses efektleri basit synthesized sesler (gerçek ses dosyaları yok)

4. **Technical Limitations**
   - Torque hesaplaması basitleştirilmiş: Sadece weight × distance (gerçek fizikte daha karmaşık)
   - Açı sınırlaması: -30° ile +30° arası (gerçekçi ama sınırlı)
   - Bounce animasyonu: Basit fizik simülasyonu (gerçek momentum korunmuyor)

## AI Kullanımı

Bu projede AI araçları aşağıdaki durumlarda kullanılmıştır:

- **Commit mesajları**: Debugging ve mimari kararlar için commit mesajlarının yazılmasında
- **Syntax hataları**: Kod yazımı sırasında oluşan syntax error'ların tespiti ve düzeltilmesinde
- **Debugging**: Hata ayıklama süreçlerinde
- **Kod tamamlama**: IDE tab tuşu ile kod tamamlama (autocomplete) özelliği

**Not**: Ana kod yapısı, fizik hesaplamaları, algoritmalar (reverse rotation, trigonometri dönüşümleri) ve mimari kararlar manuel olarak geliştirilmiştir.

## Lisans

MIT
