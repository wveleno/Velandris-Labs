VELANDRIS LABS — AI'SIZ, HİZMETLER EKLENMİŞ SÜRÜM

Bu paket mevcut koyu tasarımı korur, AI Hub bölümünü ve ona ait Netlify Function'ı kaldırır; Hizmetler bölümü ekler.

GITHUB / NETLIFY GÜNCELLEME
1. ZIP dosyasını bilgisayarında ayrı bir klasöre çıkar.
2. İçindeki index.html, style.css, app.js ve netlify.toml dosyalarını GitHub deposunun kök dizinine yükle ve aynı adlı dosyaların üzerine yaz.
3. Netlify'ın dağıtımının tamamlanmasını bekle.
4. Siteyi açıp JSON, Base64, QR ve Metin araçlarını kontrol et.

ANALİTİK — CLOUDFLARE WEB ANALYTICS
Bu pakete sahte bir izleme anahtarı eklenmedi. Cloudflare Analytics, site için gerçek bir beacon token üretildikten sonra etkinleştirilmelidir.
1. https://www.cloudflare.com/web-analytics/ adresinden Web Analytics'i aç.
2. Yeni site ekle ve sitenin adresini gir.
3. Cloudflare'ın verdiği JavaScript beacon kodunu kopyala.
4. index.html dosyasındaki kapanış </body> etiketinin hemen üstüne kodu ekle.
5. Değişikliği GitHub'a yükle ve birkaç saat sonra Cloudflare panelinde ziyaret verilerini kontrol et.
Not: Bu işlem için sitenin DNS'ini Cloudflare'a taşımak gerekmez; Web Analytics'in verdiği snippet kullanılabilir. Analytics verileri kurulumdan sonra toplanır, geçmiş ziyaretleri geriye dönük göstermez.

NOTLAR
- API anahtarı bu pakette bulunmaz.
- Kullanıcı kayıt/giriş sistemi eklenmedi; mevcut araçlar hesap gerektirmeden çalışmaya devam eder.
- QR kod aracı, QR görseli üretmek için harici api.qrserver.com servisini kullanır; hassas içerikleri bu araca girmeyin.
- E-posta adresinin gelen posta alabildiği ayrıca doğrulanmalıdır.
