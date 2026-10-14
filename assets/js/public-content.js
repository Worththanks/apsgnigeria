(function () {
  'use strict';

  const CONTENT_TABLE = 'site_content';
  const FALLBACK_IMAGE = '/assets/images/logo/apsg1.png';
  const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;

  const TYPE_META = {
    blog: {
      title: 'News & Updates',
      singular: 'News Update',
      icon: 'fa-newspaper',
      empty: 'No published news or updates yet.',
      listPage: '/pages/blog.html',
      detailPage: '/pages/blog-detail.html',
      groupMode: 'news',
      deskLabel: 'News Desk'
    },
    meeting: {
      title: 'Meeting Notifications',
      singular: 'Meeting Notice',
      icon: 'fa-users-line',
      empty: 'No published meeting notifications yet.',
      listPage: '/pages/meetings.html',
      detailPage: '/pages/meeting-details.html',
      groupMode: 'schedule',
      deskLabel: 'Meeting Desk'
    },
    event: {
      title: 'Events',
      singular: 'Event',
      icon: 'fa-calendar-check',
      empty: 'No published events yet.',
      listPage: '/pages/events.html',
      detailPage: '/pages/event-details.html',
      groupMode: 'schedule',
      deskLabel: 'Event Desk'
    }
  };

  const SCHEDULE_GROUPS = [
    { key: 'live', label: 'Currently Live', icon: 'fa-signal', description: 'Happening now or active today.' },
    { key: 'upcoming', label: 'Upcoming', icon: 'fa-calendar-plus', description: 'Confirmed and scheduled for a future date.' },
    { key: 'recent', label: 'Recent', icon: 'fa-clock-rotate-left', description: 'Recently concluded APSG activities.' },
    { key: 'past', label: 'Past', icon: 'fa-box-archive', description: 'Archived public records and earlier activities.' }
  ];

  const NEWS_GROUP_ORDER = ['today', 'this_week', 'last_week', 'last_month'];
  const SAFE_DETAIL_COLUMNS = [
    'id', 'content_type', 'title', 'slug', 'excerpt', 'body', 'category',
    'image_url', 'venue', 'event_date', 'start_time', 'end_time', 'cta_label',
    'cta_url', 'is_featured', 'status', 'created_at', 'updated_at'
  ].join(', ');

  document.addEventListener('DOMContentLoaded', initPublicContent);

  async function initPublicContent() {
    injectStyles();
    await initListPage();
    await initDetailPage();
    bindGlobalCopyHandler();
  }

  async function initListPage() {
    const mount = document.querySelector('[data-public-content], [data-apsg-content]');
    if (!mount) return;

    const type = normalizeType(mount.dataset.publicContent || mount.dataset.apsgContent || document.body.dataset.contentType || 'blog');
    const meta = TYPE_META[type] || TYPE_META.blog;
    mount.dataset.publicContentResolved = type;
    renderLoading(mount, meta);

    const client = getClient();
    if (!client) return renderError(mount, 'Supabase client is not available. Please check /assets/js/supabase-clients.js.');

    try {
      const rows = await fetchPublishedRows(client, type);
      const normalizedRows = rows.map(normalizeRow).filter((item) => item.title);
      renderList(mount, normalizedRows, type, meta);
      updateStats(normalizedRows, type, meta);
      dispatchContentReady(mount, normalizedRows, type);
    } catch (error) {
      console.error('APSG public content error:', error);
      renderError(mount, 'Unable to load content right now. Please refresh the page or try again later.');
    }
  }

  async function initDetailPage() {
    const mount = document.querySelector('[data-public-content-detail]');
    if (!mount) return;

    const type = normalizeType(mount.dataset.publicContentDetail || document.body.dataset.contentType || 'event');
    const meta = TYPE_META[type] || TYPE_META.event;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    const id = params.get('id');
    const backUrl = normalizeUrl(mount.dataset.backUrl || meta.listPage || `/pages/${type}s.html`);

    mount.dataset.publicContentDetailResolved = type;
    renderLoading(mount, meta);

    const client = getClient();
    if (!client) return renderError(mount, 'Supabase client is not available. Please check /assets/js/supabase-clients.js.');
    if (!slug && !id) return renderError(mount, `No ${meta.singular.toLowerCase()} reference was supplied.`);

    try {
      const item = await fetchPublishedDetail(client, type, { id, slug });
      if (!item) return renderError(mount, `${meta.singular} not found or not published yet.`);
      const normalized = normalizeRow(item);
      renderDetail(mount, normalized, meta, backUrl);
      updateDetailMeta(normalized, meta, type);
      dispatchContentReady(mount, [normalized], type);
    } catch (error) {
      console.error('APSG detail content error:', error);
      renderError(mount, 'Unable to load details right now. Please refresh the page or try again later.');
    }
  }

  async function fetchPublishedRows(client, type) {
    const base = () => client.from(CONTENT_TABLE).select(SAFE_DETAIL_COLUMNS).eq('content_type', type).eq('status', 'published');
    let response = await base();
    if (response.error && String(response.error.code || '').toUpperCase() === '42703') {
      response = await client.from(CONTENT_TABLE).select('*').eq('content_type', type).eq('status', 'published');
    }
    if (response.error) throw response.error;
    return sortRows(Array.isArray(response.data) ? response.data : [], type);
  }

  async function fetchPublishedDetail(client, type, { id, slug }) {
    function makeQuery(selectCols) {
      let query = client
        .from(CONTENT_TABLE)
        .select(selectCols)
        .eq('content_type', type)
        .eq('status', 'published')
        .limit(1);
      return id ? query.eq('id', id) : query.eq('slug', slug);
    }

    let response = await makeQuery(SAFE_DETAIL_COLUMNS);
    if (response.error && String(response.error.code || '').toUpperCase() === '42703') response = await makeQuery('*');
    if (response.error) throw response.error;
    return Array.isArray(response.data) ? response.data[0] : null;
  }

  function renderList(mount, rows, type, meta) {
    if (!rows.length) {
      mount.innerHTML = emptyState(meta.empty, `Once an admin publishes ${meta.title.toLowerCase()} from the dashboard, it will appear here automatically.`, meta.icon);
      toggleActivityFrame(false, type);
      return;
    }
    toggleActivityFrame(true, type);
    if (meta.groupMode === 'schedule') return renderScheduleGroups(mount, rows, type, meta);
    return renderNewsGroups(mount, rows, type, meta);
  }

  function renderScheduleGroups(mount, rows, type, meta) {
    const grouped = groupSchedule(rows);
    const activeGroups = SCHEDULE_GROUPS
      .map((group) => ({ ...group, items: grouped[group.key] || [] }))
      .filter((group) => group.items.length > 0);
    const spotlight = chooseSpotlight(rows, type);

    if (!activeGroups.length) {
      mount.innerHTML = emptyState(meta.empty, `No active ${meta.title.toLowerCase()} are published yet.`, meta.icon);
      toggleActivityFrame(false, type);
      return;
    }

    mount.innerHTML = `
      <section class="apsg-featured-content" aria-label="Featured ${escapeHtml(meta.singular)}">
        ${renderSpotlight(spotlight, type, meta)}
      </section>
      <nav class="apsg-class-tabs" aria-label="${escapeHtml(meta.title)} groups">
        ${activeGroups.map((group) => renderGroupTab(`${type}-${group.key}`, group.icon, group.label, group.items.length)).join('')}
      </nav>
      ${activeGroups.map((group) => renderScheduleSection(group, group.items, type, meta)).join('')}`;
  }

  function renderScheduleSection(group, items, type, meta) {
    if (!items.length) return '';
    const title = `${group.label} ${type === 'meeting' ? 'Meetings' : 'Events'}`;
    const sortedItems = sortScheduleItems(items, group.key);
    return `
      <section id="${type}-${group.key}" class="apsg-board-section ${escapeAttr(group.key)}" data-apsg-section="${escapeAttr(group.key)}" aria-label="${escapeAttr(title)}">
        <div class="apsg-section-head">
          <div>
            <span class="apsg-section-kicker"><i class="fas ${group.icon}"></i>${escapeHtml(meta.deskLabel)}</span>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(group.description)}</p>
          </div>
          <span class="apsg-count-chip">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
        </div>
        <div class="apsg-content-grid classified">${sortedItems.map((item) => renderCard(item, type, meta, group.key)).join('')}</div>
      </section>`;
  }

  function renderNewsGroups(mount, rows, type, meta) {
    const grouped = groupNews(rows);
    const activeGroups = buildNewsGroupList(grouped).filter((group) => group.items.length > 0);
    const featured = rows.find((item) => item.is_featured) || sortNews(rows)[0];

    if (!activeGroups.length) {
      mount.innerHTML = emptyState(meta.empty, 'No public news activity is available yet.', meta.icon);
      toggleActivityFrame(false, type);
      return;
    }

    mount.innerHTML = `
      <section class="apsg-featured-content" aria-label="Featured ${escapeHtml(meta.singular)}">
        ${renderSpotlight(featured, type, meta)}
      </section>
      <nav class="apsg-class-tabs" aria-label="News timeline groups">
        ${activeGroups.map((group) => renderGroupTab(`news-${group.key}`, group.icon, group.label, group.items.length)).join('')}
      </nav>
      ${activeGroups.map((group) => renderNewsSection(group, type, meta)).join('')}`;
  }

  function renderNewsSection(group, type, meta) {
    if (!group.items.length) return '';
    return `
      <section id="news-${escapeAttr(group.key)}" class="apsg-board-section news" data-apsg-section="${escapeAttr(group.key)}" aria-label="${escapeAttr(group.label)}">
        <div class="apsg-section-head">
          <div>
            <span class="apsg-section-kicker"><i class="fas ${group.icon}"></i>News Timeline</span>
            <h2>${escapeHtml(group.label)}</h2>
            <p>${escapeHtml(group.description)}</p>
          </div>
          <span class="apsg-count-chip">${group.items.length} ${group.items.length === 1 ? 'post' : 'posts'}</span>
        </div>
        <div class="apsg-content-grid classified">${sortNews(group.items).map((item) => renderCard(item, type, meta, group.key)).join('')}</div>
      </section>`;
  }

  function renderGroupTab(targetId, icon, label, count) {
    return `<a href="#${escapeAttr(targetId)}" data-apsg-tab="${escapeAttr(targetId)}"><i class="fas ${icon}"></i>${escapeHtml(label)} <span>${count}</span></a>`;
  }

  function renderSpotlight(item, type, meta) {
    if (!item) return emptyState(`No ${meta.singular.toLowerCase()} available yet.`, 'Publish content from the admin dashboard to activate this premium board.', meta.icon);
    const hasImage = hasImageUrl(item);
    const group = type === 'blog' ? classifyNews(item).key : classifySchedule(item).key;
    const href = resolveDetailHref(item, type, meta);
    const dateText = type === 'blog' ? formatDate(item.created_at || item.updated_at) : formatScheduleText(item);
    const excerpt = item.excerpt || truncate(stripTags(item.body || ''), 260) || `Read the latest APSG ${meta.singular.toLowerCase()}.`;
    const title = item.title || `Untitled ${meta.singular}`;
    const cta = item.cta_url ? normalizeUrl(item.cta_url) : '';

    return `
      <article class="apsg-spotlight-card ${escapeAttr(group)}" data-content-card data-content-status="${escapeAttr(group)}" data-content-search="${escapeAttr(searchText(item))}">
        <a class="apsg-spotlight-image ${hasImage ? '' : 'no-image'}" href="${escapeAttr(href)}" aria-label="Open ${escapeAttr(title)}">
          ${renderImage(item.image_url, title, 'eager', 'apsg-spotlight-image')}
          <span class="apsg-status-pill ${escapeAttr(group)}">${escapeHtml(statusLabel(type, group))}</span>
        </a>
        <div class="apsg-spotlight-body">
          <span class="apsg-section-kicker"><i class="fas ${meta.icon}"></i>${escapeHtml(item.category || meta.singular)}</span>
          <h2><a href="${escapeAttr(href)}">${escapeHtml(title)}</a></h2>
          <p>${escapeHtml(excerpt)}</p>
          <div class="apsg-meta-grid">
            <span><i class="fas fa-calendar-day"></i>${escapeHtml(dateText)}</span>
            ${item.venue && type !== 'blog' ? `<span><i class="fas fa-location-dot"></i>${escapeHtml(item.venue)}</span>` : ''}
            ${item.is_featured ? '<span><i class="fas fa-star"></i>Featured</span>' : ''}
          </div>
          <div class="apsg-content-actions">
            <a class="apsg-content-btn" href="${escapeAttr(href)}">${escapeHtml(item.cta_label || 'View Details')} <i class="fas fa-arrow-right"></i></a>
            ${cta ? `<a class="apsg-content-btn secondary" href="${escapeAttr(cta)}" target="${isExternalUrl(cta) ? '_blank' : '_self'}" rel="noopener">Open CTA <i class="fas fa-up-right-from-square"></i></a>` : ''}
          </div>
        </div>
      </article>`;
  }

  function renderCard(item, type, meta, statusKey) {
    const groupKey = statusKey || (type === 'blog' ? classifyNews(item).key : classifySchedule(item).key);
    const hasImage = hasImageUrl(item);
    const href = resolveDetailHref(item, type, meta);
    const dateText = type === 'blog' ? formatDate(item.created_at || item.updated_at) : formatScheduleText(item);
    const excerpt = item.excerpt || truncate(stripTags(item.body || ''), 150) || `Read the full APSG ${meta.singular.toLowerCase()}.`;
    const title = item.title || `Untitled ${meta.singular}`;

    return `
      <article class="apsg-content-card classified ${escapeAttr(groupKey)}" data-content-card data-content-status="${escapeAttr(groupKey)}" data-content-search="${escapeAttr(searchText(item))}">
        <a class="apsg-card-image ${hasImage ? '' : 'no-image'}" href="${escapeAttr(href)}" aria-label="Open ${escapeAttr(title)}">
          ${renderImage(item.image_url, title, 'lazy', 'apsg-card-image')}
          <span class="apsg-status-pill ${escapeAttr(groupKey)}">${escapeHtml(statusLabel(type, groupKey))}</span>
        </a>
        <div class="apsg-content-body">
          <div class="apsg-content-meta">
            <span><i class="fas ${meta.icon}"></i>${escapeHtml(item.category || meta.singular)}</span>
            <span><i class="fas fa-calendar-day"></i>${escapeHtml(dateText)}</span>
            ${item.venue && type !== 'blog' ? `<span><i class="fas fa-location-dot"></i>${escapeHtml(item.venue)}</span>` : ''}
          </div>
          <h3><a href="${escapeAttr(href)}">${escapeHtml(title)}</a></h3>
          <p>${escapeHtml(excerpt)}</p>
          <div class="apsg-content-actions">
            ${item.is_featured ? '<span class="apsg-featured-badge"><i class="fas fa-star"></i>Featured</span>' : ''}
            <a class="apsg-content-btn" href="${escapeAttr(href)}">${escapeHtml(item.cta_label || 'View Details')} <i class="fas fa-arrow-right"></i></a>
          </div>
        </div>
      </article>`;
  }

  function renderDetail(mount, item, meta, backUrl) {
    const type = normalizeType(item.content_type || 'event');
    const group = type === 'blog' ? classifyNews(item).key : classifySchedule(item).key;
    const hasImage = hasImageUrl(item);
    const dateText = type === 'blog' ? formatDate(item.created_at || item.updated_at) : formatScheduleText(item);
    const bodyHtml = formatBody(item.body || item.excerpt || 'Full details will be updated soon.');
    const title = item.title || meta.singular;
    const cta = item.cta_url ? normalizeUrl(item.cta_url) : '';

    document.title = `${title} | APSG Nigeria`;

    mount.innerHTML = `
      <article class="content-detail-card classified-detail ${escapeAttr(group)}" data-content-detail-card data-content-status="${escapeAttr(group)}">
        <div class="content-detail-hero ${hasImage ? '' : 'no-image'}">
          ${renderImage(item.image_url, title, 'eager', 'content-detail-hero')}
          <div class="content-detail-overlay">
            <a class="content-back-link" href="${escapeAttr(backUrl)}"><i class="fas fa-arrow-left"></i> Back</a>
            <div class="mt-4"><span class="apsg-status-pill ${escapeAttr(group)} static">${escapeHtml(statusLabel(type, group))}</span></div>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(item.excerpt || '')}</p>
          </div>
        </div>
        <div class="content-detail-body">
          <div class="event-meta-grid detail">
            <span><i class="fas ${meta.icon}"></i>${escapeHtml(item.category || meta.singular)}</span>
            <span><i class="fas fa-calendar-day"></i>${escapeHtml(dateText)}</span>
            ${item.venue && type !== 'blog' ? `<span><i class="fas fa-location-dot"></i>${escapeHtml(item.venue)}</span>` : ''}
            ${item.is_featured ? '<span><i class="fas fa-star"></i>Featured</span>' : ''}
          </div>
          <div class="content-detail-text">${bodyHtml}</div>
          <div class="apsg-content-actions mt-6">
            ${cta ? `<a class="apsg-content-btn" href="${escapeAttr(cta)}" target="${isExternalUrl(cta) ? '_blank' : '_self'}" rel="noopener">${escapeHtml(item.cta_label || 'Open Link')} <i class="fas fa-arrow-right"></i></a>` : ''}
            <button class="apsg-content-btn secondary" type="button" data-copy-url="${escapeAttr(window.location.href)}"><i class="fas fa-link"></i>Copy Link</button>
          </div>
        </div>
      </article>`;
  }

  function renderImage(url, alt, loading, parentClass) {
    if (!url || !String(url).trim()) return '';
    return `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" loading="${loading || 'lazy'}" decoding="async" width="1200" height="760" onerror="this.closest('.${parentClass}')?.classList.add('no-image');this.remove();">`;
  }

  function groupSchedule(rows) {
    const groups = { live: [], upcoming: [], recent: [], past: [] };
    rows.forEach((item) => {
      const key = classifySchedule(item).key;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }

  function classifySchedule(item) {
    const explicit = String(item.status_group || item.schedule_status || item.category || '').toLowerCase();
    if (/\blive\b|ongoing|active now|happening/.test(explicit)) return { key: 'live' };
    if (/upcoming|scheduled|coming/.test(explicit)) return { key: 'upcoming' };
    if (/recent|latest|concluded/.test(explicit)) return { key: 'recent' };
    if (/past|archive|archived|closed|completed|ended/.test(explicit)) return { key: 'past' };

    const range = getScheduleRange(item);
    const now = new Date();
    if (!range.start) {
      const created = parseDate(item.created_at || item.updated_at);
      return { key: created && now - created <= RECENT_WINDOW_MS ? 'recent' : 'past' };
    }
    if (now >= range.start && now <= range.end) return { key: 'live' };
    if (range.start > now) return { key: 'upcoming' };
    if (now - range.end <= RECENT_WINDOW_MS) return { key: 'recent' };
    return { key: 'past' };
  }

  function getScheduleRange(item) {
    if (!item.event_date) return { start: null, end: null };
    const date = String(item.event_date).slice(0, 10);
    const startTime = normalizeTime(item.start_time) || '00:00';
    const endTime = normalizeTime(item.end_time);
    const start = new Date(`${date}T${startTime}:00`);
    if (Number.isNaN(start.getTime())) return { start: null, end: null };
    let end = endTime ? new Date(`${date}T${endTime}:00`) : null;
    if (!end || Number.isNaN(end.getTime()) || end <= start) {
      end = new Date(start.getTime() + (item.start_time ? 6 : 24) * 60 * 60 * 1000);
    }
    return { start, end };
  }

  function groupNews(rows) {
    const groups = {};
    rows.forEach((item) => {
      const group = classifyNews(item);
      if (!groups[group.key]) groups[group.key] = { ...group, items: [] };
      groups[group.key].items.push(item);
    });
    return groups;
  }

  function buildNewsGroupList(groups) {
    const fixedMeta = {
      today: { label: 'Today', icon: 'fa-sun', description: 'Fresh APSG updates published today.' },
      this_week: { label: 'This Week', icon: 'fa-calendar-week', description: 'Updates published earlier this week.' },
      last_week: { label: 'Last Week', icon: 'fa-clock-rotate-left', description: 'Updates from the previous week.' },
      last_month: { label: 'Last Month', icon: 'fa-calendar-days', description: 'Updates from the previous calendar month.' }
    };
    const output = [];
    NEWS_GROUP_ORDER.forEach((key) => {
      if (groups[key]) output.push({ key, ...fixedMeta[key], items: groups[key].items });
    });
    Object.keys(groups)
      .filter((key) => !NEWS_GROUP_ORDER.includes(key))
      .sort((a, b) => (groups[b].sortDate || '').localeCompare(groups[a].sortDate || ''))
      .forEach((key) => output.push(groups[key]));
    return output;
  }

  function classifyNews(item) {
    const date = parseDate(item.created_at || item.updated_at) || new Date();
    const now = new Date();
    const todayStart = startOfDay(now);
    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    if (date >= todayStart) return { key: 'today', label: 'Today', icon: 'fa-sun', description: 'Fresh APSG updates published today.', sortDate: isoMonth(date) };
    if (date >= thisWeekStart) return { key: 'this_week', label: 'This Week', icon: 'fa-calendar-week', description: 'Updates published earlier this week.', sortDate: isoMonth(date) };
    if (date >= lastWeekStart && date < thisWeekStart) return { key: 'last_week', label: 'Last Week', icon: 'fa-clock-rotate-left', description: 'Updates from the previous week.', sortDate: isoMonth(date) };
    if (date >= lastMonthStart && date < lastMonthEnd) return { key: 'last_month', label: `Last Month - ${monthYear(date)}`, icon: 'fa-calendar-days', description: 'Updates from the previous calendar month.', sortDate: isoMonth(date) };
    return { key: `archive_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`, label: monthYear(date), icon: 'fa-box-archive', description: `Archived APSG updates from ${monthYear(date)}.`, sortDate: isoMonth(date) };
  }

  function sortRows(rows, type) {
    if (type === 'blog') return sortNews(rows);
    return [...rows].sort((a, b) => {
      const order = { live: 0, upcoming: 1, recent: 2, past: 3 };
      const ak = classifySchedule(a).key;
      const bk = classifySchedule(b).key;
      if (order[ak] !== order[bk]) return order[ak] - order[bk];
      if (Boolean(a.is_featured) !== Boolean(b.is_featured)) return a.is_featured ? -1 : 1;
      const at = getScheduleRange(a).start?.getTime() || parseDate(a.created_at)?.getTime() || 0;
      const bt = getScheduleRange(b).start?.getTime() || parseDate(b.created_at)?.getTime() || 0;
      return ak === 'upcoming' || ak === 'live' ? at - bt : bt - at;
    });
  }

  function sortScheduleItems(items, groupKey) {
    return [...items].sort((a, b) => {
      if (Boolean(a.is_featured) !== Boolean(b.is_featured)) return a.is_featured ? -1 : 1;
      const at = getScheduleRange(a).start?.getTime() || parseDate(a.created_at)?.getTime() || 0;
      const bt = getScheduleRange(b).start?.getTime() || parseDate(b.created_at)?.getTime() || 0;
      return groupKey === 'upcoming' || groupKey === 'live' ? at - bt : bt - at;
    });
  }

  function sortNews(items) {
    return [...items].sort((a, b) => {
      if (Boolean(a.is_featured) !== Boolean(b.is_featured)) return a.is_featured ? -1 : 1;
      return (parseDate(b.created_at || b.updated_at)?.getTime() || 0) - (parseDate(a.created_at || a.updated_at)?.getTime() || 0);
    });
  }

  function chooseSpotlight(rows, type) {
    const sorted = sortRows(rows, type);
    return sorted.find((item) => item.is_featured) || sorted[0];
  }

  function normalizeRow(row) {
    return {
      id: row.id || row.uuid || row.record_id || '',
      content_type: normalizeType(row.content_type || row.type || 'blog'),
      title: row.title || row.name || row.heading || '',
      slug: row.slug || slugify(row.title || row.name || row.id || ''),
      excerpt: row.excerpt || row.summary || row.short_description || '',
      body: row.body || row.content || row.description || '',
      category: row.category || row.notice_type || row.event_type || '',
      image_url: row.image_url || row.cover_image || row.featured_image || row.banner_image || '',
      venue: row.venue || row.location || '',
      event_date: row.event_date || row.meeting_date || row.date || '',
      start_time: row.start_time || row.time_start || '',
      end_time: row.end_time || row.time_end || '',
      cta_label: row.cta_label || '',
      cta_url: row.cta_url || '',
      is_featured: Boolean(row.is_featured || row.featured),
      status: row.status || 'published',
      created_at: row.created_at || '',
      updated_at: row.updated_at || '',
      status_group: row.status_group || row.schedule_status || ''
    };
  }

  function normalizeType(value) {
    const type = String(value || '').toLowerCase().trim();
    if (type === 'news' || type === 'post' || type === 'article') return 'blog';
    if (type === 'meetings') return 'meeting';
    if (type === 'events') return 'event';
    return TYPE_META[type] ? type : 'blog';
  }

  function normalizeUrl(url) {
    if (!url) return '';
    let value = String(url).trim();
    if (/^(mailto:|tel:|https?:\/\/|#)/i.test(value)) return value;
    value = value.replace(/^pages\//i, '/pages/');
    if (!value.startsWith('/')) value = `/${value}`;
    const map = {
      '/blog.html': '/pages/blog.html',
      '/pages/blog.html': '/pages/blog.html',
      '/blog-detail.html': '/pages/blog-detail.html',
      '/meeting.html': '/pages/meetings.html',
      '/meetings.html': '/pages/meetings.html',
      '/event.html': '/pages/events.html',
      '/events.html': '/pages/events.html',
      '/meeting-details.html': '/pages/meeting-details.html',
      '/event-details.html': '/pages/event-details.html'
    };
    for (const [from, to] of Object.entries(map)) {
      if (value === from || value.startsWith(`${from}?`) || value.startsWith(`${from}#`)) return to + value.slice(from.length);
    }
    return value;
  }

  function resolveDetailHref(item, type, meta) {
    const page = meta.detailPage || `/pages/${type}-details.html`;
    const params = new URLSearchParams();
    if (item.id) params.set('id', item.id);
    if (item.slug) params.set('slug', item.slug);
    const query = params.toString();
    return normalizeUrl(`${page}${query ? `?${query}` : ''}`);
  }

  function statusLabel(type, key) {
    if (type === 'blog') {
      return ({ today: 'Today', this_week: 'This Week', last_week: 'Last Week', last_month: 'Last Month' }[key] || 'Archive');
    }
    return ({ live: 'Live Now', upcoming: 'Upcoming', recent: 'Recent', past: 'Past' }[key] || 'Published');
  }

  function updateStats(rows, type, meta) {
    const total = rows.length;
    const liveOrToday = type === 'blog' ? rows.filter((item) => classifyNews(item).key === 'today').length : rows.filter((item) => classifySchedule(item).key === 'live').length;
    const upcomingOrWeek = type === 'blog' ? rows.filter((item) => classifyNews(item).key === 'this_week').length : rows.filter((item) => classifySchedule(item).key === 'upcoming').length;

    setStat('total', total);
    setStat('featured', liveOrToday);
    setStat('upcoming', upcomingOrWeek);
    setLabelForStat('featured', type === 'blog' ? 'Today' : 'Live');
    setLabelForStat('upcoming', type === 'blog' ? 'This Week' : 'Upcoming');

    const labelEl = document.querySelector('[data-content-label]');
    if (labelEl) labelEl.textContent = meta.title;
  }

  function setStat(name, value) {
    document.querySelectorAll(`[data-content-stat="${name}"]`).forEach((el) => { el.textContent = Number(value || 0).toLocaleString(); });
  }

  function setLabelForStat(statName, labelText) {
    document.querySelectorAll(`[data-content-stat="${statName}"]`).forEach((el) => {
      const label = el.closest('.apsg-stat,.hero-stat')?.querySelector('p:first-child');
      if (label) label.textContent = labelText;
    });
  }

  function updateDetailMeta(item, meta, type) {
    const title = item.title || meta.singular;
    const description = item.excerpt || truncate(stripTags(item.body || ''), 180) || meta.empty;
    const url = window.location.href;
    const image = hasImageUrl(item) ? item.image_url : absoluteUrl(FALLBACK_IMAGE);
    document.title = `${title} | APSG Nigeria`;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', `${title} | APSG Nigeria`);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[name="twitter:title"]', 'content', `${title} | APSG Nigeria`);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:image"]', 'content', image);
    setCanonical(url);
    injectDetailSchema(item, meta, type, url, image, description);
  }

  function injectDetailSchema(item, meta, type, url, image, description) {
    const old = document.querySelector('script[data-apsg-dynamic-content-schema]');
    if (old) old.remove();
    const schema = {
      '@context': 'https://schema.org',
      '@type': type === 'blog' ? 'Article' : 'Event',
      name: item.title || meta.singular,
      headline: item.title || meta.singular,
      description,
      image,
      url,
      datePublished: item.created_at || item.event_date || undefined,
      dateModified: item.updated_at || item.created_at || undefined,
      startDate: type === 'blog' ? undefined : buildIsoDateTime(item.event_date, item.start_time),
      endDate: type === 'blog' ? undefined : buildIsoDateTime(item.event_date, item.end_time),
      location: item.venue ? { '@type': 'Place', name: item.venue } : undefined,
      publisher: {
        '@type': 'Organization',
        name: 'APC Progressive Support Group (APSG)',
        logo: { '@type': 'ImageObject', url: absoluteUrl('/assets/images/logo/apsg1.png') }
      }
    };
    Object.keys(schema).forEach((key) => schema[key] === undefined && delete schema[key]);
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.apsgDynamicContentSchema = 'true';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  function buildIsoDateTime(date, time) {
    if (!date) return undefined;
    const datePart = String(date).slice(0, 10);
    const timePart = normalizeTime(time) || '00:00';
    const d = new Date(`${datePart}T${timePart}:00`);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  function setMeta(selector, attr, value) {
    if (!value) return;
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      if (selector.includes('property=')) {
        const match = selector.match(/property="([^"]+)"/);
        if (match) el.setAttribute('property', match[1]);
      } else if (selector.includes('name=')) {
        const match = selector.match(/name="([^"]+)"/);
        if (match) el.setAttribute('name', match[1]);
      }
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  }

  function setCanonical(url) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;
  }

  function renderLoading(mount, meta) {
    mount.innerHTML = `<div class="apsg-content-state"><span class="apsg-loader" aria-hidden="true"></span><h3>Loading ${escapeHtml(meta.title)}...</h3><p>Fetching the latest published APSG content from Supabase.</p></div>`;
  }

  function renderError(mount, message) {
    mount.innerHTML = `<div class="apsg-content-state error"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i><h3>Content could not load</h3><p>${escapeHtml(message)}</p></div>`;
    toggleActivityFrame(false);
  }

  function emptyState(title, message, icon, compact) {
    return `<div class="apsg-content-state empty ${compact ? 'compact' : ''}"><i class="fas ${icon || 'fa-inbox'}" aria-hidden="true"></i><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message || '')}</p></div>`;
  }

  function toggleActivityFrame(hasActivity, type) {
    document.documentElement.classList.toggle('apsg-has-public-activity', Boolean(hasActivity));
    document.documentElement.classList.toggle('apsg-no-public-activity', !hasActivity);
    document.querySelectorAll('[data-hide-without-activity], .hide-without-activity').forEach((el) => {
      el.hidden = !hasActivity;
    });
    document.querySelectorAll('[data-show-without-activity], .show-without-activity').forEach((el) => {
      el.hidden = hasActivity;
    });
    if (type) document.body.dataset.publicActivityType = type;
  }

  function dispatchContentReady(mount, rows, type) {
    const event = new CustomEvent('apsg:public-content-ready', {
      detail: { mount, rows, type, hasActivity: rows.length > 0 }
    });
    window.dispatchEvent(event);
  }

  function formatScheduleText(item) {
    const date = formatDate(item.event_date || item.created_at);
    const time = formatTimeRange(item.start_time, item.end_time);
    return time ? `${date} - ${time}` : date;
  }

  function formatDate(value) {
    if (!value) return 'Date TBA';
    const date = parseDate(value);
    if (!date) return 'Date TBA';
    return date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatTimeRange(start, end) {
    if (!start && !end) return '';
    const s = normalizeTime(start);
    const e = normalizeTime(end);
    return e ? `${s || '00:00'} - ${e}` : (s || '');
  }

  function normalizeTime(value) {
    if (!value) return '';
    const match = String(value).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return '';
    return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function startOfWeek(date) {
    const d = startOfDay(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d;
  }

  function isoMonth(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function monthYear(date) {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  function truncate(text, length) {
    if (!text) return '';
    return text.length > length ? `${text.slice(0, length).trim()}...` : text;
  }

  function stripTags(value) {
    const div = document.createElement('div');
    div.innerHTML = String(value || '');
    return div.textContent || div.innerText || '';
  }

  function formatBody(value) {
    const raw = String(value || '');
    if (/<[a-z][\s\S]*>/i.test(raw)) return sanitizeHtml(raw);
    return raw.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p.trim())}</p>`).join('');
  }

  function sanitizeHtml(value) {
    const template = document.createElement('template');
    template.innerHTML = String(value || '');
    template.content.querySelectorAll('script,style,iframe,object,embed,form,input,button,link,meta').forEach((node) => node.remove());
    template.content.querySelectorAll('*').forEach((node) => {
      Array.from(node.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const val = attr.value || '';
        if (name.startsWith('on')) node.removeAttribute(attr.name);
        if ((name === 'href' || name === 'src') && /^(javascript:|data:text\/html)/i.test(val.trim())) node.removeAttribute(attr.name);
      });
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') || '';
        if (isExternalUrl(href)) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        }
      }
    });
    return template.innerHTML;
  }

  function bindGlobalCopyHandler() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-copy-url]');
      if (!button) return;
      const value = button.getAttribute('data-copy-url') || window.location.href;
      if (navigator.clipboard) navigator.clipboard.writeText(value);
    });
  }

  function getClient() {
    return window.supabaseClient || window.apsgSupabaseClient || window.APSG_SUPABASE_CLIENT || window.apsgSupabase || null;
  }

  function hasImageUrl(item) {
    return Boolean(item && item.image_url && String(item.image_url).trim());
  }

  function isExternalUrl(url) {
    return /^https?:\/\//i.test(url || '');
  }

  function absoluteUrl(value) {
    try { return new URL(value, window.location.origin).href; } catch (error) { return value; }
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'content';
  }

  function searchText(item) {
    return [item.title, item.excerpt, stripTags(item.body), item.category, item.venue, item.event_date]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function injectStyles() {
    if (document.getElementById('apsg-classified-content-styles')) return;
    const style = document.createElement('style');
    style.id = 'apsg-classified-content-styles';
    style.textContent = `
      :root{--deep:#05351f;--green:#0f8a4b;--emerald:#0f766e;--gold:#d6a92b;--cream:#fffaf0;--ink:#07140e}
      .apsg-content-state{text-align:center;border-radius:1.45rem;border:1px dashed rgba(5,53,31,.18);background:rgba(255,255,255,.9);padding:3rem 1.5rem;box-shadow:0 18px 50px rgba(5,53,31,.08)}.apsg-content-state.compact{padding:2rem 1rem}.apsg-content-state i{font-size:2rem;color:var(--gold)}.apsg-content-state h3{margin:.8rem 0 .35rem;font-weight:950;color:var(--deep);font-size:1.4rem}.apsg-content-state p{color:#66756c}.apsg-loader{display:inline-block;width:2rem;height:2rem;border:3px solid rgba(214,169,43,.25);border-top-color:var(--gold);border-radius:999px;animation:apsgSpin .8s linear infinite}@keyframes apsgSpin{to{transform:rotate(360deg)}}
      .apsg-no-public-activity [data-hide-without-activity],.apsg-no-public-activity .hide-without-activity{display:none!important}.apsg-has-public-activity [data-show-without-activity],.apsg-has-public-activity .show-without-activity{display:none!important}
      .apsg-spotlight-card{overflow:hidden;border-radius:2rem;background:#fff;border:1px solid rgba(5,53,31,.10);box-shadow:0 26px 86px rgba(5,53,31,.13);display:grid;grid-template-columns:.92fr 1.08fr;margin-bottom:1.2rem}.apsg-spotlight-image{min-height:26rem;position:relative;display:block;background:linear-gradient(135deg,var(--deep),var(--emerald));overflow:hidden}.apsg-spotlight-image img,.apsg-card-image img,.content-detail-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}.apsg-spotlight-image.no-image:after,.apsg-card-image.no-image:after,.content-detail-hero.no-image:after{content:'APSG';position:absolute;inset:0;display:grid;place-items:center;color:rgba(255,255,255,.15);font-size:clamp(2.5rem,7vw,4.8rem);font-weight:950;letter-spacing:.04em}.apsg-spotlight-body{padding:2rem}.apsg-spotlight-body h2{font-family:'Playfair Display',Georgia,serif;color:var(--deep);font-size:clamp(2rem,4vw,3.7rem);font-weight:950;line-height:.96;margin-top:.55rem}.apsg-spotlight-body h2 a{color:inherit;text-decoration:none}.apsg-spotlight-body p{color:#64746a;line-height:1.75;margin-top:1rem}.apsg-section-kicker{display:inline-flex;align-items:center;gap:.45rem;color:var(--green);font-size:.72rem;text-transform:uppercase;letter-spacing:.18em;font-weight:950}
      .apsg-class-tabs{display:flex;flex-wrap:wrap;gap:.7rem;margin:1.2rem 0 2rem}.apsg-class-tabs a{display:inline-flex;align-items:center;gap:.5rem;border-radius:999px;background:#fff;border:1px solid rgba(15,138,75,.12);box-shadow:0 10px 25px rgba(5,53,31,.06);padding:.75rem 1rem;font-weight:950;color:var(--deep);text-decoration:none}.apsg-class-tabs span{background:rgba(214,169,43,.22);border-radius:999px;padding:.12rem .48rem}.apsg-board-section{scroll-margin-top:7rem;margin-top:2.2rem}.apsg-section-head{display:flex;justify-content:space-between;align-items:end;gap:1rem;margin-bottom:1rem}.apsg-section-head h2{font-family:'Playfair Display',Georgia,serif;color:var(--deep);font-size:clamp(2rem,4vw,3.2rem);font-weight:950;line-height:1}.apsg-section-head p{color:#66756c;margin-top:.35rem}.apsg-count-chip{border-radius:999px;background:#fff7d6;color:#8a6616;padding:.6rem .9rem;font-weight:950;white-space:nowrap}.apsg-content-grid.classified{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
      .apsg-content-card.classified{overflow:hidden;border-radius:1.55rem;background:#fff;border:1px solid rgba(5,53,31,.10);box-shadow:0 18px 52px rgba(5,53,31,.08);transition:.24s ease}.apsg-content-card.classified:hover{transform:translateY(-5px);box-shadow:0 24px 66px rgba(5,53,31,.13);border-color:rgba(214,169,43,.35)}.apsg-card-image{height:14.5rem;position:relative;display:block;background:linear-gradient(135deg,var(--deep),var(--emerald));overflow:hidden}.apsg-content-body{padding:1.2rem}.apsg-content-meta,.apsg-meta-grid,.event-meta-grid{display:flex;flex-wrap:wrap;gap:.45rem;margin:.85rem 0}.apsg-content-meta span,.apsg-meta-grid span,.event-meta-grid span{display:inline-flex;align-items:center;gap:.38rem;border-radius:999px;background:#eef8f2;color:#315041;padding:.42rem .68rem;font-size:.73rem;font-weight:850}.apsg-content-body h3{font-family:'Playfair Display',Georgia,serif;font-size:1.55rem;line-height:1.05;color:var(--deep);font-weight:950}.apsg-content-body h3 a{color:inherit;text-decoration:none}.apsg-content-body p{margin-top:.65rem;color:#64746a;line-height:1.65}.apsg-content-actions{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-top:1rem}.apsg-content-btn,.apsg-featured-badge{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;border-radius:999px;padding:.68rem .9rem;font-weight:950;font-size:.8rem;text-decoration:none}.apsg-content-btn{background:linear-gradient(135deg,var(--green),var(--emerald));color:#fff}.apsg-content-btn.secondary{background:#fff;color:var(--deep);border:1px solid rgba(5,53,31,.12)}.apsg-featured-badge{background:#fff7d6;color:#8a6616}
      .apsg-status-pill{position:absolute;left:1rem;top:1rem;z-index:2;display:inline-flex;align-items:center;gap:.42rem;border-radius:999px;padding:.5rem .8rem;font-size:.7rem;font-weight:950;text-transform:uppercase;letter-spacing:.08em;color:#052514;background:linear-gradient(135deg,#f7d66b,var(--gold))}.apsg-status-pill:before{content:'';width:.44rem;height:.44rem;border-radius:999px;background:currentColor}.apsg-status-pill.static{position:static}.apsg-status-pill.live{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;box-shadow:0 0 0 5px rgba(239,68,68,.14)}.apsg-status-pill.upcoming,.apsg-status-pill.today{background:linear-gradient(135deg,#f7d66b,var(--gold));color:#052514}.apsg-status-pill.recent,.apsg-status-pill.this_week{background:linear-gradient(135deg,#bbf7d0,#22c55e);color:#052514}.apsg-status-pill.past,.apsg-status-pill.last_week,.apsg-status-pill.last_month,.apsg-status-pill[class*='archive']{background:linear-gradient(135deg,#e2e8f0,#94a3b8);color:#102018}
      .content-detail-card{overflow:hidden;border-radius:2rem;background:#fff;border:1px solid rgba(5,53,31,.10);box-shadow:0 26px 86px rgba(5,53,31,.13)}.content-detail-hero{position:relative;min-height:28rem;background:linear-gradient(135deg,var(--deep),var(--emerald));overflow:hidden}.content-detail-hero:before{content:'';position:absolute;inset:0;background:linear-gradient(0deg,rgba(5,53,31,.92),rgba(5,53,31,.24));z-index:1}.content-detail-overlay{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:2rem;color:#fff}.content-detail-overlay h1{font-family:'Playfair Display',Georgia,serif;font-size:clamp(2.4rem,6vw,5rem);font-weight:950;line-height:.95;margin-top:1rem}.content-detail-overlay p{max-width:52rem;margin-top:1rem;color:rgba(255,255,255,.78);font-size:1.1rem;line-height:1.7}.content-back-link{display:inline-flex;align-items:center;gap:.5rem;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);color:#fff;text-decoration:none;padding:.55rem .8rem;font-weight:900}.content-detail-body{padding:2rem}.content-detail-text{color:#34443a;font-size:1.02rem;line-height:1.85}.content-detail-text p{margin:0 0 1rem}.apsg-content-btn:focus-visible,.apsg-class-tabs a:focus-visible,.content-back-link:focus-visible{outline:3px solid rgba(216,173,52,.55);outline-offset:3px}
      @media(max-width:1000px){.apsg-spotlight-card{grid-template-columns:1fr}.apsg-content-grid.classified{grid-template-columns:1fr 1fr}.apsg-spotlight-image{min-height:20rem}}@media(max-width:640px){.apsg-content-grid.classified{grid-template-columns:1fr}.apsg-section-head{align-items:flex-start;flex-direction:column}.apsg-card-image{height:13rem}.content-detail-overlay,.content-detail-body,.apsg-spotlight-body{padding:1.2rem}.apsg-content-btn{width:100%}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
    `;
    document.head.appendChild(style);
  }
})();
