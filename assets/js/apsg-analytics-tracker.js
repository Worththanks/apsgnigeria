/* APSG Premium Public Website Analytics Tracker
   Drop this after /assets/js/supabase-clients.js on public pages.
   Privacy: stores anonymous visitor/session IDs only; no names, phone numbers, emails or IP addresses. */
(function () {
  'use strict';

  const STORAGE_KEY = 'apsg_visitor_id';
  const SESSION_KEY = 'apsg_session_id';
  const PAGE_VIEW_KEY = 'apsg_last_page_view';
  const TRACK_TABLE = 'site_analytics_events';
  const SCROLL_MARKS = [25, 50, 75, 100];
  const sentScrollMarks = new Set();
  let clickTimer = null;

  function uuidFallback() {
    return 'apsg-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function randomId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    } catch (error) {}
    return uuidFallback();
  }

  function storageGetSet(storage, key) {
    try {
      let value = storage.getItem(key);
      if (!value) {
        value = randomId();
        storage.setItem(key, value);
      }
      return value;
    } catch (error) {
      return randomId();
    }
  }

  function getClient() {
    return window.supabaseClient || window.apsgSupabase || window.apsgSupabaseClient || window.APSG_SUPABASE || (window.APSG && window.APSG.supabase) || window.supabase || null;
  }

  async function waitForClient() {
    for (let i = 0; i < 25; i += 1) {
      const client = getClient();
      if (client && typeof client.from === 'function') return client;
      await new Promise(resolve => setTimeout(resolve, 120));
    }
    return null;
  }

  function getDeviceType() {
    const width = window.innerWidth || 0;
    const ua = navigator.userAgent || '';
    if (/Mobi|Android|iPhone|iPod/i.test(ua) || width < 640) return 'mobile';
    if (/iPad|Tablet/i.test(ua) || width < 1024) return 'tablet';
    return 'desktop';
  }

  function cleanPath() {
    return window.location.pathname || '/';
  }

  function cleanReferrer() {
    try {
      if (!document.referrer) return '';
      const url = new URL(document.referrer);
      return url.hostname === window.location.hostname ? 'internal' : safeText(url.hostname, 120);
    } catch (error) {
      return '';
    }
  }

  function safeText(value, maxLength) {
    return String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength || 80);
  }

  function pageSection(el) {
    const section = el && el.closest ? el.closest('section, header, footer, main, nav') : null;
    return safeText(section?.id || section?.getAttribute('aria-label') || section?.className || '', 80);
  }

  function targetTypeFromElement(el) {
    const href = el.getAttribute('href') || '';
    if (/^https?:\/\/wa\.me|whatsapp/i.test(href)) return 'whatsapp';
    if (/^tel:/i.test(href)) return 'phone';
    if (/^mailto:/i.test(href)) return 'email';
    if (/^https?:\/\//i.test(href)) return 'external_link';
    if (href) return 'internal_link';
    if (el.tagName === 'BUTTON') return 'button';
    return 'element';
  }

  function shouldTrackClick(el) {
    if (!el) return false;
    if (el.matches('[data-no-track], [data-no-track] *')) return false;
    if (el.matches('[data-track], [data-analytics], .cta, .btn, .button, button')) return true;
    const href = el.getAttribute('href') || '';
    return /^tel:|^mailto:|wa\.me|whatsapp|join|register|contact|donate|member|rsvp|volunteer/i.test(href);
  }

  function dedupePageView() {
    const key = `${cleanPath()}|${Math.floor(Date.now() / 30000)}`;
    try {
      if (sessionStorage.getItem(PAGE_VIEW_KEY) === key) return false;
      sessionStorage.setItem(PAGE_VIEW_KEY, key);
    } catch (error) {}
    return true;
  }

  async function track(eventName, metadata) {
    try {
      const client = await waitForClient();
      if (!client || typeof client.from !== 'function') return;
      const row = {
        event_name: safeText(eventName, 50),
        page_path: safeText(cleanPath(), 180),
        page_title: safeText(document.title, 120),
        visitor_id: storageGetSet(window.localStorage, STORAGE_KEY),
        session_id: storageGetSet(window.sessionStorage, SESSION_KEY),
        referrer: cleanReferrer(),
        device_type: getDeviceType(),
        browser_language: safeText(navigator.language, 24),
        screen_size: `${(window.screen && window.screen.width) || 0}x${(window.screen && window.screen.height) || 0}`,
        metadata: metadata || {}
      };
      await client.from(TRACK_TABLE).insert(row);
    } catch (error) {
      // Silent by design. Analytics must never break the public website.
    }
  }

  function bindClicks() {
    document.addEventListener('click', function (event) {
      const el = event.target.closest('a, button, [data-track], [data-analytics]');
      if (!shouldTrackClick(el)) return;
      window.clearTimeout(clickTimer);
      clickTimer = window.setTimeout(() => {
        track('cta_click', {
          label: safeText(el.getAttribute('data-track') || el.getAttribute('data-analytics') || el.getAttribute('aria-label') || el.textContent, 100),
          target_type: targetTypeFromElement(el),
          href: safeText(el.getAttribute('href') || '', 180),
          page_section: pageSection(el)
        });
      }, 0);
    }, true);
  }

  function bindForms() {
    document.addEventListener('submit', function (event) {
      const form = event.target;
      if (!form || form.matches('[data-no-track]')) return;
      track('form_submit', {
        label: safeText(form.getAttribute('aria-label') || form.id || form.className || 'Form submit', 100),
        page_section: pageSection(form)
      });
    }, true);
  }

  function bindScrollDepth() {
    let ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        const doc = document.documentElement;
        const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
        const percent = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
        SCROLL_MARKS.forEach(mark => {
          if (percent >= mark && !sentScrollMarks.has(mark)) {
            sentScrollMarks.add(mark);
            track('scroll_depth', { depth: mark });
          }
        });
      });
    }, { passive: true });
  }

  function bindVisibility() {
    const startedAt = Date.now();
    let sent = false;
    function sendTiming() {
      if (sent) return;
      sent = true;
      track('page_engagement', { seconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)) });
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') sendTiming();
    });
    window.addEventListener('pagehide', sendTiming);
  }

  function start() {
    if (dedupePageView()) track('page_view', { path: cleanPath() });
    bindClicks();
    bindForms();
    bindScrollDepth();
    bindVisibility();
  }

  window.APSGAnalytics = { track };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
