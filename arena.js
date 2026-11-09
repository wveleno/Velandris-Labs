(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const menuToggle = $('#menuToggle');
  const nav = $('#nav');

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    });
    nav.addEventListener('click', (event) => {
      if (!event.target.closest('a')) return;
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Menüyü aç');
    });
  }

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  const reflexPad = $('#reflexPad');
  const reflexLabel = $('#reflexPadLabel');
  const reflexStatus = $('#reflexStatus');
  const reflexResult = $('#reflexResult');
  const reflexResultLabel = $('#reflexResultLabel');
  const reflexTime = $('#reflexTime');
  const reflexResultMessage = $('#reflexResultMessage');
  const reflexRetry = $('#reflexRetry');
  const reflex = { phase: 'idle', startedAt: 0, timeout: 0 };

  function finishReflex({ early = false, elapsed = null } = {}) {
    window.clearTimeout(reflex.timeout);
    reflex.phase = 'finished';
    reflexPad.hidden = true;
    reflexResult.hidden = false;
    reflexResult.classList.toggle('is-early', early);
    if (early) {
      reflexResultLabel.textContent = 'ERKEN TIKLAMA';
      reflexTime.textContent = 'Çok erken';
      reflexResultMessage.textContent = 'Ekran yeşile dönmeden tıkladın. Yeni deneme için yeniden dene.';
      reflexStatus.textContent = 'Erken tıklama. Denemeyi yeniden başlatmak için Yeniden dene düğmesine bas.';
      reflexRetry.focus();
      return;
    }
    reflexResultLabel.textContent = 'TEPKİ SÜREN';
    reflexTime.textContent = `${elapsed} ms`;
    reflexResultMessage.textContent = 'Tek deneme tamamlandı. İstersen yeniden deneyebilirsin.';
    reflexStatus.textContent = `Tepki süren ${elapsed} milisaniye.`;
    reflexRetry.focus();
  }

  function scheduleReflexSignal(delay = 1200 + Math.random() * 2600) {
    reflex.phase = 'waiting';
    reflexPad.dataset.state = 'waiting';
    reflexPad.disabled = false;
    reflexLabel.textContent = 'BEKLE…';
    reflexStatus.textContent = 'İşareti bekle. Ekran yeşile dönünce bir kez tıkla.';
    reflex.timeout = window.setTimeout(() => {
      if (reflex.phase !== 'waiting') return;
      reflex.phase = 'ready';
      reflex.startedAt = performance.now();
      reflexPad.dataset.state = 'ready';
      reflexLabel.textContent = 'ŞİMDİ!';
      reflexStatus.textContent = 'Şimdi tıkla.';
    }, delay);
  }

  function startReflex() {
    window.clearTimeout(reflex.timeout);
    reflex.phase = 'waiting';
    reflexPad.hidden = false;
    reflexPad.disabled = true;
    reflexResult.hidden = true;
    reflexResult.classList.remove('is-early');
    reflexPad.dataset.state = 'waiting';
    reflexLabel.textContent = 'HAZIRLANIYOR…';
    reflexStatus.textContent = 'Bekle. Ekran yeşile dönünce bir kez tıkla.';
    scheduleReflexSignal();
  }

  if (reflexPad) {
    reflexPad.addEventListener('click', () => {
      if (reflex.phase === 'idle') {
        startReflex();
        return;
      }
      if (reflex.phase === 'waiting') {
        finishReflex({ early: true });
        return;
      }
      if (reflex.phase !== 'ready') return;

      const elapsed = Math.round(performance.now() - reflex.startedAt);
      finishReflex({ elapsed });
    });
  }

  if (reflexRetry) {
    reflexRetry.addEventListener('click', startReflex);
  }
})();
