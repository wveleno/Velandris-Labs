const ALLOWED_ORIGINS = new Set([
  "https://wveleno.github.io",
  "https://velandrislabs.netlify.app"
]);
const DURATION_MS = 30_000;
const MIN_SUBMIT_MS = 28_000;
const MAX_SUBMIT_MS = 120_000;
const MAX_WPM = 250;
const WORD_BANK = `bugün yarın zaman dünya insan hayat düşünce fikir çözüm çalışma emek başarı öğrenmek geliştirmek tasarım yazılım teknoloji üretim paylaşmak keşfetmek denemek düzenlemek oluşturmak başlamak bitirmek hızlı doğru dikkat sakin güçlü kolay küçük büyük farklı yeni güzel gerçek önemli değer fayda sonuç hedef plan yöntem adım süreç alışkanlık ihtiyaç amaç araç uygulama ekran klavye pencere dosya klasör bilgi veri metin içerik görsel renk bağlantı sayfa web tarayıcı cihaz bilgisayar telefon öğrenci öğretmen ekip kullanıcı proje sistem hizmet deneyim kalite güvenlik gizlilik performans hız doğruluk denge odak enerji düzen akış liste tablo satır sütun kayıt alan ayar seçenek kontrol test örnek belge rapor kaynak sonuç ilerleme değişim gelişim fırsat merak üretici geliştirici yazar okur oyuncu taslak notlar görev iş planlama yöntem odaklanmak düşünmek anlamak anlatmak yazmak okumak çizmek görmek duymak seçmek bulmak çözmek ölçmek hesaplamak karşılaştırmak azaltmak artırmak sadeleştirmek iyileştirmek hızlandırmak korumak kullanmak denetlemek tamamlamak işe yarar verimli tutarlı anlaşılır güvenilir erişilebilir yaratıcı pratik esnek modern sade temiz parlak kararlı dikkatli hafif akıllı çevik düzenli faydalı etkili bağlantılı yerel hızlıca güvenle adımlar ayrıntı örnekler içerikler dosyalar görseller sayılar harfler karakterler kelimeler cümleler araçlar fikirler insanlar işler merak beceri deneyim gelişme hedefler`.trim().split(/\s+/u);
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function headersFor(origin) {
  const h = new Headers(JSON_HEADERS);
  if (ALLOWED_ORIGINS.has(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Vary", "Origin");
    h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    h.set("Access-Control-Allow-Headers", "Content-Type");
    h.set("Access-Control-Max-Age", "86400");
  }
  return h;
}
function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status: status || 200, headers });
}
function shuffledPrompt() {
  const pool = WORD_BANK.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 58).join(" ");
}
function cleanNickname(value) {
  const nickname = String(value || "").normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (nickname.length < 3 || nickname.length > 18 || !/[\p{L}\p{N}]/u.test(nickname) || /[^\p{L}\p{N} _.-]/u.test(nickname)) return null;
  return { nickname, key: nickname.toLocaleLowerCase("tr-TR") };
}
function normalizeWords(text) {
  return String(text || "").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").toLocaleLowerCase("tr-TR").trim().split(/\s+/u).filter(Boolean);
}
function calculateScore(prompt, typedText, elapsedMs) {
  const expected = normalizeWords(prompt);
  const source = String(typedText || "");
  const words = normalizeWords(source);
  const endsAtBoundary = !source || /[\s\p{P}\p{S}]$/u.test(source);
  let completed = words.slice();
  if (!endsAtBoundary && completed.length) {
    const last = completed.length - 1;
    if (completed[last] !== expected[last]) completed = completed.slice(0, -1);
  }
  let correct = 0;
  completed.forEach((word, i) => { if (word === expected[i]) correct++; });
  const accuracy = completed.length ? Math.round((correct / completed.length) * 100) : 0;
  const wpm = elapsedMs > 0 ? Math.round((correct * 60_000) / elapsedMs) : 0;
  return { wpm, accuracy, correctWords: correct, completedWords: completed.length };
}
function weekStartUtc(now) {
  const d = new Date(now);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}
