(() => {
  const game = document.querySelector('[data-reflex-game]');
  if (!game) return;

  const pad = game.querySelector('#reflexPad');
  const padLabel = game.querySelector('#reflexPadLabel');
  const status = game.querySelector('#reflexStatus');
  const result = game.querySelector('#reflexResult');
  const resultLabel = game.querySelector('#reflexResultLabel');
  const resultTime = game.querySelector('#reflexTime');
  const resultMessage = game.querySelector('#reflexResultMessage');
  const retry = game.querySelector('#reflexRetry');
  if (!pad || !padLabel || !status || !result || !resultLabel || !resultTime || !resultMessage || !retry) return;

  let phase = 'idle';
  let signalTimer = 0;
  let signalAt = 0;

  function finish({ early = false, elapsed = 0 } = {}) {
    window.clearTimeout(signalTimer);
    phase = 'finished';
    pad.hidden = true;
    result.hidden = false;
    result.classList.toggle('is-early', early);

    if (early) {
      resultLabel.textContent = 'ERKEN TIKLAMA';
      resultTime.textContent = 'Çok erken';
      resultMessage.textContent = 'Ekran yeşile dönmeden tıkladın. Yeni deneme için tekrar dene.';
      status.textContent = 'Erken tıklama. Yeni deneme için Tekrar dene düğmesine bas.';
    } else {
      resultLabel.textContent = 'TEPKİ SÜREN';
      resultTime.textContent = `${elapsed} ms`;
      resultMessage.textContent = 'Tek deneme tamamlandı. İstersen tekrar deneyebilirsin.';
      status.textContent = `Tepki süren ${elapsed} milisaniye.`;
    }

    retry.focus();
  }

  function startReflex() {
    window.clearTimeout(signalTimer);
    phase = 'waiting';
    signalAt = 0;
    pad.hidden = false;
    pad.disabled = false;
    pad.dataset.state = 'waiting';
    padLabel.textContent = 'Bekle…';
    pad.setAttribute('aria-label', 'Yeşil sinyali bekle; erken tıklama testi bitirir');
    result.hidden = true;
    result.classList.remove('is-early');
    status.textContent = 'İşareti bekle. Ekran yeşile dönünce bir kez tıkla.';
    pad.focus();

    const delay = Math.round(1200 + Math.random() * 2600);
    signalTimer = window.setTimeout(() => {
      if (phase !== 'waiting') return;
      phase = 'ready';
      signalAt = performance.now();
      pad.dataset.state = 'ready';
      padLabel.textContent = 'Şimdi tıkla!';
      pad.setAttribute('aria-label', 'Yeşil sinyal geldi; şimdi bir kez tıkla');
      status.textContent = 'Şimdi tıkla.';
    }, delay);
  }

  pad.addEventListener('click', () => {
    if (phase === 'idle') {
      startReflex();
      return;
    }
    if (phase === 'waiting') {
      finish({ early: true });
      return;
    }
    if (phase === 'ready') {
      finish({ elapsed: Math.round(performance.now() - signalAt) });
    }
  });

  retry.addEventListener('click', startReflex);
})();
