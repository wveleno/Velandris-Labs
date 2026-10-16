const $ = s => document.querySelector(s);
const number = value => new Intl.NumberFormat('tr-TR').format(value);
const labels = { json: ['{ }', 'JSON Biçimlendirici'], base64: ['⇄', 'Base64 Dönüştürücü'], qr: ['▦', 'QR Kod Oluşturucu'], text: ['T', 'Metin Araçları'] };
let snapshot = null;
function render(data) {
  const rows = data.rows;
  const total = (metric, dimension) => rows.filter(r => r.metric === metric && (!dimension || r.dimension === dimension)).reduce((n, r) => n + Number(r.total), 0);
  const views = total('view'), opens = total('tool');
  $('#views').textContent = number(views);
  $('#opens').textContent = number(opens);
  $('#mobile').textContent = views ? number(Math.round(total('view', 'mobile') / views * 100)) + '%' : '—';
  const dates = Array.from({ length: data.days }, (_, i) => {
    const date = new Date(data.updatedAt); date.setUTCDate(date.getUTCDate() - data.days + i + 1);
    const day = date.toISOString().slice(0, 10);
    return { day, value: rows.filter(r => r.metric === 'view' && r.day === day).reduce((n, r) => n + Number(r.total), 0) };
  });
  const max = Math.max(...dates.map(d => d.value), 1);
  $('#chart').replaceChildren();
  if (views) dates.forEach(({ day, value }) => {
    const bar = document.createElement('div'); bar.className = 'bar'; bar.tabIndex = 0;
    bar.title = `${day}: ${number(value)} görüntüleme`; bar.setAttribute('aria-label', bar.title);
    const fill = document.createElement('span'); fill.style.height = `${value / max * 100}%`; bar.append(fill); $('#chart').append(bar);
  });
  else { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Bu dönemde henüz görüntüleme yok. Ana sayfa ziyaret edildikçe grafik burada oluşur.'; $('#chart').append(empty); }
  const formatDate = day => new Date(day + 'T00:00:00Z').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  $('#range').textContent = `${formatDate(dates[0].day)} — ${formatDate(dates.at(-1).day)}`;
  $('#tools').replaceChildren();
  Object.entries(labels).sort((a, b) => total('tool', b[0]) - total('tool', a[0])).forEach(([id, [icon, label]]) => {
    const row = document.createElement('div'); row.className = 'tool-row';
    const symbol = document.createElement('span'); symbol.className = 'tool-icon'; symbol.textContent = icon;
    const name = document.createElement('span'); name.textContent = label;
    const value = document.createElement('b'); value.textContent = number(total('tool', id)); row.append(symbol, name, value); $('#tools').append(row);
  });
  $('#devices').replaceChildren();
  for (const [id, label] of [['desktop', 'Geniş ekran'], ['mobile', 'Mobil ekran']]) {
    const value = total('view', id), percent = views ? Math.round(value / views * 100) : 0;
    const row = document.createElement('div'); row.className = 'device';
    const name = document.createElement('span'); name.textContent = label;
    const count = document.createElement('span'); count.textContent = `${number(value)} / %${percent}`; row.append(name, count);
    const track = document.createElement('div'); track.className = 'track'; const fill = document.createElement('div'); fill.style.width = `${percent}%`; track.append(fill); $('#devices').append(row, track);
  }
  $('#updated').textContent = 'Son güncelleme: ' + new Date(data.updatedAt).toLocaleTimeString('tr-TR');
  $('#status').textContent = views || opens ? 'Seçili dönemin gerçek ölçümleri gösteriliyor.' : 'Henüz veri yok. Ölçümler yayına alındıktan sonra birikmeye başlar.';
}
async function load() {
  $('#refresh').disabled = true; $('#period').disabled = true; $('#export').disabled = true;
  $('#status').classList.remove('error'); $('#status').textContent = 'İstatistikler yükleniyor…';
  document.querySelector('main').setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/metrics?days=' + $('#period').value, { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const data = await response.json(); render(data); snapshot = data; $('#export').disabled = false;
  } catch {
    $('#status').classList.add('error'); $('#status').textContent = 'İstatistikler alınamadı. Yenile düğmesiyle tekrar deneyin.';
    if (snapshot) $('#status').textContent += ' Önceki başarılı sonuçlar ekranda tutuluyor.';
  } finally { $('#refresh').disabled = false; $('#period').disabled = false; document.querySelector('main').removeAttribute('aria-busy'); }
}
$('#period').addEventListener('change', load); $('#refresh').addEventListener('click', load);
$('#export').addEventListener('click', () => {
  if (!snapshot) return;
  const csv = '\uFEFF' + ['Tarih (UTC),Ölçüm,Boyut,Toplam', ...snapshot.rows.slice().sort((a,b) => a.day.localeCompare(b.day)).map(r => [r.day,r.metric,r.dimension,r.total].join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `velandris-${snapshot.days}-gun.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
load();
