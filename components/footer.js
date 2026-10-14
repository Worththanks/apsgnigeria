/* APSG footer component loader: root-safe and single pass. */
(function () {
  'use strict';
  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  ready(() => {
    const mount = document.getElementById('footer');
    if (!mount || mount.dataset.loaded === 'true') return;
    fetch('/components/footer.html', { cache: 'no-cache' })
      .then(res => { if (!res.ok) throw new Error('Footer HTML not found'); return res.text(); })
      .then(html => { mount.innerHTML = html; mount.dataset.loaded = 'true'; })
      .catch(error => { console.error('[APSG Footer]', error); mount.innerHTML = '<!-- APSG footer failed to load. -->'; });
  });
})();
