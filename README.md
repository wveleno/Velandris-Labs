# Velandris Labs v10 — Ortak Klavye Arenası

Bu paket GitHub Pages sitesini korur ve ortak, herkesin görebildiği klavye hız tablosu için Cloudflare Worker + D1 arka ucunu ekler. Eski v9 paketini yedekleyin; bu klasördeki `site/` dosyaları yayınlanacak ön yüz, `worker/` dosyaları sunucu tarafıdır.

## Nasıl çalışır?

- Klavye testi açıldığında Worker rastgele metin ve bir test oturumu oluşturur.
- 30 saniyelik testin sonunda tarayıcı yalnızca yazılan metni gönderir. WPM ve doğruluk sunucuda tekrar hesaplanır.
- Takma adın tüm zamanlar ve haftalık en iyi sonucu D1 veritabanında tutulur.
- Liderlik tablosu herkese açıktır ve açık olduğu sürece 15 saniyede bir yenilenir.
- Bu MVP hesap/kimlik doğrulaması kullanmaz. Takma adlar sahiplik açısından doğrulanmaz; ödül/turnuva gibi yüksek güvence gerektiren kullanım için yeterli anti-cheat değildir. Gerçek ad veya hassas bilgi girmeyin.

## 1. Cloudflare D1 veritabanını oluştur

1. https://dash.cloudflare.com/ adresine gir.
2. **Workers & Pages → D1 SQL Database → Create database** yoluyla `velandris-leaderboard` adlı veritabanı oluştur.
3. Veritabanının **Console / SQL** bölümüne gir ve `worker/schema.sql` dosyasının tüm içeriğini çalıştır.

## 2. Worker'ı yayımla

1. **Workers & Pages → Create → Worker** yoluyla `velandris-leaderboard` isimli Worker oluştur.
2. Worker'ın kod düzenleyicisini aç, örnek kodu sil ve `worker/index.js` dosyasının tamamını yapıştırıp Deploy et.
3. Worker **Settings → Bindings → Add binding → D1 database** bölümünde değişken adını tam `DB` yapıp oluşturduğun `velandris-leaderboard` veritabanını bağla. Kaydet ve yeniden Deploy et.
4. Worker'ın `https://...workers.dev` adresini açıp sonuna `/api/health` ekleyerek test et. `{"ok":true,...}` benzeri yanıt görmelisin.
5. Adres `/api/leaderboard?period=weekly` için boş `entries` döndürüyorsa tablo kurulmuştur; başlangıçta skor olmaması normaldir.

> Worker kodundaki izin verilen Origin listesi varsayılan olarak `https://wveleno.github.io` ve eski `https://velandrislabs.netlify.app` alan adlarını içerir. Özel alan adı kullanırsan `ALLOWED_ORIGINS` listesine sadece sitenin origin'ini (protokol + alan adı, yol olmadan) ekle.

## 3. GitHub Pages ön yüzünü bağla

1. `site/` klasörünün içindeki `index.html`, `style.css`, `app.js`, `config.js` ve `assets/` klasörünü depo köküne birlikte kopyala. Depodaki mevcut dosyaların üzerine yazmadan önce yedek al.
2. `config.js` dosyasını aç ve boş satırı Worker adresinle değiştir:

   ```js
   window.VELANDRIS_LEADERBOARD_API = 'https://velandris-leaderboard.KULLANICI-ADIN.workers.dev';
   ```

   `KULLANICI-ADIN` kısmını Cloudflare'ın gerçek Worker URL'siyle değiştir. URL'nin sonuna `/api` ekleme.
3. GitHub Desktop'ta değişiklikleri kontrol et, commit et ve **Push origin** ile gönder.
4. Yayınlanan sayfayı aç, **Klavye Hız Testi → Klavye Arenası** bölümünü kontrol et. Başta tablo boş görünebilir. Testi bitir, 3–18 karakterlik bir takma ad yaz ve **Skoru paylaş** düğmesine bas. Diğer ziyaretçiler de aynı sırayı görecektir.

## Kontrol uçları

- `GET /api/health` — Worker'ın çalıştığını kontrol eder.
- `POST /api/start` — sunucu tarafında rastgele test metni ve oturum üretir.
- `POST /api/submit` — süreyi/oturumu kontrol eder, skoru sunucuda hesaplayıp en iyi sonucu saklar.
- `GET /api/leaderboard?period=weekly` — haftalık ilk 10.
- `GET /api/leaderboard?period=alltime` — tüm zamanlar ilk 10.

## Ücretsiz plan ve sınırlar

Cloudflare belgelerine göre Workers Free katmanı günlük 100.000 istek, D1 Free ise günlük 5 milyon satır okuma ve 100.000 satır yazma içerir. Limit aşılırsa bazı istekler gün sonuna kadar hata verebilir. Küçük bir başlangıç projesi için yeterli olabilir, ancak sınırsızlık veya kesintisiz çalışma garantisi değildir. Kaynaklar:

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/platform/limits/

## Test / güvenlik notları

- Bu sürüm kullanıcı hesabı istemez. Skorlar günlük rekabet içindir, profesyonel hile tespiti değildir.
- Sunucu, oturum metnini kendisi üretir, en az 28 saniye geçmiş olmasını ister, oturumu tek kullanımlık yapar ve 250 WPM üstünü reddeder.
- Aynı takma adla 10 saniye içinde birden fazla skor yollanması engellenir.
- Kullanıcılar takma adlarını başkası adına da yazabilir; sahiplik doğrulanmıyor. Resmî yarışma yapılacaksa doğrulanmış kimlik veya e-posta hesabı eklemek gerekir.
- Worker CORS izni yalnızca kaynak kodda tanımlı sitelere verilir; bu, tek başına bir kimlik doğrulama sistemi değildir.
