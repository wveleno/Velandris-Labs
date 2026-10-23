VELANDRIS LABS — SON HALİ

PAKET İÇERİĞİ
- index.html: ChatGPT paylaşımından gelebilen utm_source=chatgpt.com parametresini açılışta URL'den temizler; mevcut Cloudflare Web Analytics kodu korunur. Ana sayfa açıklamaları puan sistemine göre güncellendi.
- app.js: Klavye testinde puan sistemi ve ortak liderlik tablosu arayüzü.
- config.js: Aktif Cloudflare Worker API adresi tanımlı.
- style.css ve assets/mark.svg: Sitenin görünümü ve logo varlığı.
- worker/index.js: Puanı sunucuda hesaplayan, puana göre sıralayan ve uygunsuz kullanıcı adlarını filtreleyen Worker.
- worker/schema.sql: Mevcut D1 tablo şemasının referansı; yeniden çalıştırman gerekmiyor.

PUANLAMA
- 30 saniyelik testte her doğru tamamlanan kelime = 1 puan.
- Yanlış kelime = 0 puan.
- Eşit puan durumunda doğruluk yüzdesi yüksek olan oyuncu üstte olur.
- Sağlayıcıdaki mevcut D1 tablosu korunur; SQL'i tekrar çalıştırma.
- Mevcut kayıtların saklanan doğru kelime sayısı puan olarak kullanılır.

GITHUB PAGES GÜNCELLEME
1. Bu ZIP'i bilgisayarında çıkar.
2. İçindeki index.html, app.js ve config.js dosyalarını GitHub deposunun KÖK dizinindeki aynı isimli dosyalarla değiştir.
3. style.css ve assets/mark.svg bu sürümle aynı site sürümündeyse değiştirmek gerekmez; istersen pakettekilerle de değiştirebilirsin.
4. Commit changes yap. worker klasörünü GitHub Pages deposuna yüklemen şart değil.
5. Canlı siteyi Ctrl+F5 ile yenile.

CLOUDFLARE WORKER GÜNCELLEME
1. Cloudflare > Workers & Pages > velandris-leaderboard-api > Edit code.
2. worker/index.js dosyasının TAMAMINI Worker editörüne yapıştır.
3. Deploy yap.
4. Sağlık kontrolü: https://velandris-leaderboard-api.furkanaybakan11.workers.dev/api/health
   Başarılı yanıt içinde "ok": true ve "version": 2 görünmeli.

TEST
1. Siteyi Ctrl+F5 ile yenile.
2. Klavye Hız Testi'ni aç ve 30 saniyelik testi tamamla.
3. Örneğin 12 doğru tamamlanan kelime varsa sonuç 12 puan olmalı.
4. Temiz bir kullanıcı adıyla skoru paylaş ve liderlik tablosunda puan olarak göründüğünü kontrol et.

NOTLAR
- Bu işlem dosyaları hazırlar; GitHub'a veya Cloudflare'a kendiliğinden yükleme yapmaz.
- Cloudflare Web Analytics verilerinin toplanması için internet tarayıcısında Analytics beaconi engellenmemiş olmalıdır.
- URL temizliği yalnızca utm_source=chatgpt.com parametresini kaldırır; diğer sorgu parametreleri korunur.


KOD KONTROLÜ
- Gelen önceki Worker kodu burada 147 satır / 11.467 karakterdi. Bu Worker sürümü 190 satır / 13.658 karakterdir; satır sayısı kısalmadı, kod hacmi yaklaşık %19 arttı. Editörde görünen satır sarımları bu sayımla aynı olmayabilir.
- app.js ve worker/index.js JavaScript sözdizimi denetiminden geçirildi.
- D1 veritabanı şeması değiştirilmedi; worker/schema.sql dosyasını tekrar çalıştırma.
