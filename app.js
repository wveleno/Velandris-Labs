(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const LEADERBOARD_API_BASE = String(window.VELANDRIS_LEADERBOARD_API || '').trim().replace(/\/+$/, '');
  const modal = $('#appModal'), title = $('#workspaceTitle'), desc = $('#workspaceDesc'), body = $('#workspaceBody'), status = $('#workspaceStatus');
  let currentApp = null;
  let typingTimer = null, typingStartAt = 0, typingActive = false, typingElapsedMs = 0, typingCurrentPrompt = '', typingPromptUsed = false;
  let typingServerSessionId = null, typingFinished = false, leaderboardRefreshTimer = null, leaderboardLoadInFlight = false;
  const typingNicknameKey = 'velandris-typing-nickname-v1';
  const typingDurationMs = 30000;
  // Her denemede kelime havuzundan yeni bir sıralama üretilir; sabit paragraf listesi yoktur.
  const typingWordBank = (`bugün yarın zaman dünya insan hayat düşünce fikir çözüm çalışma emek başarı öğrenmek geliştirmek tasarım yazılım teknoloji üretim paylaşmak keşfetmek denemek düzenlemek oluşturmak başlamak bitirmek hızlı doğru dikkat sakin güçlü kolay küçük büyük farklı yeni güzel gerçek önemli değer fayda sonuç hedef plan yöntem adım süreç alışkanlık ihtiyaç amaç araç uygulama ekran klavye pencere dosya klasör bilgi veri metin içerik görsel renk bağlantı sayfa web tarayıcı cihaz bilgisayar telefon öğrenci öğretmen ekip kullanıcı proje sistem hizmet deneyim kalite güvenlik gizlilik performans hız doğruluk denge odak enerji düzen akış liste tablo satır sütun kayıt alan ayar seçenek kontrol test örnek belge rapor kaynak sonuç başarı ilerleme değişim gelişim fırsat merak üretici geliştirici yazar okur oyuncu taslak fikirler notlar görev iş süreç planlama paylaşım erişim yöntem sonuç odaklanmak düşünmek anlamak anlatmak yazmak okumak çizmek görmek duymak seçmek bulmak çözmek ölçmek hesaplamak karşılaştırmak azaltmak artırmak sadeleştirmek iyileştirmek hızlandırmak korumak kullanmak denetlemek tamamlamak öğrenilen işe yarar verimli tutarlı anlaşılır güvenilir erişilebilir yaratıcı pratik esnek modern sade temiz parlak kararlı dikkatli hafif akıllı çevik düzenli faydalı etkili bağlantılı yerel hızlıca güvenle adımları ayrıntı örnekler içerikler dosyalar görseller sayılar harfler karakterler kelimeler cümleler araçlar fikirler insanlar işler üretim merak beceri deneyim gelişme başarı hedefler`.trim()).split(/\s+/);
  function normalizeTypingWords(text){
    return String(text ?? '')
      .replace(/[\p{P}\p{S}]/gu, ' ')
      .toLocaleLowerCase('tr-TR')
      .trim()
      .split(/\s+/u)
      .filter(Boolean);
  }
  function chooseTypingPrompt(){
    const pool=typingWordBank.slice();
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    typingCurrentPrompt=pool.slice(0,58).join(' ');
    typingPromptUsed=false;
    const root=$('#typingPrompt');if(root)root.textContent=typingCurrentPrompt;
  }
  function typingProgress(raw){
    const expected=normalizeTypingWords(typingCurrentPrompt);
    const source=String(raw ?? '');
    const words=normalizeTypingWords(source);
    const endsAtBoundary=!source || /[\s\p{P}\p{S}]$/u.test(source);
    let completed=words.slice();
    if(!endsAtBoundary && completed.length){
      const last=completed.length-1;
      // Son kelime hedefteki kelimeyle tamamen eşleşmediyse henüz tamamlanmadı.
      if(completed[last]!==expected[last]) completed=completed.slice(0,-1);
    }
    let correct=0;
    completed.forEach((word,i)=>{if(word===expected[i])correct++;});
    return {expected,words,completed,correct};
  }
  function paintTypingPrompt(raw){
    const root=$('#typingPrompt');if(!root)return;root.replaceChildren();
    const {expected,words,completed}=typingProgress(raw);
    expected.forEach((word,i)=>{
      const span=document.createElement('span');span.textContent=word;
      if(i<completed.length) span.className=completed[i]===expected[i]?'typed-correct':'typed-wrong';
      else if(i===completed.length && words.length>completed.length) span.className='typing-current';
      root.append(span);
      if(i<expected.length-1)root.append(document.createTextNode(' '));
    });
  }
  function updateTypingStats(){
    const inputEl=$('#typingInput');if(!inputEl)return;
    const {completed,correct}=typingProgress(inputEl.value);
    const elapsed=typingActive?Date.now()-typingStartAt:typingElapsedMs;
    const points=correct;
    const accuracy=completed.length?Math.round(correct/completed.length*100):100;
    const speed=elapsed>0?Math.round(correct*60000/elapsed):0;
    $('#typingTime').textContent=Math.ceil(Math.max(0,typingDurationMs-elapsed)/1000)+'s';
    $('#typingPoints').textContent=String(points);
    const speedEl=$('#typingSpeed');if(speedEl)speedEl.textContent=String(speed);
    $('#typingAccuracy').textContent=accuracy+'%';
    paintTypingPrompt(inputEl.value);
  }
  function resetTypingTest(newPrompt=false){
    if(typingTimer){clearInterval(typingTimer);typingTimer=null;}
    typingActive=false;typingElapsedMs=0;typingServerSessionId=null;typingFinished=false;
    if(newPrompt||!typingCurrentPrompt)chooseTypingPrompt();
    const inputEl=$('#typingInput');if(inputEl){inputEl.value='';inputEl.disabled=true;}
    if($('#typingHelp'))$('#typingHelp').textContent='Her doğru tamamlanan kelime 1 puan kazandırır. Yanlış kelimeler puan kazandırmaz.';
    if($('#typingResult'))$('#typingResult').textContent='Başlamak için testi başlat.';
    const start=$('[data-action="startTypingTest"]');if(start){start.textContent='30 saniyelik testi başlat';start.disabled=false;}
    const share=$('[data-action="submitTypingScore"]');if(share)share.disabled=true;
    updateTypingStats();
  }
  function finishTypingTest(){
    if(!typingActive)return;
    typingElapsedMs=Math.min(typingDurationMs,Date.now()-typingStartAt);
    typingActive=false;
    if(typingTimer){clearInterval(typingTimer);typingTimer=null;}
    const inputEl=$('#typingInput');
    if(inputEl)inputEl.disabled=true;
    updateTypingStats();
    const progress=typingProgress(inputEl?inputEl.value:'');
    const points=progress.correct;
    const acc=$('#typingAccuracy').textContent;
    typingFinished=true;
    $('#typingResult').textContent=`Test bitti. Puanın: ${points}. Kelime doğruluğu: ${acc}.`;
    $('#typingHelp').textContent=`Büyük/küçük harf ve noktalama dikkate alınmadı. Tamamladığın kelime: ${progress.completed.length}; doğru kelime: ${progress.correct}.`;
    const share=$('[data-action="submitTypingScore"]');if(share)share.disabled=!(LEADERBOARD_API_BASE && typingServerSessionId);
    if(!LEADERBOARD_API_BASE){
      const msg=$('#leaderboardStatus');if(msg)msg.textContent='Ortak sıralama için sunucu bağlantısı henüz kurulmadı. Test yerel olarak çalışıyor.';
    } else if(!typingServerSessionId){
      const msg=$('#leaderboardStatus');if(msg)msg.textContent='Bu deneme çevrim içi oturum olmadan başladı; skoru tabloya gönderemezsin. Bağlantıyı kontrol edip yeni test başlat.';
    }
    statusMsg('Klavye testi tamamlandı.');
    const start=$('[data-action="startTypingTest"]');if(start)start.textContent='Tekrar dene';
  }
  async function beginTypingTest(){
    if(typingTimer){clearInterval(typingTimer);typingTimer=null;}
    const inputEl=$('#typingInput');if(!inputEl)return;
    typingServerSessionId=null;typingFinished=false;
    const start=$('[data-action="startTypingTest"]');
    if(LEADERBOARD_API_BASE){
      if(start){start.disabled=true;start.textContent='Metin hazırlanıyor…';}
      try{
        const session=await leaderboardRequest('/api/start',{method:'POST',body:'{}'});
        if(currentApp!=='typingtest'||modal.hidden)return;
        if(!session||!session.sessionId||!session.prompt)throw new Error('Sunucudan test metni alınamadı.');
        typingServerSessionId=session.sessionId;typingCurrentPrompt=session.prompt;
        const root=$('#typingPrompt');if(root)root.textContent=typingCurrentPrompt;
        const lm=$('#leaderboardStatus');if(lm)lm.textContent='Çevrim içi test hazır. Sonuçlar ortak sıralamaya gönderilebilir.';
      }catch(err){
        if(currentApp!=='typingtest'||modal.hidden)return;
        chooseTypingPrompt();
        const lm=$('#leaderboardStatus');if(lm)lm.textContent='Liderlik tablosuna bağlanılamadı. Test yerel başlayacak; bu deneme sıralamaya gönderilemez.';
      }finally{if(start)start.disabled=false;}
    } else if(typingPromptUsed){chooseTypingPrompt();}
    if(currentApp!=='typingtest'||modal.hidden)return;
    typingPromptUsed=true;
    inputEl.value='';inputEl.disabled=false;typingActive=true;typingElapsedMs=0;typingStartAt=Date.now();
    if($('#typingResult'))$('#typingResult').textContent='Test başladı. Kelimeleri sırayla yaz.';
    if($('#typingHelp'))$('#typingHelp').textContent='Kelimeleri sırayla yaz. Doğru kelimeler yeşil, hatalı kelimeler kırmızı görünür.';
    const share=$('[data-action="submitTypingScore"]');if(share)share.disabled=true;
    statusMsg(typingServerSessionId?'Çevrim içi klavye testi başladı.':'Klavye testi başladı.');updateTypingStats();inputEl.focus();
    typingTimer=setInterval(()=>{typingElapsedMs=Date.now()-typingStartAt;updateTypingStats();if(typingElapsedMs>=typingDurationMs)finishTypingTest();},100);
  }
  async function leaderboardRequest(path, options={}){
    if(!LEADERBOARD_API_BASE)throw new Error('Liderlik tablosu API adresi ayarlanmamış.');
    const headers={...(options.method==='POST'?{'Content-Type':'application/json'}:{}),...(options.headers||{})};
    const response=await fetch(`${LEADERBOARD_API_BASE}${path}`,{...options,headers,cache:'no-store'});
    let data={};try{data=await response.json();}catch{}
    if(!response.ok)throw new Error(data.error||`Sunucu hatası (${response.status}).`);
    return data;
  }
  function setLeaderboardStatus(message, isError=false){
    const el=$('#leaderboardStatus');if(!el)return;
    el.textContent=message;el.classList.toggle('is-error',Boolean(isError));
  }
  function renderLeaderboardRows(rows){
    const root=$('#leaderboardRows');if(!root)return;
    root.replaceChildren();
    if(!Array.isArray(rows)||rows.length===0){
      const empty=document.createElement('div');empty.className='leaderboard-empty';
      empty.textContent=LEADERBOARD_API_BASE?'Henüz skor yok. İlk sonucu sen gönder!':'Ortak tablo, sunucu bağlantısı kurulduğunda burada görünecek.';
      root.append(empty);return;
    }
    rows.forEach((row,index)=>{
      const item=document.createElement('article');item.className=`leaderboard-row${index===0?' leaderboard-first':''}`;
      const rank=document.createElement('span');rank.className='leaderboard-rank';rank.textContent=String(index+1).padStart(2,'0');
      const name=document.createElement('div');name.className='leaderboard-player';
      const strong=document.createElement('strong');strong.textContent=row.nickname;
      const small=document.createElement('small');small.textContent=`Doğruluk %${Math.round(Number(row.accuracy)||0)} · ${Number(row.correctWords)||0} doğru kelime`;
      name.append(strong,small);
      const pointValue=Number(row.points ?? row.correctWords ?? 0)||0;
      const points=document.createElement('strong');points.className='leaderboard-speed';points.textContent=`${pointValue} puan`;
      item.append(rank,name,points);root.append(item);
    });
  }
  async function loadLeaderboard(silent=false){
    if(leaderboardLoadInFlight)return;
    const period=$('#leaderboardPeriod')?.value==='alltime'?'alltime':'weekly';
    if(!LEADERBOARD_API_BASE){
      setLeaderboardStatus('Ortak sıralama için Cloudflare Worker bağlantısı gerekiyor. Site şu anda GitHub Pages üzerinde çalıştığı için verileri tek başına paylaşamaz.');
      renderLeaderboardRows([]);return;
    }
    leaderboardLoadInFlight=true;
    if(!silent)setLeaderboardStatus('Sıralama yükleniyor…');
    try{
      const data=await leaderboardRequest(`/api/leaderboard?period=${period}`);
      renderLeaderboardRows(data.entries||[]);
      const updated=$('#leaderboardUpdated');if(updated)updated.textContent='Son kontrol: '+new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      setLeaderboardStatus('Ortak tablo açık · yaklaşık 15 saniyede bir yenilenir.');
    }catch(err){setLeaderboardStatus(`Liderlik tablosu yüklenemedi: ${err.message}`,true);renderLeaderboardRows([]);}
    finally{leaderboardLoadInFlight=false;}
  }
  async function submitTypingScore(){
    if(!typingFinished){setLeaderboardStatus('Önce 30 saniyelik testi tamamla.',true);return;}
    if(!LEADERBOARD_API_BASE||!typingServerSessionId){setLeaderboardStatus('Bu test çevrim içi oturumla başlamadı. API bağlantısını kurduktan sonra yeni bir test başlat.',true);return;}
    const nickEl=$('#leaderboardNickname');
    const nickname=String(nickEl?.value||'').trim().replace(/\s+/g,' ');
    if(nickname.length<3||nickname.length>18||!/[\p{L}\p{N}]/u.test(nickname)||/[^\p{L}\p{N} _.-]/u.test(nickname)){
      setLeaderboardStatus('3–18 karakterlik bir takma ad gir. Harf, sayı, boşluk, nokta, tire ve alt çizgi kullanabilirsin.',true);nickEl?.focus();return;
    }
    try{localStorage.setItem(typingNicknameKey,nickname);}catch{}
    const button=$('[data-action="submitTypingScore"]');if(button){button.disabled=true;button.textContent='Gönderiliyor…';}
    setLeaderboardStatus('Skor doğrulanıyor ve ortak tabloya gönderiliyor…');
    try{
      const data=await leaderboardRequest('/api/submit',{method:'POST',body:JSON.stringify({sessionId:typingServerSessionId,nickname,typedText:$('#typingInput')?.value||''})});
      typingServerSessionId=null;
      const submittedPoints=Number(data.points ?? data.correctWords ?? 0)||0;
      const submittedSpeed=Math.round(submittedPoints*60000/typingDurationMs);
      $('#typingResult').textContent=`Skor gönderildi! ${data.nickname}: ${submittedPoints} puan · ${submittedSpeed} kelime/dk · doğruluk %${data.accuracy}.`;
      setLeaderboardStatus('Skor herkesin görebildiği ortak tabloya eklendi.');
      await loadLeaderboard(true);
    }catch(err){setLeaderboardStatus(`Skor gönderilemedi: ${err.message}`,true);}
    finally{if(button){button.disabled=!typingServerSessionId;button.textContent='Skoru paylaş';}}
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const btn = (label, action, cls='secondary') => `<button type="button" class="button ${cls} small" data-action="${action}">${label}</button>`;
  const field = (label, name, inner, extra='') => `<div class="field ${extra}"><label for="${name}">${label}</label>${inner}</div>`;
  const input = (name, value='', type='text', attrs='') => `<input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs}>`;
  const textarea = (name, placeholder='', value='') => `<textarea id="${name}" name="${name}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  const actionBar = (buttons) => `<div class="workspace-actions">${buttons}</div>`;
  const result = (id='result') => `<div class="result-box" id="${id}" aria-live="polite">Sonuç burada görünecek.</div>`;
  const statusMsg = (msg) => { status.textContent = msg; };
  const fileName = (name) => (name || 'velandris-output').replace(/[\\/:*?"<>|]+/g,'_');
  const download = (name, data, type='text/plain;charset=utf-8') => {
    const blob = data instanceof Blob ? data : new Blob([data], {type});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=fileName(name); document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1200);
  };
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); statusMsg('Panoya kopyalandı.'); }
    catch { const t=document.createElement('textarea'); t.value=text; document.body.append(t); t.select(); const ok=document.execCommand('copy'); t.remove(); statusMsg(ok?'Panoya kopyalandı.':'Kopyalama engellendi; sonucu seçip kopyalayabilirsin.'); }
  }
  function openModal(id) {
    const app = apps[id]; if(!app) return;
    currentApp=id; title.textContent=app.title; desc.textContent=app.desc; body.innerHTML=app.render(); statusMsg('Hazır.'); modal.hidden=false; document.body.classList.add('modal-open'); $('#closeModal').focus();
    if(app.init) app.init();
  }
  function closeModal() { if(typingTimer){clearInterval(typingTimer);typingTimer=null;} if(leaderboardRefreshTimer){clearInterval(leaderboardRefreshTimer);leaderboardRefreshTimer=null;} typingActive=false; modal.hidden=true; document.body.classList.remove('modal-open'); body.innerHTML=''; currentApp=null; }
  $('#closeModal').addEventListener('click', closeModal);
  modal.addEventListener('click', e=>{ if(e.target===modal) closeModal(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !modal.hidden) closeModal(); });
  $('#clearWorkspace').addEventListener('click', ()=> { if(currentApp) openModal(currentApp); });
  document.addEventListener('click', e=>{
    const appButton=e.target.closest('[data-app], [data-open-app]');
    if(appButton){e.preventDefault();openModal(appButton.dataset.app || appButton.dataset.openApp);return;}
    const actionButton=e.target.closest('[data-action]'); if(actionButton){e.preventDefault();const fn=actions[actionButton.dataset.action];if(fn) fn(actionButton);}
  });
  const search = $('#appSearch');
  if(search) search.addEventListener('input', ()=>{
    const q=search.value.trim().toLocaleLowerCase('tr'); let count=0;
    $$('.app-card').forEach(card=>{const match=!q || (card.innerText+' '+card.dataset.tags).toLocaleLowerCase('tr').includes(q);card.hidden=!match;if(match)count++;});
    $('#emptyApps').hidden=count!==0;
  });
  const menuToggle=$('#menuToggle'), nav=$('#nav');
  if(menuToggle && nav) menuToggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));});
  if(nav) nav.addEventListener('click',e=>{if(e.target.closest('a')){nav.classList.remove('open');menuToggle?.setAttribute('aria-expanded','false');}});
  $('#year').textContent=new Date().getFullYear();

  function csvParse(text) {
    const rows=[]; let row=[], field='', quoted=false;
    for(let i=0;i<text.length;i++) { const c=text[i];
      if(quoted) { if(c==='"' && text[i+1]==='"'){field+='"';i++;} else if(c==='"') quoted=false; else field+=c; }
      else if(c==='"' && field==='') quoted=true;
      else if(c===','){row.push(field);field='';}
      else if(c==='\n'){row.push(field);rows.push(row);row=[];field='';}
      else if(c!=='\r') field+=c;
    }
    row.push(field); if(row.length>1 || row[0]!=='') rows.push(row);
    if(quoted) throw new Error('CSV içinde kapanmamış çift tırnak var.');
    return rows;
  }
  const csvCell = v => { const s=String(v??''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
  const jsonToRows = data => {
    if(!Array.isArray(data)) throw new Error('CSV dönüşümü için JSON kökünde nesne dizisi olmalı.');
    const headers=[...new Set(data.flatMap(x=>x && typeof x==='object'&&!Array.isArray(x)?Object.keys(x):[]))];
    if(!headers.length && data.length) throw new Error('Dizide dönüştürülebilir nesne bulunamadı.');
    return [headers.map(csvCell).join(','), ...data.map(item=>headers.map(k=>csvCell(item?.[k] == null ? '' : typeof item[k]==='object'?JSON.stringify(item[k]):item[k])).join(','))].join('\r\n');
  };
  const plannerStorageKey = 'velandris-daily-planner-v1';
  let plannerMemoryTasks = [];
  let plannerStorageWritable = true;
  function loadPlannerTasks(){
    if(!plannerStorageWritable) return plannerMemoryTasks.slice();
    try {
      const raw = localStorage.getItem(plannerStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      plannerMemoryTasks = Array.isArray(parsed) ? parsed.filter(t => t && typeof t.text === 'string' && typeof t.id === 'string') : [];
      return plannerMemoryTasks.slice();
    } catch { return plannerMemoryTasks.slice(); }
  }
  function savePlannerTasks(tasks){
    plannerMemoryTasks = tasks.slice();
    try { localStorage.setItem(plannerStorageKey, JSON.stringify(tasks)); plannerStorageWritable = true; return true; }
    catch { plannerStorageWritable = false; return false; }
  }
  function renderPlannerTasks(){
    const list = $('#plannerTaskList'); if(!list) return;
    const tasks = loadPlannerTasks().sort((a,b) => Number(a.done)-Number(b.done) || ({high:0,normal:1,low:2}[a.priority] ?? 1)-({high:0,normal:1,low:2}[b.priority] ?? 1) || (a.createdAt||0)-(b.createdAt||0));
    const active = tasks.filter(t => !t.done).length;
    const completed = tasks.length-active;
    const count = $('#plannerCount'); if(count) count.textContent = `${active} görev kaldı · ${completed} tamamlandı`;
    list.innerHTML = tasks.length ? tasks.map(task => {
      const due = task.due ? `Tarih: ${esc(new Date(task.due+'T12:00:00').toLocaleDateString('tr-TR',{day:'numeric',month:'short'}))}` : 'Tarih belirlenmedi';
      const priority = ({high:'Öncelikli',normal:'Normal',low:'Düşük'})[task.priority] || 'Normal';
      const priorityClass = ({high:'priority-high',normal:'priority-normal',low:'priority-low'})[task.priority] || 'priority-normal';
      return `<article class="planner-task ${task.done?'is-done':''}"><button type="button" class="task-toggle" data-action="togglePlannerTask" data-task-id="${esc(task.id)}" aria-label="${task.done?'Görevi yeniden aç':'Görevi tamamla'}" aria-pressed="${Boolean(task.done)}">${task.done?'✓':'○'}</button><div class="planner-task-main"><strong>${esc(task.text)}</strong><div class="planner-task-meta"><span>${due}</span><span class="planner-priority ${priorityClass}">${priority}</span></div></div><button type="button" class="task-delete" data-action="deletePlannerTask" data-task-id="${esc(task.id)}" aria-label="Görevi sil">×</button></article>`;
    }).join('') : '<div class="planner-empty"><span>✓</span><strong>Listen hazır.</strong><small>İlk görevini ekleyince burada görünecek.</small></div>';
    const clear = $('#clearPlannerCompleted'); if(clear) clear.hidden = completed === 0;
  }
  const apps = {
    imageflow:{title:'Görsel Atölyesi',desc:'Birden fazla görseli tarayıcında yeniden boyutlandır ve yeni biçimde indir. Dönüştürme, tarayıcının desteklediği formatlarla sınırlıdır.',render:()=>`${field('Görselleri seç','imageFiles',input('imageFiles','','file','accept="image/*" multiple'))}<div class="field-grid">${field('Çıktı biçimi','imageFormat',`<select id="imageFormat"><option value="image/webp">WebP</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select>`)}${field('Maksimum genişlik (px)','imageWidth',input('imageWidth','1600','number','min="1" max="12000"'))}${field('Kalite','imageQuality',input('imageQuality','0.82','range','min="0.1" max="1" step="0.01"')+'<small id="qualityLabel">82%</small>')}${field('Arka plan (JPEG için)','imageBg',`<input id="imageBg" type="color" value="#ffffff">`)}</div><p class="help-text">PNG kayıpsızdır; kalite ayarı WebP/JPEG için geçerlidir. Şeffaflık JPEG'e dönüştürülürken seçtiğin arka planla doldurulur.</p>${actionBar(btn('Görselleri dönüştür','convertImages','primary'))}<div id="imageResults" class="file-list"></div>`,init:()=>{$('#imageQuality').addEventListener('input',e=>{const f=$('#qualityLabel');if(f)f.textContent=Math.round(Number(e.target.value)*100)+'%';});}},
    dataflow:{title:'Tablo ve Veri Atölyesi',desc:'JSON/CSV verisini doğrula, dönüştür ve dosya olarak dışa aktar.',render:()=>`${field('İşlem','dataMode',`<select id="dataMode"><option value="jsoncsv">JSON → CSV</option><option value="csvjson">CSV → JSON</option><option value="pretty">JSON biçimlendir / doğrula</option></select>`)}${field('Girdi verisi','dataInput',textarea('dataInput','JSON veya CSV içeriğini buraya yapıştır'))}${actionBar(btn('Veriyi işle','processData','primary')+btn('Örnek yükle','sampleData'))}<div class="output-row"><strong>Sonuç</strong>${actionBar(btn('Kopyala','copyData')+btn('Dosya indir','downloadData'))}</div>${result('dataResult')}`,init:()=>{$('#dataMode').addEventListener('change',()=>{statusMsg('Seçilen işlem: '+$('#dataMode').selectedOptions[0].text);});}},
    textflow:{title:'Metin ve Liste Düzenleyici',desc:'Dağınık metni, listeyi veya kopyalanan veriyi birkaç adımda temizle.',render:()=>`${field('Metin','textInput',textarea('textInput','Metni veya satır listesini buraya yapıştır'))}<div class="checks"><label><input type="checkbox" id="trimLines" checked> Satır başı/sonu boşluklarını sil</label><label><input type="checkbox" id="collapseSpaces" checked> Fazla boşlukları düzelt</label><label><input type="checkbox" id="removeEmpty" checked> Boş satırları kaldır</label><label><input type="checkbox" id="dedupe"> Tekrar satırları ayıkla</label><label><input type="checkbox" id="sortLines"> Alfabetik sırala</label></div><div class="field-grid">${field('Satır başına eklenecek metin','linePrefix',input('linePrefix'))}${field('Satır sonuna eklenecek metin','lineSuffix',input('lineSuffix'))}</div>${actionBar(btn('Akışı uygula','runText','primary')+btn('Girdiyi temizle','resetText'))}<div class="output-row"><strong>Temizlenmiş sonuç</strong>${actionBar(btn('Kopyala','copyTextResult')+btn('TXT indir','downloadTextResult'))}</div>${result('textResult')}`},
    planner:{title:'Günlük Planlayıcı',desc:'Görevlerini ekle, önceliğini belirle ve tamamladıklarını işaretle. Liste bu tarayıcıda saklanır; bir hesaba veya sunucuya gönderilmez.',render:()=>`${field('Yeni görev','plannerTaskText',input('plannerTaskText','','text','maxlength="140" placeholder="Örn. İlk Instagram gönderisini hazırla"'))}<div class="field-grid">${field('Tarih (isteğe bağlı)','plannerTaskDue',input('plannerTaskDue','','date'))}${field('Öncelik','plannerTaskPriority',`<select id="plannerTaskPriority"><option value="normal">Normal</option><option value="high">Öncelikli</option><option value="low">Düşük</option></select>`)}</div>${actionBar(btn('Görev ekle','addPlannerTask','primary'))}<div class="planner-summary"><strong>Bugünkü listen</strong><span id="plannerCount">0 görev kaldı</span></div><div class="planner-task-list" id="plannerTaskList"></div><div class="planner-bottom-actions">${btn('Tamamlananları temizle','clearPlannerCompleted')}<span>Yalnızca bu tarayıcıda saklanır.</span></div>`,init:()=>{renderPlannerTasks();$('#plannerTaskText').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();actions.addPlannerTask();}});}},
    password:{title:'Güçlü Şifre Üretici',desc:'Şifreyi tarayıcı içinde Web Crypto ile oluştur. Gerçek hesap parolalarını bu araca veya başka birine gönderme.',render:()=>`${field('Şifre uzunluğu','pwLength',input('pwLength','20','number','min="8" max="128"'))}<div class="checks"><label><input type="checkbox" id="pwLower" checked> Küçük harf</label><label><input type="checkbox" id="pwUpper" checked> Büyük harf</label><label><input type="checkbox" id="pwNumbers" checked> Rakam</label><label><input type="checkbox" id="pwSymbols" checked> Sembol</label></div>${actionBar(btn('Yeni şifre üret','makePassword','primary')+btn('Kopyala','copyPassword'))}<div class="result-box" id="passwordResult">Üretmek için düğmeye bas.</div><p class="help-text">Şifre, yalnızca bu sayfada üretilir. Panoya kopyalama düğmesine basmadıkça kopyalanmaz.</p>`},
    color:{title:'Renk ve Kontrast Stüdyosu',desc:'Renk değerlerini incele ve metin/arka plan kontrastını WCAG oranıyla kontrol et.',render:()=>`${divFieldColor()}<div class="field-grid">${field('Metin rengi','fgColor',`<input id="fgColor" type="color" value="#edf6ff">`)}${field('Arka plan rengi','bgColor',`<input id="bgColor" type="color" value="#07101b">`)}</div><div class="result-box" id="colorSample" style="font-family:system-ui;font-size:18px;padding:24px;background:#07101b;color:#edf6ff">Örnek metin — Velandris Labs</div>${actionBar(btn('Kontrastı hesapla','calcContrast','primary')+btn('HEX kopyala','copyColor'))}<div class="result-box" id="colorResult">Kontrast sonucu burada.</div>`,init:()=>['mainColor','fgColor','bgColor'].forEach(id=>$('#'+id).addEventListener('input',updateColorSample))},
    urltools:{title:'URL İnceleyici',desc:'Bağlantıyı parçalara ayır, sorgu parametrelerini incele veya bileşenleri kodla/çöz.',render:()=>`${field('URL','urlInput',input('urlInput','https://example.com/search?q=velandris&page=1','url'))}${actionBar(btn('URL incele','inspectUrl','primary')+btn('URL kopyala','copyUrl'))}<div class="result-box" id="urlResult">URL bilgileri burada.</div>${field('Kodlanacak veya çözülecek metin','urlText',textarea('urlText','Bir metin, parametre veya URL parçası'))}${actionBar(btn('URL kodla','encodeUrl')+btn('URL çöz','decodeUrl')+btn('Sonucu kopyala','copyUrlText'))}<div class="result-box" id="urlTextResult">Dönüşüm sonucu burada.</div>`},
    datetime:{title:'Tarih ve Zaman Aracı',desc:'Unix timestamp ve tarih arasında dönüşüm yap veya iki tarih arasındaki süreyi hesapla.',render:()=>`${field('Unix timestamp (saniye veya milisaniye)','timestampInput',input('timestampInput',String(Math.floor(Date.now()/1000))))}${actionBar(btn('Timestamp → tarih','tsToDate','primary')+btn('Şu anı al','nowTimestamp'))}${result('timestampResult')}<div class="field-grid">${field('Başlangıç tarihi','dateStart',input('dateStart',new Date().toISOString().slice(0,10),'date'))}${field('Bitiş tarihi','dateEnd',input('dateEnd',new Date().toISOString().slice(0,10),'date'))}</div>${actionBar(btn('Tarih farkını hesapla','dateDiff')+btn('Tarihi timestamp yap','dateToTs'))}${result('dateResult')}`},
    regex:{title:'Regex Test Alanı',desc:'Düzenli ifadeyi test metninde çalıştır. Regex büyük metinlerde veya riskli desenlerde yavaşlayabileceği için yalnızca güvendiğin desenleri kullan.',render:()=>`<div class="field-grid">${field('Düzenli ifade','regexPattern',input('regexPattern','\\b(velandris)\\b'))}${field('Bayraklar','regexFlags',input('regexFlags','gi'))}</div>${field('Test metni','regexText',textarea('regexText','Metni buraya yaz','Velandris Labs ile işlerini hızlandır. Velandris araçlarını keşfet.'))}${actionBar(btn('Regex test et','runRegex','primary')+btn('Eşleşmeleri kopyala','copyMatches'))}<div class="output-row"><strong>Eşleşmeler</strong><span id="regexCount" class="help-text">Henüz test edilmedi</span></div><div class="match-list" id="regexMatches"></div>${result('regexResult')}`},
    typingtest:{title:'Klavye Hız Testi',desc:'30 saniyede doğru tamamladığın kelimeleri say. İstersen skorunu herkesin görebileceği ortak liderlik tablosuna gönder.',render:()=>`<div class="typing-test-shell"><div class="typing-stats"><div><span>KALAN SÜRE</span><strong id="typingTime">30s</strong></div><div><span>PUAN</span><strong><b id="typingPoints">0</b> <small>puan</small><span class="typing-speed-inline"> · <b id="typingSpeed">0</b> kelime/dk</span></strong></div><div><span>KELİME DOĞRULUĞU</span><strong id="typingAccuracy">100%</strong></div></div><p class="typing-instruction">Her denemede sunucudan veya rastgele kelime havuzundan yeni bir metin gelir. Büyük/küçük harf ve noktalama sonucu etkilemez.</p><div class="typing-prompt" id="typingPrompt" aria-label="Yazılacak metin"></div>${field('Yazma alanı','typingInput',`<textarea id="typingInput" placeholder="Testi başlatınca buraya yazmaya başla…" disabled autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>`)}<p class="help-text" id="typingHelp">Her doğru tamamlanan kelime 1 puan kazandırır. Yanlış kelimeler puan kazandırmaz.</p>${actionBar(btn('30 saniyelik testi başlat','startTypingTest','primary')+btn('Yeni metin','newTypingPrompt'))}${result('typingResult')}<section class="leaderboard-panel" aria-labelledby="leaderboardTitle"><div class="leaderboard-heading"><div><span class="app-category">VELANDRIS LABS / SIRALAMA</span><h3 id="leaderboardTitle">Klavye Arenası</h3><p>En iyi sonuçlar burada herkese aynı şekilde görünür.</p></div><button type="button" class="leaderboard-refresh" data-action="loadLeaderboard" aria-label="Sıralamayı yenile">↻ Yenile</button></div><div class="leaderboard-controls">${field('Takma ad','leaderboardNickname',input('leaderboardNickname','','text','maxlength="18" autocomplete="nickname" placeholder="Örn. velox"'))}<div class="leaderboard-period-wrap"><label for="leaderboardPeriod">Sıralama</label><select id="leaderboardPeriod"><option value="weekly">Bu hafta</option><option value="alltime">Tüm zamanlar</option></select></div></div><div class="leaderboard-status" id="leaderboardStatus" role="status" aria-live="polite">Ortak sıralama bağlantısı kontrol ediliyor…</div><div id="leaderboardRows" class="leaderboard-rows"><div class="leaderboard-empty">Sıralama yükleniyor…</div></div><div class="leaderboard-footer"><span id="leaderboardUpdated">Henüz yenilenmedi</span><button type="button" class="button primary small" data-action="submitTypingScore" disabled>Skoru paylaş</button></div><p class="leaderboard-disclaimer">Gerçek adını veya iletişim bilgilerini kullanma. Uygunsuz takma adlar engellenir; sıralama önce puana, eşitlikte doğruluğa göre yapılır.</p></section></div>`,init:()=>{resetTypingTest(true);const name=$('#leaderboardNickname');try{name.value=localStorage.getItem(typingNicknameKey)||'';}catch{}$('#typingInput').addEventListener('input',updateTypingStats);$('#leaderboardPeriod').addEventListener('change',()=>loadLeaderboard());if(name)name.addEventListener('change',()=>{try{localStorage.setItem(typingNicknameKey,name.value.trim());}catch{}});loadLeaderboard();if(leaderboardRefreshTimer)clearInterval(leaderboardRefreshTimer);leaderboardRefreshTimer=setInterval(()=>loadLeaderboard(true),15000);}},
    brief:{title:'Plan ve Doküman Asistanı',desc:'İş tanımı, toplantı notu, hata raporu veya README için düzenli bir taslak oluştur.',render:()=>`${field('Taslak türü','briefType',`<select id="briefType"><option value="task">Görev tanımı</option><option value="bug">Hata raporu</option><option value="meeting">Toplantı özeti</option><option value="readme">README</option><option value="release">Sürüm notları</option><option value="content">İçerik planı</option></select>`)}${field('Başlık / proje adı','briefTitle',input('briefTitle','','text','placeholder="Örn. Kullanıcı panelini yenile"'))}${field('Ham notların veya gereksinimlerin','briefNotes',textarea('briefNotes','Kısa notlarını, hedefi, sorunu veya gereksinimleri yaz.'))}${actionBar(btn('Taslak oluştur','makeBrief','primary')+btn('Kopyala','copyBrief')+btn('Markdown indir','downloadBrief'))}${result('briefResult')}`}
  };
  function divFieldColor(){return field('Ana renk','mainColor',`<div style="display:flex;gap:10px;align-items:center"><input id="mainColor" type="color" value="#54e3ff"><code id="mainHex">#54E3FF</code></div>`)}
  const actions={
    convertImages:async()=>{const files=[...($('#imageFiles').files||[])].filter(f=>f.type.startsWith('image/'));if(!files.length){statusMsg('Önce en az bir görsel seç.');return;}const type=$('#imageFormat').value,max=Math.max(1,Number($('#imageWidth').value)||1600),quality=Number($('#imageQuality').value)||.82,bg=$('#imageBg').value;const out=$('#imageResults');out.innerHTML='';let ok=0;for(const file of files){try{const src=URL.createObjectURL(file);const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=src;});const scale=Math.min(1,max/img.naturalWidth),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(type==='image/jpeg'){ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);}ctx.drawImage(img,0,0,w,h);const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,type==='image/png'?undefined:quality));URL.revokeObjectURL(src);if(!blob)throw new Error('Bu biçim tarayıcı tarafından desteklenmiyor.');const ext=type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp';const name=fileName(file.name.replace(/\.[^.]+$/,''))+`-velandris.${ext}`;const url=URL.createObjectURL(blob);const row=document.createElement('div');row.className='file-result';row.innerHTML=`<img class="file-thumb" alt="" src="${url}"><span class="file-meta"><strong>${esc(file.name)}</strong><small>${w}×${h} · ${fmtBytes(blob.size)} (önce ${fmtBytes(file.size)})</small></span><a href="${url}" download="${esc(name)}">İndir ↗</a>`;out.append(row);ok++;}catch(err){const row=document.createElement('div');row.className='file-result';row.innerHTML=`<span>!</span><span class="file-meta"><strong>${esc(file.name)}</strong><small>${esc(err.message||'Dönüştürülemedi')}</small></span>`;out.append(row);}}statusMsg(`${ok}/${files.length} görsel hazır.`);},
    processData:()=>{try{const mode=$('#dataMode').value,raw=$('#dataInput').value;let out,type='text/plain;charset=utf-8',name='velandris-data.txt';if(!raw.trim())throw new Error('Önce veri yapıştır.');if(mode==='pretty'){out=JSON.stringify(JSON.parse(raw),null,2);name='velandris-data.json';}else if(mode==='jsoncsv'){out=jsonToRows(JSON.parse(raw));name='velandris-data.csv';type='text/csv;charset=utf-8';}else{const rows=csvParse(raw);if(rows.length<1)throw new Error('CSV verisi boş.');const headers=rows[0];out=JSON.stringify(rows.slice(1).filter(r=>r.some(c=>c!=='')).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??'']))),null,2);name='velandris-data.json';type='application/json;charset=utf-8';}$('#dataResult').textContent=out;$('#dataResult').dataset.output=out;$('#dataResult').dataset.filename=name;$('#dataResult').dataset.type=type;statusMsg('Veri başarıyla işlendi.');}catch(err){$('#dataResult').textContent='Hata: '+err.message;statusMsg('Veri işlenemedi. Girdiyi kontrol et.');}},
    sampleData:()=>{$('#dataInput').value=$('#dataMode').value==='csvjson'?'ad,rol,aktif\nAda,Designer,true\nDeniz,Developer,true':'[\n  {"ad":"Ada","rol":"Designer","aktif":true},\n  {"ad":"Deniz","rol":"Developer","aktif":true}\n]';statusMsg('Örnek veri yüklendi.');},
    copyData:()=>copyText($('#dataResult').dataset.output||$('#dataResult').textContent),
    downloadData:()=>{const el=$('#dataResult');if(!el.dataset.output){statusMsg('Önce veriyi işle.');return;}download(el.dataset.filename||'velandris-data.txt',el.dataset.output,el.dataset.type||'text/plain;charset=utf-8');},
    runText:()=>{let lines=$('#textInput').value.replace(/\r\n?/g,'\n').split('\n');if($('#trimLines').checked)lines=lines.map(x=>x.trim());if($('#collapseSpaces').checked)lines=lines.map(x=>x.replace(/[\t ]+/g,' '));if($('#removeEmpty').checked)lines=lines.filter(x=>x.length);if($('#dedupe').checked){const seen=new Set();lines=lines.filter(x=>seen.has(x)?false:(seen.add(x),true));}if($('#sortLines').checked)lines.sort((a,b)=>a.localeCompare(b,'tr'));const prefix=$('#linePrefix').value||'',suffix=$('#lineSuffix').value||'';const out=lines.map(x=>prefix+x+suffix).join('\n');$('#textResult').textContent=out;$('#textResult').dataset.output=out;statusMsg(`${lines.length} satır hazırlandı.`);},
    resetText:()=>{$('#textInput').value='';$('#textResult').textContent='Sonuç burada görünecek.';delete $('#textResult').dataset.output;statusMsg('Girdi temizlendi.');},copyTextResult:()=>copyText($('#textResult').dataset.output??$('#textResult').textContent),downloadTextResult:()=>download('velandris-temiz-metin.txt',$('#textResult').dataset.output??$('#textResult').textContent),
    makePassword:()=>{const len=Math.max(8,Math.min(128,Number($('#pwLength').value)||20));let sets=[];if($('#pwLower').checked)sets.push('abcdefghijkmnopqrstuvwxyz');if($('#pwUpper').checked)sets.push('ABCDEFGHJKLMNPQRSTUVWXYZ');if($('#pwNumbers').checked)sets.push('23456789');if($('#pwSymbols').checked)sets.push('!@#$%^&*()-_=+[]{}:,.?');if(!sets.length){statusMsg('En az bir karakter grubu seç.');return;}const all=sets.join('');const rand=max=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max;};let chars=sets.map(s=>s[rand(s.length)]);while(chars.length<len)chars.push(all[rand(all.length)]);for(let i=chars.length-1;i>0;i--){const j=rand(i+1);[chars[i],chars[j]]=[chars[j],chars[i]];}const pw=chars.slice(0,len).join('');$('#passwordResult').textContent=pw;$('#passwordResult').dataset.output=pw;statusMsg('Şifre üretildi.');},copyPassword:()=>copyText($('#passwordResult').dataset.output||$('#passwordResult').textContent),
    calcContrast:()=>{const fg=$('#fgColor').value,bg=$('#bgColor').value,ratio=contrast(fg,bg);$('#colorResult').textContent=`Kontrast oranı: ${ratio.toFixed(2)}:1\nNormal metin (AA): ${ratio>=4.5?'Geçer':'Geçmez'}\nBüyük metin (AA): ${ratio>=3?'Geçer':'Geçmez'}\nNormal metin (AAA): ${ratio>=7?'Geçer':'Geçmez'}`;statusMsg('Kontrast hesaplandı.');updateColorSample();},copyColor:()=>copyText($('#mainColor')?.value.toUpperCase()||$('#fgColor').value.toUpperCase()),
    inspectUrl:()=>{try{let raw=$('#urlInput').value.trim();if(!/^https?:\/\//i.test(raw))raw='https://'+raw;const u=new URL(raw);const params=[...u.searchParams.entries()];$('#urlResult').textContent=`Protokol: ${u.protocol}\nAlan adı: ${u.hostname}\nYol: ${u.pathname}\nPort: ${u.port||'(varsayılan)'}\nFragment: ${u.hash||'(yok)'}\n\nSorgu parametreleri:\n${params.length?params.map(([k,v])=>`• ${k} = ${v}`).join('\n'):'(parametre yok)'}`;$('#urlResult').dataset.output=u.href;statusMsg('URL çözümlendi.');}catch(err){$('#urlResult').textContent='Geçerli bir URL gir.';statusMsg('URL okunamadı.');}},copyUrl:()=>copyText($('#urlResult').dataset.output||$('#urlInput').value),encodeUrl:()=>{const out=encodeURIComponent($('#urlText').value);$('#urlTextResult').textContent=out;$('#urlTextResult').dataset.output=out;},decodeUrl:()=>{try{const out=decodeURIComponent($('#urlText').value);$('#urlTextResult').textContent=out;$('#urlTextResult').dataset.output=out;}catch{$('#urlTextResult').textContent='Kodlanmış metin çözülemedi.';}},copyUrlText:()=>copyText($('#urlTextResult').dataset.output||$('#urlTextResult').textContent),
    tsToDate:()=>{const n=Number($('#timestampInput').value);if(!Number.isFinite(n)){statusMsg('Geçerli bir timestamp gir.');return;}const ms=Math.abs(n)<1e12?n*1000:n,d=new Date(ms);$('#timestampResult').textContent=Number.isNaN(d.getTime())?'Bu değer geçerli tarih aralığında değil.':`Yerel: ${d.toLocaleString('tr-TR')}\nUTC: ${d.toISOString()}\nMilisaniye: ${d.getTime()}\nSaniye: ${Math.floor(d.getTime()/1000)}`;},nowTimestamp:()=>{$('#timestampInput').value=String(Math.floor(Date.now()/1000));actions.tsToDate();},dateDiff:()=>{const a=new Date($('#dateStart').value+'T00:00:00'),b=new Date($('#dateEnd').value+'T00:00:00');if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime())){statusMsg('İki tarihi de seç.');return;}const days=Math.round((b-a)/86400000);$('#dateResult').textContent=`Fark: ${Math.abs(days)} gün\nYön: ${days<0?'bitiş başlangıçtan önce':days>0?'bitiş başlangıçtan sonra':'aynı gün'}\nHafta karşılığı: ${(Math.abs(days)/7).toFixed(2)}`;},dateToTs:()=>{const d=new Date($('#dateStart').value+'T00:00:00');$('#dateResult').textContent=Number.isNaN(d.getTime())?'Geçerli tarih seç.':`Yerel tarih başlangıcı: ${d.toLocaleString('tr-TR')}\nTimestamp (saniye): ${Math.floor(d.getTime()/1000)}\nTimestamp (ms): ${d.getTime()}`;},
    runRegex:()=>{const pattern=$('#regexPattern').value,flags=$('#regexFlags').value,text=$('#regexText').value,out=$('#regexMatches');out.innerHTML='';try{if(/[^dgimsuvy]/.test(flags)||new Set(flags).size!==flags.length)throw new Error('Bayraklar geçersiz veya tekrarlı.');const safeFlags=flags.includes('g')?flags:flags+'g';const re=new RegExp(pattern,safeFlags);let m,count=0;while((m=re.exec(text))&&count<500){const row=document.createElement('div');row.className='match';row.innerHTML=`<code>${esc(m[0])}</code><span>Konum ${m.index}–${m.index+m[0].length}</span>`;out.append(row);count++;if(m[0]==='')re.lastIndex++;}$('#regexCount').textContent=`${count} eşleşme`;$('#regexResult').textContent=count?`İlk ${count} eşleşme listelendi.`:'Eşleşme bulunamadı.';$('#regexResult').dataset.matches=[...out.querySelectorAll('.match code')].map(x=>x.textContent).join('\n');statusMsg('Regex testi tamamlandı.');}catch(err){$('#regexResult').textContent='Regex hatası: '+err.message;$('#regexCount').textContent='Hata';statusMsg('Desen veya bayrakları kontrol et.');}},copyMatches:()=>copyText($('#regexResult').dataset.matches||''),
    startTypingTest:()=>beginTypingTest(),
    loadLeaderboard:()=>loadLeaderboard(),
    submitTypingScore:()=>submitTypingScore(),
    newTypingPrompt:()=>{resetTypingTest(true);statusMsg('Yeni rastgele metin hazır. Testi başlatabilirsin.');},
    addPlannerTask:()=>{const inputEl=$('#plannerTaskText');const text=inputEl?.value.trim();if(!text){statusMsg('Önce bir görev yaz.');inputEl?.focus();return;}const tasks=loadPlannerTasks();if(tasks.length>=300){statusMsg('En fazla 300 görev saklanabilir.');return;}const id=(globalThis.crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2,9)}`);tasks.push({id,text,due:$('#plannerTaskDue').value,priority:$('#plannerTaskPriority').value,done:false,createdAt:Date.now()});const saved=savePlannerTasks(tasks);inputEl.value='';renderPlannerTasks();statusMsg(saved?'Görev listeye eklendi.':'Görev bu oturum boyunca saklandı; tarayıcı depolaması kullanılamıyor.');},
    togglePlannerTask:(button)=>{const id=button?.dataset.taskId;const tasks=loadPlannerTasks();const task=tasks.find(t=>t.id===id);if(!task)return;task.done=!task.done;const saved=savePlannerTasks(tasks);renderPlannerTasks();statusMsg(task.done?'Görev tamamlandı.':`Görev yeniden açıldı.${saved?'':' Liste kalıcı kaydedilemedi.'}`);},
    deletePlannerTask:(button)=>{const id=button?.dataset.taskId;const tasks=loadPlannerTasks().filter(t=>t.id!==id);const saved=savePlannerTasks(tasks);renderPlannerTasks();statusMsg(saved?'Görev silindi.':'Görev oturum listesinden silindi.');},
    clearPlannerCompleted:()=>{const tasks=loadPlannerTasks().filter(t=>!t.done);savePlannerTasks(tasks);renderPlannerTasks();statusMsg('Tamamlanan görevler temizlendi.');},
    makeBrief:()=>{const type=$('#briefType').value,title=$('#briefTitle').value.trim()||'Başlıksız çalışma',notes=$('#briefNotes').value.trim()||'(Henüz ayrıntı girilmedi.)';const templates={task:`# ${title}\n\n## Amaç\n${notes}\n\n## Kapsam\n- [ ] Yapılacak işi netleştir\n- [ ] Kabul kriterlerini belirle\n- [ ] Test ve doğrulama adımlarını yaz\n\n## Tamamlanma kriterleri\n- [ ] Beklenen sonuç elde edildi\n- [ ] Hata durumları kontrol edildi`,bug:`# Hata raporu: ${title}\n\n## Özet\n${notes}\n\n## Tekrarlama adımları\n1. \n2. \n3. \n\n## Beklenen sonuç\n\n## Gerçekleşen sonuç\n\n## Ortam / sürüm\n\n## Ekler`,meeting:`# Toplantı özeti: ${title}\n\n## Notlar\n${notes}\n\n## Alınan kararlar\n- \n\n## Aksiyonlar\n- [ ] Görev — Sorumlu — Tarih\n\n## Açık konular\n- `,readme:`# ${title}\n\n${notes}\n\n## Özellikler\n- \n\n## Kurulum\n1. Depoyu klonla\n2. Gereksinimleri yükle\n3. Uygulamayı çalıştır\n\n## Kullanım\n\n## Yapılandırma\n\n## Lisans`,release:`# Sürüm notları — ${title}\n\n## Yeni özellikler\n- ${notes}\n\n## İyileştirmeler\n- \n\n## Hata düzeltmeleri\n- \n\n## Bilinen sorunlar\n- `,content:`# İçerik planı: ${title}\n\n## Hedef ve konu\n${notes}\n\n## Taslaklar\n1. Eğitici içerik: \n2. Hızlı ipucu: \n3. Proje / süreç paylaşımı: \n\n## Yayın takvimi\n- Tarih — Kanal — Konu\n\n## Ölçülecek sonuç\n- `};const out=templates[type];$('#briefResult').textContent=out;$('#briefResult').dataset.output=out;statusMsg('Taslak oluşturuldu; bilgileri yayınlamadan önce gözden geçir.');},copyBrief:()=>copyText($('#briefResult').dataset.output||$('#briefResult').textContent),downloadBrief:()=>download('velandris-taslak.md',$('#briefResult').dataset.output||$('#briefResult').textContent,'text/markdown;charset=utf-8')
  };
  function fmtBytes(n){if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';return (n/1048576).toFixed(2)+' MB';}
  function rgb(hex){return hex.replace('#','').match(/.{2}/g).map(s=>parseInt(s,16));}
  function luminance(hex){return rgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);}
  function contrast(a,b){const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);}
  function updateColorSample(){const main=$('#mainColor')?.value,fg=$('#fgColor')?.value,bg=$('#bgColor')?.value;if(main)$('#mainHex').textContent=main.toUpperCase();if(fg&&bg){const sample=$('#colorSample');sample.style.color=fg;sample.style.background=bg;}}
})();
