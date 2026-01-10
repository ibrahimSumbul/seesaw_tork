# Seesaw Tork Simülasyonu

Tork tabanlı fizik mekanikleri ile interaktif seesaw simülasyonu.

## Özellikler

- Tork hesaplaması: `torque = weight × distance`
- Açı formülü: `angle = clamp((rightTorque - leftTorque) / 10, -30, 30)`
- Smooth animasyonlar
- LocalStorage ile kalıcılık

## Teknolojiler

- Pure JavaScript (ES6+)
- HTML5
- CSS3

## Çalıştırma

```bash
python3 -m http.server 8080
open http://localhost:8080
```

## Lisans

MIT
