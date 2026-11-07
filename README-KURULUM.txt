VELANDRIS LABS — GÜNCEL SÜRÜM / KVKK ÖNCE

DOSYALAR
- index.html, style.css, app.js, config.js: ana site ve tarayıcı araçları
- programlar.html: ücretsiz program kataloğu
- kvkk.html, cerezler.html: yayın öncesi hukuki bilgilendirme taslakları
- assets/mark.svg: logo
- worker/: Cloudflare Worker API kaynağı ve D1 şeması

GİZLİLİK İÇİN BU SÜRÜMDEKİ DEĞİŞİKLİKLER
- Web3Forms formu kapatıldı; erişim anahtarı kaldırıldı. İletişim bağlantısı kullanıcının kendi e-posta uygulamasını açar.
- Cloudflare Web Analytics script'i kaldırıldı.
- 60 saniyelik klavye testi yerel olarak çalışır. Çevrim içi liderlik tablosu arayüzü duraklatıldı.
- worker/index.js bakım modundadır; Cloudflare Worker'a ayrıca Deploy edilmelidir.
- Eski D1 skorları varsa otomatik silinmez. KVKK-YAYIN-ONCESI-TAMAMLAMA.txt içindeki adımları izle.

GITHUB PAGES
1. ZIP'i çıkar.
2. Klasörün İÇERİĞİNİ GitHub deposunun kök dizinine yükle/değiştir.
3. index.html, style.css, app.js, config.js, programlar.html, kvkk.html, cerezler.html ve assets/ aynı yapıda olmalı.
4. Commit changes yap.
5. Siteyi Ctrl+F5 ile yenile.

CLOUDFLARE WORKER
1. Cloudflare > Workers & Pages > velandris-leaderboard-api > Edit code.
2. worker/index.js dosyasının tamamını yapıştır ve Deploy et.
3. /api/health adresinde maintenance: true görünmeli.
4. worker/schema.sql dosyasını yeniden çalıştırma; eski tabloyu otomatik silmez.

YAYIN ENGELİ
KVKK-YAYIN-ONCESI-TAMAMLAMA.txt içindeki veri sorumlusu adı/ünvanı, tebligat adresi, aktarım mekanizmaları ve eski D1 kayıtları teyit edilmeden metinleri nihai kabul etme.