async function handle(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin") || "";
  const corsHeaders = headersFor(origin);
  if (request.method === "OPTIONS") {
    if (!ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Bu site bu API'yi kullanamaz." }, 403, corsHeaders);
  if (url.pathname === "/api/health" && request.method === "GET") return json({ ok: true, service: "Velandris Klavye Arenası", version: 1 }, 200, corsHeaders);
  if (!env.DB) return json({ error: "D1 veritabanı bağlantısı yapılandırılmamış." }, 503, corsHeaders);

  if (url.pathname === "/api/start" && request.method === "POST") {
    const now = Date.now();
    const sessionId = crypto.randomUUID();
    const prompt = shuffledPrompt();
    await env.DB.prepare("DELETE FROM typing_sessions WHERE started_at < ?1").bind(now - 86_400_000).run();
    await env.DB.prepare("INSERT INTO typing_sessions (session_id, prompt, started_at, submitted) VALUES (?1, ?2, ?3, 0)").bind(sessionId, prompt, now).run();
    return json({ sessionId, prompt, startedAt: now, durationMs: DURATION_MS }, 200, corsHeaders);
  }

  if (url.pathname === "/api/submit" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Geçerli JSON gönder." }, 400, corsHeaders); }
    const sessionId = String(body.sessionId || "");
    const player = cleanNickname(body.nickname);
    const typedText = typeof body.typedText === "string" ? body.typedText : "";
    if (!/^[\da-f-]{36}$/i.test(sessionId)) return json({ error: "Test oturumu geçersiz. Yeni test başlat." }, 400, corsHeaders);
    if (!player) return json({ error: "Takma ad 3–18 karakter olmalı; harf, sayı, boşluk, nokta, tire ve alt çizgi kullan." }, 400, corsHeaders);
    if (typedText.length > 5000) return json({ error: "Gönderilen metin çok uzun." }, 413, corsHeaders);
    const session = await env.DB.prepare("SELECT session_id, prompt, started_at, submitted FROM typing_sessions WHERE session_id = ?1").bind(sessionId).first();
    if (!session || session.submitted) return json({ error: "Bu test oturumu bulunamadı veya daha önce gönderildi. Yeni test başlat." }, 409, corsHeaders);
    const now = Date.now();
    const elapsedMs = now - Number(session.started_at);
    if (elapsedMs < MIN_SUBMIT_MS) return json({ error: "Test süresi tamamlanmadan skor gönderilemez." }, 400, corsHeaders);
    if (elapsedMs > MAX_SUBMIT_MS) return json({ error: "Bu test oturumunun süresi doldu. Yeni test başlat." }, 400, corsHeaders);
    const score = calculateScore(session.prompt, typedText, elapsedMs);
    if (score.completedWords < 1 || score.correctWords < 1) return json({ error: "Sıralamaya girmek için en az bir doğru kelime yaz." }, 400, corsHeaders);
    if (score.wpm > MAX_WPM) return json({ error: "Bu sonuç doğrulanamadı. Yeni test ile tekrar dene." }, 400, corsHeaders);
    const cooldown = await env.DB.prepare("SELECT updated_at FROM typing_players WHERE nickname_key = ?1").bind(player.key).first();
    if (cooldown && now - Number(cooldown.updated_at) < 10_000) return json({ error: "Aynı takma adla yeni skor göndermek için 10 saniye bekle." }, 429, corsHeaders);

    const marked = await env.DB.prepare("UPDATE typing_sessions SET submitted = 1 WHERE session_id = ?1 AND submitted = 0").bind(sessionId).run();
    if (!marked.meta || marked.meta.changes !== 1) return json({ error: "Bu sonuç zaten gönderilmiş." }, 409, corsHeaders);

    const existing = await env.DB.prepare("SELECT * FROM typing_players WHERE nickname_key = ?1").bind(player.key).first();
    const weekStart = weekStartUtc(now);
    const allTimeBetter = !existing || score.wpm > Number(existing.all_time_wpm) || (score.wpm === Number(existing.all_time_wpm) && score.accuracy > Number(existing.all_time_accuracy));
    const weeklyIsNew = !existing || Number(existing.week_start) < weekStart;
    const weeklyBetter = weeklyIsNew || score.wpm > Number(existing.weekly_wpm) || (score.wpm === Number(existing.weekly_wpm) && score.accuracy > Number(existing.weekly_accuracy));
    const allTime = allTimeBetter ? score : { wpm: existing.all_time_wpm, accuracy: existing.all_time_accuracy, correctWords: existing.all_time_correct_words, completedWords: existing.all_time_completed_words, submittedAt: existing.all_time_submitted_at };
    const weekly = weeklyBetter ? score : { wpm: existing.weekly_wpm, accuracy: existing.weekly_accuracy, correctWords: existing.weekly_correct_words, completedWords: existing.weekly_completed_words, submittedAt: existing.weekly_submitted_at };
    const row = {
      nickname_key: player.key, nickname: player.nickname,
      all_time_wpm: allTime.wpm, all_time_accuracy: allTime.accuracy, all_time_correct_words: allTime.correctWords,
      all_time_completed_words: allTime.completedWords, all_time_submitted_at: allTime.submittedAt || now,
      weekly_wpm: weekly.wpm, weekly_accuracy: weekly.accuracy, weekly_correct_words: weekly.correctWords,
      weekly_completed_words: weekly.completedWords, week_start: weekStart, weekly_submitted_at: weekly.submittedAt || now,
      updated_at: now
    };
    await env.DB.prepare(`INSERT OR REPLACE INTO typing_players
      (nickname_key, nickname, all_time_wpm, all_time_accuracy, all_time_correct_words, all_time_completed_words, all_time_submitted_at,
       weekly_wpm, weekly_accuracy, weekly_correct_words, weekly_completed_words, week_start, weekly_submitted_at, updated_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)`)
      .bind(row.nickname_key,row.nickname,row.all_time_wpm,row.all_time_accuracy,row.all_time_correct_words,row.all_time_completed_words,row.all_time_submitted_at,
        row.weekly_wpm,row.weekly_accuracy,row.weekly_correct_words,row.weekly_completed_words,row.week_start,row.weekly_submitted_at,row.updated_at).run();
    return json({ ok: true, nickname: player.nickname, wpm: score.wpm, accuracy: score.accuracy, correctWords: score.correctWords, completedWords: score.completedWords, elapsedMs }, 200, corsHeaders);
  }

  if (url.pathname === "/api/leaderboard" && request.method === "GET") {
    const period = url.searchParams.get("period") === "alltime" ? "alltime" : "weekly";
    const now = Date.now();
    const weekStart = weekStartUtc(now);
    let result;
    if (period === "alltime") {
      result = await env.DB.prepare("SELECT nickname, all_time_wpm AS wpm, all_time_accuracy AS accuracy, all_time_correct_words AS correctWords, all_time_completed_words AS completedWords, all_time_submitted_at AS submittedAt FROM typing_players ORDER BY all_time_wpm DESC, all_time_accuracy DESC, all_time_submitted_at ASC LIMIT 10").all();
    } else {
      result = await env.DB.prepare("SELECT nickname, weekly_wpm AS wpm, weekly_accuracy AS accuracy, weekly_correct_words AS correctWords, weekly_completed_words AS completedWords, weekly_submitted_at AS submittedAt FROM typing_players WHERE week_start = ?1 ORDER BY weekly_wpm DESC, weekly_accuracy DESC, weekly_submitted_at ASC LIMIT 10").bind(weekStart).all();
    }
    return json({ period, entries: result.results || [], updatedAt: now }, 200, corsHeaders);
  }
  return json({ error: "API yolu bulunamadı." }, 404, corsHeaders);
}
export default { fetch: handle };
