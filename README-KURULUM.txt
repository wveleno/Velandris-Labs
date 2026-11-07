VELANDRIS LABS — GÜNCEL PROJE PAKETİ

SİTE DOSYALARI
- index.html, style.css, app.js, config.js: ana site ve tarayıcı araçları
- programlar.html: ücretsiz programlar kataloğu
- kvkk.html: kısa Gizlilik ve Veri Kullanımı açıklaması
- cerezler.html: eski bağlantı için kvkk.html içindeki çerez bölümüne yönlendirme
- assets/mark.svg: logo
- worker/: klavye sıralaması API kaynağı ve D1 şeması

MEVCUT GİZLİLİK DAVRANIŞI
- Üyelik, ödeme ve satın alma yok.
- Görsel/metin araçları tarayıcıda çalışır; dosyalar site sunucusuna yüklenmez.
- Günlük planlayıcı görevleri tarayıcı localStorage alanında tutar.
- Klavye testi 60 saniye olarak cihazda çalışır; çevrim içi skor paylaşımı kapalıdır.
- İş birliği formu otomatik gönderim yapmaz; kullanıcının e-posta uygulamasında taslak açar.
- Cloudflare Web Analytics ve Web3Forms bu sürümde kullanılmaz.

GITHUB PAGES'E YÜKLEME
1. ZIP'i çıkar.
2. İçindeki dosya ve klasörleri mevcut GitHub deposunun kök dizinine kopyala.
3. Aynı isimli dosyaları değiştir; assets/ ve worker/ klasörlerini kendi klasörlerinde tut.
4. GitHub Desktop üzerinden commit ve push yap.
5. Siteyi Ctrl+F5 ile yenileyip ana sayfa, programlar ve gizlilik sayfasını kontrol et.

CLOUDFLARE WORKER
worker/index.js bakım modunda hazırlanmıştır. Çevrim içi sıralama tekrar açılmadan önce eski D1 kayıtları ve veri saklama/aktarımı ayrıca gözden geçirilmelidir. SQL şemasını yeniden çalıştırma; mevcut tabloyu silmez.

HUKUKİ NOT
Bu sayfa, sitenin mevcut teknik davranışını sade biçimde açıklar; tek başına hukuki uygunluk garantisi veya tamamlanmış resmî KVKK aydınlatma metni değildir. Kanun'un 10. maddesi kapsamındaki resmî aydınlatmada veri sorumlusunun gerçek kişi adı-soyadı veya tüzel kişi unvanı belirtilmelidir. Velandris Labs marka adı tek başına bu kimlik bilgisinin yerini tutmaz. Bu nedenle site ziyaretçisine gerçek olmayan/uydurma bir kimlik ya da doldurulacak köşeli parantezli alan gösterilmez.
