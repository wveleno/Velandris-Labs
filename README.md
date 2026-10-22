# Velandris Labs v10 — doğru yükleme paketi

## GitHub Pages'e site dosyalarını yükleme

Bu ZIP'in içindeki web dosyaları **doğrudan kök dizin için hazırlanmıştır**. ZIP'i GitHub'a tek bir ZIP dosyası olarak yüklemeyin.

1. ZIP'i bilgisayarınızda çıkarın.
2. GitHub deposunun `main` dalındaki kök dizine `index.html`, `style.css`, `app.js`, `config.js` ve `assets/` klasörünü birlikte yükleyin. Eski dosyaların üzerine yazmadan önce yedek alın.
3. `worker/` klasörü GitHub Pages sitesi için değil, Cloudflare Worker'ı yayımlarken kullanılacak kaynak koddur.
4. `config.js` şimdilik API adresi boş bırakılmıştır. Cloudflare Worker API kodu dağıtılıp test edilmeden adres eklemeyin.
5. GitHub Pages ayarı `main` dalı ve `/(root)` olarak kalabilir. Kök dizindeki `index.html` ana sayfayı açar.

## Ortak Klavye Arenası arka ucu

- `worker/schema.sql`: Cloudflare D1 Console'da çalıştırılacak tablo şeması.
- `worker/index.js`: Worker editörüne koyulacak API kodu.
- Worker'ın D1 binding değişken adı `DB` olmalıdır ve `velandris-leaderboard` veritabanına bağlanmalıdır.
- Worker yayımlandıktan ve `/api/health` ile test edildikten sonra `config.js` içindeki `window.VELANDRIS_LEADERBOARD_API` değerine Worker kök adresini yazın (sonuna `/api` eklemeyin), örneğin `https://velandris-leaderboard-api.KULLANICI.workers.dev`.

Önemli: Ortak liderlik tablosu, Worker kodu dağıtılmadan ve D1 bağlantısı doğrulanmadan canlı çalışmaz. Ön yüz tek başına GitHub Pages üzerinde açılabilir.
