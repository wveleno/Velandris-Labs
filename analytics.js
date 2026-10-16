// Only aggregate counters are stored; no cookies, identifiers, input or IP addresses.
window.recordMetric = (metric, dimension) => {
  if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
  fetch('/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metric, dimension }), keepalive: true }).catch(() => {});
};
window.recordMetric('view', matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop');
