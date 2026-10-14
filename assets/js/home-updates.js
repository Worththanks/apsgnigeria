/* APSG premium homepage classified update renderer */
(function () {
  'use strict';

  const CONFIG = {
    blog: { icon: 'bi-newspaper', label: 'News', page: '/pages/blog.html', container: 'homeBlogUpdates', count: 'homeBlogCount', empty: 'No published news update yet.' },
    meeting: { icon: 'bi-people-fill', label: 'Meeting', page: '/pages/meetings.html', detail: '/pages/meeting-details.html', container: 'homeMeetingUpdates', count: 'homeMeetingCount', empty: 'No published meeting notification yet.' },
    event: { icon: 'bi-calendar-event-fill', label: 'Event', page: '/pages/events.html', detail: '/pages/event-details.html', container: 'homeEventUpdates', count: 'homeEventCount', empty: 'No published event yet.' }
  };
  const TYPES = Object.keys(CONFIG);
  const SCHEDULE_ORDER = ['live', 'upcoming', 'recent', 'past'];
  const NEWS_ORDER = ['today', 'this_week', 'last_week', 'last_month'];

  function getClient() { return window.supabaseClient || window.apsgSupabaseClient || window.APSG_SUPABASE_CLIENT || null; }
  function esc(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
  function attr(value) { return esc(value).replace(/`/g, '&#96;'); }

  function normalizeUrl(url) {
    if (!url) return '';
    let value = String(url).trim().replace(/^\/pages\//i, '/pages/');
    const map = {
      '/pages/blog.html': '/pages/blog.html',
      '/pages/meetings.html': '/pages/meetings.html',
      '/meetings.html': '/pages/meetings.html',
      '/pages/events.html': '/pages/events.html',
      '/events.html': '/pages/events.html',
      '/meeting-details.html': '/pages/meeting-details.html',
      '/event-details.html': '/pages/event-details.html'
    };
    for (const [from, to] of Object.entries(map)) {
      if (value === from || value.startsWith(from + '?') || value.startsWith(from + '#')) return to + value.slice(from.length);
    }
    return value;
  }

  function normalizeTime(value) { const m = String(value || '').match(/^(\d{1,2}):(\d{2})/); return m ? `${String(m[1]).padStart(2, '0')}:${m[2]}` : ''; }
  function scheduleRange(item) {
    if (!item.event_date) return { start: null, end: null };
    const date = String(item.event_date).slice(0, 10);
    const startTime = normalizeTime(item.start_time) || '00:00';
    const endTime = normalizeTime(item.end_time);
    const start = new Date(`${date}T${startTime}:00`);
    let end = endTime ? new Date(`${date}T${endTime}:00`) : null;
    if (!end || Number.isNaN(end.getTime()) || end <= start) end = new Date(start.getTime() + (item.start_time ? 6 : 24) * 60 * 60 * 1000);
    if (Number.isNaN(start.getTime())) return { start: null, end: null };
    return { start, end };
  }

  function scheduleKey(item) {
    const r = scheduleRange(item), now = new Date(), recent = 1000 * 60 * 60 * 24 * 30;
    if (!r.start) return (now - new Date(item.created_at || Date.now()) <= recent) ? 'recent' : 'past';
    if (now >= r.start && now <= r.end) return 'live';
    if (r.start > now) return 'upcoming';
    return (now - r.end <= recent) ? 'recent' : 'past';
  }

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function startOfWeek(d) { const x = startOfDay(d); const day = x.getDay(); const diff = (day === 0 ? -6 : 1) - day; x.setDate(x.getDate() + diff); return x; }
  function monthYear(d) { return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); }
  function isoMonth(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
  function newsGroup(item) {
    const d = new Date(item.created_at || item.updated_at || Date.now()), now = new Date();
    const today = startOfDay(now), week = startOfWeek(now), lastWeek = new Date(week); lastWeek.setDate(week.getDate() - 7);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1), thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (d >= today) return { key: 'today', label: 'Today', sort: isoMonth(d) };
    if (d >= week) return { key: 'this_week', label: 'This Week', sort: isoMonth(d) };
    if (d >= lastWeek && d < week) return { key: 'last_week', label: 'Last Week', sort: isoMonth(d) };
    if (d >= lastMonthStart && d < thisMonthStart) return { key: 'last_month', label: `Last Month · ${monthYear(d)}`, sort: isoMonth(d) };
    return { key: `archive_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`, label: monthYear(d), sort: isoMonth(d) };
  }

  function formatDate(v) { const d = new Date(v); return Number.isNaN(d.getTime()) ? 'Date TBA' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
  function formatTime(start, end) { const s = normalizeTime(start), e = normalizeTime(end); return e ? `${s || '00:00'} - ${e}` : s; }
  function eventLabel(item) { const time = formatTime(item.start_time, item.end_time); return time ? `${formatDate(item.event_date || item.created_at)} • ${time}` : formatDate(item.event_date || item.created_at); }
  function stripTags(v) { const d = document.createElement('div'); d.innerHTML = v || ''; return d.textContent || d.innerText || ''; }
  function truncate(t, n) { t = t || ''; return t.length > n ? t.slice(0, n).trim() + '...' : t; }

  function statusLabel(type, key) {
    if (type === 'blog') return ({ today:'Today', this_week:'This Week', last_week:'Last Week', last_month:'Last Month' }[key] || 'Archive');
    return ({ live:'Live Now', upcoming:'Upcoming', recent:'Recent', past:'Past' }[key] || 'Update');
  }

  function hrefFor(item, type) {
    if (item.cta_url) return normalizeUrl(item.cta_url);
    if (type === 'event') return normalizeUrl(`${CONFIG.event.detail}?slug=${encodeURIComponent(item.slug || item.id)}`);
    if (type === 'meeting') return normalizeUrl(`${CONFIG.meeting.detail}?slug=${encodeURIComponent(item.slug || item.id)}`);
    return normalizeUrl(`${CONFIG.blog.page}#${encodeURIComponent(item.slug || item.id)}`);
  }

  function groupItems(type, items) {
    const map = {};
    items.forEach(item => {
      const g = type === 'blog' ? newsGroup(item) : { key: scheduleKey(item), label: statusLabel(type, scheduleKey(item)), sort: '' };
      if (!map[g.key]) map[g.key] = { ...g, items: [] };
      map[g.key].items.push(item);
    });
    if (type === 'blog') {
      NEWS_ORDER.forEach(key => { if (!map[key]) map[key] = { key, label: statusLabel(type, key), sort: '', items: [] }; });
      return Object.values(map).sort((a,b) => {
        const ai = NEWS_ORDER.indexOf(a.key), bi = NEWS_ORDER.indexOf(b.key);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return String(b.sort).localeCompare(String(a.sort));
      });
    }
    SCHEDULE_ORDER.forEach(key => { if (!map[key]) map[key] = { key, label: statusLabel(type, key), items: [] }; });
    return SCHEDULE_ORDER.map(key => map[key]);
  }

  function sortGroup(type, key, items) {
    return [...items].sort((a,b) => {
      if (Boolean(a.is_featured) !== Boolean(b.is_featured)) return a.is_featured ? -1 : 1;
      if (type === 'blog') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      const at = scheduleRange(a).start?.getTime() || new Date(a.created_at || 0).getTime();
      const bt = scheduleRange(b).start?.getTime() || new Date(b.created_at || 0).getTime();
      return key === 'upcoming' || key === 'live' ? at - bt : bt - at;
    });
  }

  function buildCard(type, item, key) {
    const cfg = CONFIG[type];
    const title = esc(item.title || 'Untitled update');
    const excerpt = esc(item.excerpt || truncate(stripTags(item.body), 115) || 'Read the latest APSG update.');
    const category = esc(item.category || cfg.label);
    const date = type === 'blog' ? formatDate(item.created_at || item.updated_at) : eventLabel(item);
    const image = item.image_url ? `<img src="${attr(item.image_url)}" alt="${attr(title)}" loading="lazy" onerror="this.remove();">` : `<i class="bi ${cfg.icon} text-2xl"></i>`;
    const venue = item.venue && type !== 'blog' ? `<em><i class="bi bi-geo-alt-fill"></i>${esc(item.venue)}</em>` : '';
    return `<a href="${attr(hrefFor(item, type))}" class="home-update-card classified ${attr(key)}" aria-label="Open ${attr(title)}">
      <span class="home-update-thumb">${image}</span>
      <span class="min-w-0 home-update-card-body">
        <span class="home-update-status ${attr(key)}">${esc(statusLabel(type, key))}</span>
        <span class="home-update-meta"><span class="home-update-badge"><i class="bi ${cfg.icon}"></i>${category}</span>${item.is_featured ? '<span class="home-update-badge"><i class="bi bi-star-fill"></i>Featured</span>' : ''}</span>
        <span class="block home-update-title">${title}</span>
        <span class="block home-update-excerpt">${excerpt}</span>
        <small>${esc(date)}</small>${venue}
      </span>
    </a>`;
  }

  function renderPanel(type, items) {
    const cfg = CONFIG[type];
    const el = document.getElementById(cfg.container);
    const countEl = document.getElementById(cfg.count);
    const panel = el ? el.closest('.home-update-panel') : null;
    const topLink = countEl ? countEl.closest('a') : null;

    if (countEl) countEl.textContent = String(items.length);
    if (topLink) topLink.hidden = items.length === 0;
    if (!el) return;

    if (!items.length) {
      el.innerHTML = '';
      if (panel) panel.hidden = true;
      return;
    }

    if (panel) panel.hidden = false;

    const groups = groupItems(type, items).filter(group => group.items && group.items.length);
    el.innerHTML = groups.map(group => {
      const list = sortGroup(type, group.key, group.items).slice(0, 1);
      return `<section class="home-update-group ${attr(group.key)}"><div class="home-update-group-head"><span>${esc(group.label)}</span><strong>${group.items.length}</strong></div>${list.map(item => buildCard(type, item, group.key)).join('')}</section>`;
    }).join('');
  }

  function pickFeatured(rows) {
    const order = { live:0, upcoming:1, today:2, this_week:3, recent:4, last_week:5, last_month:6, past:7 };
    return [...rows].sort((a,b) => {
      if (Boolean(a.is_featured) !== Boolean(b.is_featured)) return a.is_featured ? -1 : 1;
      const ak = a.content_type === 'blog' ? newsGroup(a).key : scheduleKey(a);
      const bk = b.content_type === 'blog' ? newsGroup(b).key : scheduleKey(b);
      if ((order[ak] ?? 99) !== (order[bk] ?? 99)) return (order[ak] ?? 99) - (order[bk] ?? 99);
      return new Date(b.event_date || b.created_at || 0) - new Date(a.event_date || a.created_at || 0);
    })[0];
  }

  function renderFeatured(rows) {
    const featured = document.getElementById('homeUpdatesFeatured');
    if (!featured) return;
    const item = pickFeatured(rows);
    if (!item) { featured.hidden = true; return; }
    featured.hidden = false;
    const cfg = CONFIG[item.content_type] || CONFIG.blog;
    const key = item.content_type === 'blog' ? newsGroup(item).key : scheduleKey(item);
    if (item.image_url) featured.style.background = `linear-gradient(135deg, rgba(5,53,31,0.94), rgba(15,138,75,0.82)), url('${attr(item.image_url)}') center/cover no-repeat`;
    featured.innerHTML = `<span class="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] font-black text-apsg-gold backdrop-blur"><i class="bi ${cfg.icon}"></i>${esc(statusLabel(item.content_type, key))} ${esc(cfg.label)}</span><h3 class="mt-4 font-display text-2xl md:text-3xl font-black leading-tight">${esc(item.title || 'APSG update')}</h3><p class="mt-3 text-sm text-white/78 leading-relaxed">${esc(item.excerpt || truncate(stripTags(item.body), 180) || 'Read the latest APSG update.')}</p><p class="mt-3 text-xs font-black uppercase tracking-[0.16em] text-white/62">${esc(item.content_type === 'blog' ? formatDate(item.created_at || item.updated_at) : eventLabel(item))}</p><a href="${attr(hrefFor(item, item.content_type))}" class="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-apsg-gold px-5 py-3 text-sm font-black text-apsg-deep shadow-gold transition hover:-translate-y-0.5 hover:bg-[#e4b83e]">${esc(item.cta_label || 'Open Update')}<i class="bi bi-arrow-right-circle-fill"></i></a>`;
  }


  function renderEventHighlights(eventRows) {
    const section = document.getElementById('event-highlights');
    if (!section) return;
    if (!eventRows.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    const groups = {
      live: sortGroup('event', 'live', eventRows.filter(item => scheduleKey(item) === 'live')).slice(0, 1),
      upcoming: sortGroup('event', 'upcoming', eventRows.filter(item => scheduleKey(item) === 'upcoming')).slice(0, 1),
      recent: sortGroup('event', 'recent', eventRows.filter(item => scheduleKey(item) === 'recent')).slice(0, 1),
      past: sortGroup('event', 'past', eventRows.filter(item => scheduleKey(item) === 'past')).slice(0, 1)
    };

    const totals = {
      live: eventRows.filter(item => scheduleKey(item) === 'live').length,
      upcoming: eventRows.filter(item => scheduleKey(item) === 'upcoming').length,
      recent: eventRows.filter(item => scheduleKey(item) === 'recent').length,
      past: eventRows.filter(item => scheduleKey(item) === 'past').length
    };

    Object.entries(groups).forEach(([key, list]) => {
      const cap = key.charAt(0).toUpperCase() + key.slice(1);
      const listEl = document.getElementById(`homeEvent${cap}List`);
      const countEl = document.getElementById(`homeEvent${cap}Count`);
      const column = listEl ? listEl.closest('.home-event-column') : null;
      if (countEl) countEl.textContent = String(totals[key] || 0);
      if (!listEl) return;
      if (!list.length) {
        listEl.innerHTML = '';
        if (column) column.hidden = true;
        return;
      }
      if (column) column.hidden = false;
      listEl.innerHTML = list.map(item => buildEventHighlightCard(item, key)).join('');
    });

    renderEventSpotlight(eventRows);
  }

  function buildEventHighlightCard(item, key) {
    const title = esc(item.title || 'Untitled event');
    const excerpt = esc(item.excerpt || truncate(stripTags(item.body), 80) || 'Open this APSG event update.');
    const image = item.image_url ? `<img src="${attr(item.image_url)}" alt="${attr(title)}" loading="lazy" onerror="this.remove();">` : '<i class="bi bi-calendar-event-fill text-2xl"></i>';
    const venue = item.venue ? `<em><i class="bi bi-geo-alt-fill"></i>${esc(item.venue)}</em>` : '';
    return `<a href="${attr(hrefFor(item, 'event'))}" class="home-event-card ${attr(key)}">
      <span class="home-event-card-image">${image}</span>
      <span class="home-event-card-body">
        <span class="home-event-status ${attr(key)}">${esc(statusLabel('event', key))}</span>
        <strong>${title}</strong>
        <small>${esc(eventLabel(item))}</small>
        <span>${excerpt}</span>
        ${venue}
      </span>
    </a>`;
  }

  function renderEventSpotlight(eventRows) {
    const spotlight = document.getElementById('homeEventSpotlight');
    if (!spotlight) return;
    const item = pickFeatured(eventRows);
    if (!item) {
      spotlight.hidden = true;
      return;
    }
    spotlight.hidden = false;
    const key = scheduleKey(item);
    if (item.image_url) spotlight.style.background = `linear-gradient(135deg, rgba(5,53,31,0.94), rgba(15,118,110,0.82)), url('${attr(item.image_url)}') center/cover no-repeat`;
    spotlight.innerHTML = `<span class="home-event-status ${attr(key)}">${esc(statusLabel('event', key))}</span>
      <h3>${esc(item.title || 'APSG Event')}</h3>
      <p>${esc(item.excerpt || truncate(stripTags(item.body), 170) || 'Open this APSG event update.')}</p>
      <div class="home-event-spot-meta"><span><i class="bi bi-calendar-event-fill"></i>${esc(eventLabel(item))}</span>${item.venue ? `<span><i class="bi bi-geo-alt-fill"></i>${esc(item.venue)}</span>` : ''}</div>
      <a href="${attr(hrefFor(item, 'event'))}" class="home-event-action">${esc(item.cta_label || 'View Event Details')} <i class="bi bi-arrow-right-circle-fill"></i></a>`;
  }


  function renderError(message) {
    const hub = document.getElementById('latest-updates');
    if (hub) hub.hidden = true;
    TYPES.forEach(type => {
      const el = document.getElementById(CONFIG[type].container);
      const panel = el ? el.closest('.home-update-panel') : null;
      const countEl = document.getElementById(CONFIG[type].count);
      const topLink = countEl ? countEl.closest('a') : null;
      if (topLink) topLink.hidden = true;
      if (panel) panel.hidden = true;
      if (el) el.innerHTML = `<div class="home-update-empty"><p class="font-black text-apsg-deep">${esc(message)}</p></div>`;
    });
  }


  function injectStyles() {
    if (document.getElementById('apsg-home-classified-styles')) return;
    const style = document.createElement('style');
    style.id = 'apsg-home-classified-styles';
    style.textContent = `
      .home-update-group{display:grid;gap:.72rem;margin-bottom:1rem}.home-update-group:last-child{margin-bottom:0}.home-update-group-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;border-radius:999px;padding:.48rem .68rem;background:rgba(255,250,240,.72);border:1px solid rgba(214,169,43,.24);color:#05351f}.home-update-group-head span{font-size:.72rem;font-weight:950;text-transform:uppercase;letter-spacing:.12em}.home-update-group-head strong{display:grid;place-items:center;min-width:1.7rem;height:1.7rem;border-radius:999px;background:rgba(214,169,43,.22);font-size:.74rem}.home-update-status{display:inline-flex;width:fit-content;align-items:center;gap:.35rem;border-radius:999px;padding:.25rem .52rem;font-size:.62rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase;background:#fff7d6;color:#8a6616;margin-bottom:.34rem}.home-update-status:before{content:'';width:.4rem;height:.4rem;border-radius:999px;background:currentColor}.home-update-status.live{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff}.home-update-status.upcoming,.home-update-status.today{background:linear-gradient(135deg,#f7d66b,#d6a92b);color:#05351f}.home-update-status.recent,.home-update-status.this_week{background:linear-gradient(135deg,#bbf7d0,#22c55e);color:#05351f}.home-update-status.past,.home-update-status.last_week,.home-update-status.last_month,.home-update-status[class*='archive']{background:linear-gradient(135deg,#e2e8f0,#94a3b8);color:#102018}.home-update-card.classified small{display:block;margin-top:.35rem;color:#0f8a4b;font-size:.72rem;font-weight:900}.home-update-card.classified em{display:flex;align-items:center;gap:.35rem;margin-top:.35rem;color:#315041;font-size:.72rem;font-style:normal;font-weight:850}.home-update-mini-empty{border:1px dashed rgba(5,53,31,.16);background:#f8fbf7;border-radius:1rem;padding:.85rem;text-align:center;color:#66756c;font-size:.78rem;font-weight:800}`;
    document.head.appendChild(style);
  }

  async function loadHomeUpdates() {
    injectStyles();
    const client = getClient();
    if (!client) return renderError('Supabase client is not ready.');
    try {
      const { data, error } = await client.from('site_content').select('id,content_type,title,slug,excerpt,body,category,image_url,venue,event_date,start_time,end_time,cta_label,cta_url,is_featured,status,created_at,updated_at').eq('status', 'published').in('content_type', TYPES).order('created_at', { ascending: false }).limit(72);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      const hub = document.getElementById('latest-updates');
      if (hub) hub.hidden = rows.length === 0;
      if (!rows.length) {
        TYPES.forEach(type => renderPanel(type, []));
        renderEventHighlights([]);
        renderFeatured([]);
        return;
      }
      TYPES.forEach(type => renderPanel(type, rows.filter(item => item.content_type === type)));
      renderEventHighlights(rows.filter(item => item.content_type === 'event'));
      renderFeatured(rows);
    } catch (error) { console.error('APSG homepage updates failed:', error); renderError('Unable to load updates right now.'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadHomeUpdates); else loadHomeUpdates();
})();
