/* APSG premium navbar loader: one fetch, one event-binding path, root-safe. */
(function () {
  'use strict';
  const COMPONENT_PATH = '/components/navbar.html';
  let bound = false;

  function ready(fn) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  function normalize(path) { return (path || '/').replace(/\/index\.html$/i, '/').replace(/\/$/, '') || '/'; }

  function setActive(root) {
    const current = normalize(location.pathname);
    root.querySelectorAll('[data-nav-link], .apsg-sidebar-body a, .apsg-desktop-menu a').forEach(link => {
      try {
        const target = normalize(new URL(link.getAttribute('href'), location.origin).pathname);
        const active = target === current || (current.endsWith('/state-details.html') && target.endsWith('/state.html')) || (current.startsWith('/pages/') && target !== '/' && current === target);
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
      } catch (_) {}
    });
  }

  function trapFocus(sidebar, event) {
    if (!document.body.classList.contains('apsg-menu-open') || event.key !== 'Tab') return;
    const focusables = Array.from(sidebar.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function initialise(root) {
    if (bound) return;
    bound = true;
    const navbar = root.querySelector('.apsg-floating-navbar') || document.querySelector('.apsg-floating-navbar');
    const toggle = root.querySelector('.apsg-mobile-toggle') || document.querySelector('.apsg-mobile-toggle');
    const sidebar = root.querySelector('#apsgMobileSidebar') || document.getElementById('apsgMobileSidebar');
    const overlay = root.querySelector('.apsg-mobile-overlay') || document.querySelector('.apsg-mobile-overlay');

    function closeMenu() {
      document.body.classList.remove('apsg-menu-open');
      toggle?.setAttribute('aria-expanded', 'false');
      sidebar?.setAttribute('aria-hidden', 'true');
      root.querySelectorAll('.apsg-mobile-group.open').forEach(group => group.classList.remove('open'));
    }
    function openMenu() {
      document.body.classList.add('apsg-menu-open');
      toggle?.setAttribute('aria-expanded', 'true');
      sidebar?.setAttribute('aria-hidden', 'false');
      setTimeout(() => sidebar?.querySelector('a,button')?.focus(), 30);
    }

    setActive(root);
    toggle?.addEventListener('click', () => document.body.classList.contains('apsg-menu-open') ? closeMenu() : openMenu());
    overlay?.addEventListener('click', closeMenu);
    root.querySelectorAll('[data-apsg-close]').forEach(btn => btn.addEventListener('click', closeMenu));
    root.querySelectorAll('.apsg-mobile-submenu-toggle').forEach(btn => btn.addEventListener('click', () => btn.closest('.apsg-mobile-group')?.classList.toggle('open')));
    root.querySelectorAll('.apsg-mobile-sidebar a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu();
      if (sidebar) trapFocus(sidebar, event);
    });
    const syncScroll = () => navbar?.classList.toggle('is-scrolled', scrollY > 24);
    syncScroll();
    addEventListener('scroll', syncScroll, { passive: true });
    window.APSG_CLOSE_NAVBAR = closeMenu;
  }

  ready(() => {
    const mount = document.getElementById('navbar');
    if (!mount) { initialise(document); return; }
    if (mount.querySelector('.apsg-floating-navbar')) { initialise(mount); return; }
    fetch(COMPONENT_PATH, { cache: 'no-cache' })
      .then(res => { if (!res.ok) throw new Error(`Navbar component not found: ${COMPONENT_PATH}`); return res.text(); })
      .then(html => { mount.innerHTML = html; initialise(mount); })
      .catch(error => { console.error('[APSG Navbar]', error); mount.innerHTML = '<!-- APSG navbar failed to load. -->'; });
  });
})();
