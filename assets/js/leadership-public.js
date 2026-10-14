(function () {
  'use strict';
  const fallbackLogo = window.APSG_LEADERSHIP_LOGO_FALLBACK || '/assets/images/logo/apsg1.png';
  const profileFallback = '/assets/images/placeholders/profile-placeholder.svg';
  const seed = Array.isArray(window.APSG_LEADERSHIP_SEED) ? window.APSG_LEADERSHIP_SEED : [];
  const tableCandidates = window.APSG_OFFICIALS_TABLES || ['apsg_officials', 'officials', 'leadership_officials'];
  let allRows = [];
  let allMembers = [];
  let currentFilter = 'all';
  let currentMember = null;
  let currentSource = 'Fallback static register';

  const qs = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[s]));
  const plain = html => { const div = document.createElement('div'); div.innerHTML = String(html || ''); return (div.textContent || div.innerText || '').trim(); };
  const slugify = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/&/g, ' and ').replace(/federal capital territory|\(fct\)/g, 'fct').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'official';
  const norm = value => String(value || '').toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  function getClient() { return window.apsgSupabase || window.supabaseClient || window.supabaseClientPublic || window.APSG_SUPABASE || window.sb || null; }
  function pick(row, keys) { for (const k of keys) { const v = row && row[k]; if (v !== undefined && v !== null && String(v).trim() !== '') return v; } return ''; }
  function toArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
    if (typeof value === 'string') {
      try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed.map(v => String(v || '').trim()).filter(Boolean); } catch (_) {}
      return value.split(/[|,;]/).map(v => v.trim()).filter(Boolean);
    }
    return [String(value).trim()].filter(Boolean);
  }
  function rowTargets(row) {
    const raw = [];
    ['publish_targets', 'page_targets', 'directories'].forEach(key => raw.push(...toArray(row[key])));
    ['directory', 'category', 'level', 'seat', 'position', 'role', 'leadership_group', 'section_key', 'group_route_key'].forEach(key => { if (row[key]) raw.push(row[key]); });
    return raw.map(norm).filter(Boolean);
  }
  function hasExplicitTargets(row) { return ['publish_targets', 'page_targets', 'directories', 'directory'].some(key => toArray(row[key]).length > 0); }
  function organizationOf(row) { return norm(pick(row, ['organization', 'organization_key', 'org', 'group_org'])) || 'apsg'; }
  function leadershipGroupOf(row) { return norm(pick(row, ['leadership_group', 'section_key', 'group', 'category'])); }
  function targetAliases(directory) {
    const map = {
      leadership: ['leadership', 'bot', 'board_bot', 'mp', 'matron', 'patron', 'national_executive', 'state_executive', 'executive_directors', 'executive_leadership', 'cwdi'],
      bot: ['bot', 'board', 'board_bot', 'board_members', 'trustees', 'board_of_trustees', 'board_council'],
      mp: ['mp', 'matrons_patrons', 'patrons_matrons', 'patronage', 'patron', 'matron', 'adviser', 'advisor'],
      executive: ['executive', 'executives', 'national', 'national_executive', 'national_executives', 'nat_exec', 'natexco', 'nat_executive', 'nat_exco', 'executive_directors'],
      state: ['state', 'states', 'state_executive', 'state_executives', 'chapter', 'state_chapter'],
      cwdi: ['cwdi', 'confident_women', 'board_bot', 'patrons', 'matrons', 'executive_leadership', 'national_executive']
    };
    return (map[norm(directory)] || [norm(directory)]).map(norm);
  }
  function labelFor(category) { return String(category || 'Official').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  function iconFor(category) {
    return { matron: 'fa-crown', patron: 'fa-landmark', adviser: 'fa-user-shield', advisor: 'fa-user-shield', executive: 'fa-user-tie', national_executive: 'fa-sitemap', women: 'fa-person-dress', state_executive: 'fa-map-location-dot', bot: 'fa-user-check', board: 'fa-user-check', board_bot: 'fa-user-check' }[norm(category)] || 'fa-user-check';
  }
  function isRealName(name) { return !!String(name || '').trim() && !/^(n\/?a|none|null|undefined|-|--|---|placeholder|sample|test|name)$/i.test(String(name).trim()); }
  function isPublished(row) {
    const name = String(pick(row, ['full_name', 'name', 'member_name', 'official_name', 'title'])).trim();
    if (!isRealName(name)) return false;
    const position = String(pick(row, ['position', 'role', 'designation', 'office', 'portfolio', 'rank'])).trim();
    if (!position || /^[-\s]*$/.test(position)) return false;
    const status = String(pick(row, ['status', 'visibility', 'publish_status'])).trim().toLowerCase();
    if (['draft', 'hidden', 'private', 'inactive', 'unpublished', 'disabled'].includes(status)) return false;
    const publishedValue = row.is_published ?? row.published ?? row.is_active ?? row.active;
    if (publishedValue === false || publishedValue === 'false' || publishedValue === 0 || publishedValue === '0') return false;
    return true;
  }
  function classify(row, name, role, seat) {
    const raw = norm(pick(row, ['category', 'role_type', 'member_type', 'official_type', 'level', 'leadership_group', 'section_key']));
    const text = `${name} ${role} ${seat} ${raw}`.toLowerCase();
    if (/matron|grand matron|iyalode/.test(text)) return 'matron';
    if (/patron|adviser|advisor/.test(text)) return 'patron';
    if (/state/.test(text) && /coordinator|executive|secretary|women|youth|media|director/.test(text)) return 'state_executive';
    if (/national|executive|director|secretary|coordinator|deputy/.test(text)) return 'executive';
    if (/bot|board|trustee/.test(text)) return 'bot';
    return raw || 'official';
  }
  function cleanImage(v) {
    const s = String(v || '').trim();
    if (!s || /logo\/apsg|placeholder|^null$/i.test(s)) return '';
    return s;
  }
  function canonicalProfile(row, name, slug) {
    return String(pick(row, ['profile_slug', 'profile_key', 'canonical_profile_key', 'canonical_slug'])).trim() || slugify(slug || name);
  }
  function placementKey(row) { return String(pick(row, ['placement_key'])).trim() || [organizationOf(row), leadershipGroupOf(row), norm(pick(row, ['position', 'role', 'designation'])), norm(pick(row, ['state']))].filter(Boolean).join('_'); }
  function normalizeMember(row, index, source) {
    const name = String(pick(row, ['full_name', 'name', 'member_name', 'official_name', 'title'])).trim();
    const role = String(pick(row, ['position', 'role', 'designation', 'office', 'portfolio', 'rank'])).trim() || 'Official';
    const seat = String(pick(row, ['seat', 'board_seat', 'council', 'section', 'group', 'leadership_group'])).trim() || 'APSG Council';
    const slug = String(pick(row, ['slug'])).trim() || slugify(name);
    const category = classify(row, name, role, seat);
    const shortInfo = String(pick(row, ['short_info', 'excerpt', 'card_excerpt'])).trim();
    return {
      raw: row, id: String(pick(row, ['id', 'official_id', 'uuid', 'local_id'])).trim(), slug,
      profile_slug: canonicalProfile(row, name, slug), profile_key: canonicalProfile(row, name, slug), placement_key: placementKey(row),
      canonical_profile: row.canonical_profile === true || String(row.canonical_profile).toLowerCase() === 'true',
      index: Number(pick(row, ['display_order', 'sort_order', 'order_no', 'position_order', 'priority', 'order'])) || index || 999,
      name, role, category, seat, image: cleanImage(pick(row, ['image_url', 'image', 'photo', 'photo_url', 'avatar', 'avatar_url', 'profile_photo', 'profile_image'])),
      summary: shortInfo,
      short_info: shortInfo,
      state: String(pick(row, ['state', 'state_name', 'chapter_state'])).trim(),
      zone: String(pick(row, ['zone'])).trim(), lga: String(pick(row, ['lga', 'lcda'])).trim(), ward: String(pick(row, ['ward'])).trim(),
      organization: organizationOf(row), leadership_group: leadershipGroupOf(row), credentials: String(pick(row, ['credentials'])).trim(),
      biography: String(pick(row, ['biography', 'profile_html', 'bio', 'profile'])).trim(), achievements: String(pick(row, ['achievements', 'achievement', 'public_record', 'records'])).trim(),
      icon: row.icon || iconFor(category), targets: rowTargets(row), hasExplicitTargets: hasExplicitTargets(row), source
    };
  }
  function identityKey(member) { return String(member.profile_slug || member.profile_key || '').trim() || slugify(member.slug || member.name); }
  function primaryRecord(records) {
    return records.slice().sort((a, b) => {
      const ca = a.canonical_profile ? 1 : 0, cb = b.canonical_profile ? 1 : 0;
      if (cb !== ca) return cb - ca;
      const oa = Number(a.index) || 999, ob = Number(b.index) || 999;
      if (oa !== ob) return oa - ob;
      return new Date(b.raw?.updated_at || b.raw?.created_at || 0) - new Date(a.raw?.updated_at || a.raw?.created_at || 0);
    })[0] || records[0];
  }
  function groupPublicRows(rows) {
    const map = new Map();
    rows.forEach(row => {
      const key = identityKey(row);
      if (!map.has(key)) map.set(key, []);
      const exists = map.get(key).some(x => (x.placement_key && x.placement_key === row.placement_key) || (x.id && x.id === row.id));
      if (!exists) map.get(key).push(row);
    });
    return Array.from(map.entries()).map(([key, records]) => {
      const primary = primaryRecord(records);
      const bestImage = primary.image || records.find(r => r.image)?.image || '';
      const bestSummary = primary.summary || records.find(r => r.summary)?.summary || '';
      return { ...primary, image: bestImage, summary: bestSummary, short_info: bestSummary, roles: records, linked_roles: records, profile_slug: key, profile_key: key };
    }).sort((a, b) => (Number(a.index) || 999) - (Number(b.index) || 999) || a.name.localeCompare(b.name));
  }
  async function fetchAllRows(table, chunkSize = 1000) {
    const client = getClient();
    let all = [], from = 0;
    while (true) {
      const response = await client.from(table).select('*').range(from, from + chunkSize - 1);
      if (response.error) throw response.error;
      const rows = Array.isArray(response.data) ? response.data : [];
      all = all.concat(rows);
      if (rows.length < chunkSize) break;
      from += chunkSize;
    }
    return all;
  }
  function friendlyError(error) {
    const msg = error?.message || String(error || 'Unknown error');
    if (/relation .* does not exist|schema cache|not found/i.test(msg)) return 'Missing officials table. Confirm apsg_officials exists and is exposed to anon RLS.';
    if (/row-level security|rls|permission denied|not authorized/i.test(msg)) return 'RLS denied published officials. Check anon SELECT policy for published records.';
    if (/failed to fetch|network|offline/i.test(msg)) return 'Network/offline issue while contacting Supabase.';
    return msg;
  }
  async function fetchRows() {
    const client = getClient();
    if (!client || typeof client.from !== 'function') {
      currentSource = 'Fallback static register';
      allRows = seed.map((row, i) => normalizeMember({ ...row, status: 'published', is_published: true }, i + 1, currentSource)).filter(m => isRealName(m.name));
      return allRows;
    }
    const errors = [];
    for (const table of tableCandidates) {
      try {
        const rows = await fetchAllRows(table, 1000);
        const normalized = rows.map((row, i) => normalizeMember(row, i + 1, `Supabase table: ${table}`)).filter(m => isPublished(m.raw));
        if (normalized.length) { currentSource = `Supabase table: ${table}`; allRows = normalized; return allRows; }
        errors.push(`${table}: no published officials`);
      } catch (error) { errors.push(`${table}: ${friendlyError(error)}`); console.warn('[APSG Officials]', table, error); }
    }
    currentSource = errors.join(' | ') || 'Fallback static register';
    allRows = seed.map((row, i) => normalizeMember({ ...row, status: 'published', is_published: true }, i + 1, 'Fallback static register')).filter(m => isRealName(m.name));
    return allRows;
  }
  function matchesDirectory(member, config = {}) {
    const org = norm(config.org || 'all');
    if (org && org !== 'all' && member.organization !== org) return false;
    if (config.excludeOrg && member.organization === norm(config.excludeOrg)) return false;
    const directory = norm(config.directory || 'leadership');
    if (directory === 'leadership') return true;
    const aliases = (Array.isArray(config.aliases) && config.aliases.length ? config.aliases : targetAliases(directory)).map(norm);
    const targets = member.targets || [];
    const group = member.leadership_group;
    if (member.hasExplicitTargets && targets.some(t => aliases.includes(t))) return true;
    if (group && aliases.includes(group)) return true;
    const text = `${member.name} ${member.role} ${member.seat} ${member.category} ${group} ${targets.join(' ')}`.toLowerCase();
    if (directory === 'bot') return /bot|board|trustee|board_bot/.test(text);
    if (directory === 'mp') return /matron|patron|adviser|advisor|patronage/.test(text);
    if (directory === 'executive') return /national|executive|director|secretary|coordinator|natexco|executive_directors/.test(text);
    if (directory === 'state') return /state/.test(text);
    if (directory === 'cwdi') return member.organization === 'cwdi' || /cwdi|confident women/.test(text);
    return targets.some(t => aliases.includes(t));
  }
  function detailsUrl(member) {
    const params = new URLSearchParams();
    if (member.id) params.set('id', member.id);
    params.set('profile', member.profile_slug || member.profile_key || slugify(member.name));
    if (member.profile_slug) params.set('profile_slug', member.profile_slug);
    if (member.slug) params.set('slug', member.slug);
    return `/pages/official-details.html?${params.toString()}`;
  }
  function summaryText(member) { return plain(member.short_info || member.summary) || 'Official profile excerpt will be updated by the APSG admin desk.'; }
  function imageMarkup(member, small) {
    const img = member.image || profileFallback;
    const cls = small ? 'absolute inset-0 h-full w-full object-cover object-top' : 'member-photo';
    return `<img src="${esc(img)}" alt="${esc(member.name)}" class="${cls}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${profileFallback}';">`;
  }
  function renderFeatured() {
    const wrap = qs('#featuredDirectory'); if (!wrap) return;
    wrap.innerHTML = allMembers.slice(0, 3).map(member => `<a href="${detailsUrl(member)}" class="group flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/10 p-3 text-left hover:bg-white/15 transition no-underline"><span class="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-apsgDeep">${imageMarkup(member, true)}</span><span class="min-w-0 flex-1"><span class="block truncate text-sm font-black text-white">${esc(member.name)}</span><span class="block truncate text-xs text-apsgGold font-bold">${esc(member.role)}</span></span><i class="fa-solid fa-arrow-right text-apsgGold opacity-0 group-hover:opacity-100 transition"></i></a>`).join('');
  }
  function renderCards() {
    const grid = qs('#directoryGrid'); if (!grid) return;
    grid.innerHTML = allMembers.map((member, i) => `<article class="directory-card premium-official-card" data-member-card data-index="${i + 1}" data-name="${esc(member.name)}" data-role="${esc(member.role)}" data-category="${esc(norm(member.category))}" data-seat="${esc(member.seat)}" data-state="${esc(member.state)}">
      <div class="member-image-wrap premium-official-photo"><span class="member-index">${i + 1}</span>${member.roles?.length > 1 ? `<span class="board-ribbon">${member.roles.length} linked roles</span>` : `<span class="board-ribbon">${esc(member.seat || labelFor(member.category))}</span>`}${imageMarkup(member, false)}</div>
      <div class="premium-official-body">
        <h3 class="premium-official-name">${esc(member.name)}</h3>
        <p class="premium-official-position">${esc(member.role)}</p>
        <p class="premium-official-excerpt">${esc(summaryText(member))}</p>
        <div class="premium-official-actions no-print"><button type="button" data-profile-index="${i + 1}" class="premium-btn premium-btn-light"><i class="fa-solid fa-eye"></i> Quick View</button><a href="${detailsUrl(member)}" class="premium-btn premium-btn-dark"><i class="fa-solid fa-file-lines"></i> View Dossier</a></div>
      </div>
    </article>`).join('') || `<div class="rounded-3xl border border-apsgGold/25 bg-apsgGold/10 p-8 text-center font-black text-apsgDeep">No published official has been assigned to this page yet. ${esc(currentSource)}</div>`;
  }
  function renderStats(config) {
    const total = allMembers.length;
    const matrons = allMembers.filter(m => /matron/i.test(`${m.category} ${m.role}`)).length;
    const patrons = allMembers.filter(m => /patron|adviser|advisor/i.test(`${m.category} ${m.role}`)).length;
    const executives = allMembers.filter(m => /executive|director|secretary|coordinator/i.test(`${m.category} ${m.role}`)).length;
    [['heroTotal', total], ['totalStat', total], ['heroMatrons', matrons], ['matronStat', matrons], ['heroPatrons', patrons], ['patronStat', patrons], ['executiveStat', executives]].forEach(([id, value]) => { const el = qs('#' + id); if (el) el.textContent = value; });
    const statusLabel = qs('#statusLabel'); if (statusLabel) statusLabel.textContent = currentSource.includes('Supabase') ? 'Live Dashboard' : 'Fallback / Check Setup';
    const sourceStatus = qs('#sourceStatus'); if (sourceStatus) sourceStatus.textContent = currentSource.includes('Supabase') ? currentSource.replace('Supabase table: ', 'Synced from ') : currentSource;
    const pageTitle = qs('#directoryPageTitle'); if (pageTitle && config.title) pageTitle.textContent = config.title;
  }
  function applyFilter() {
    const search = (qs('#directorySearch')?.value || '').trim().toLowerCase();
    let count = 0;
    qsa('[data-member-card]').forEach(card => {
      const haystack = `${card.dataset.name || ''} ${card.dataset.role || ''} ${card.dataset.category || ''} ${card.dataset.seat || ''} ${card.dataset.state || ''}`.toLowerCase();
      const cat = card.dataset.category;
      const matchText = !search || haystack.includes(search);
      const matchFilter = currentFilter === 'all' || cat === currentFilter || (currentFilter === 'board' && ['board', 'bot', 'executive'].includes(cat));
      const show = matchText && matchFilter;
      card.classList.toggle('hidden', !show); if (show) count += 1;
    });
    ['directoryCount', 'visibleBadge'].forEach(id => { const el = qs('#' + id); if (el) el.textContent = `Showing ${count} member${count === 1 ? '' : 's'}`; });
    qs('#noResult')?.classList.toggle('hidden', count !== 0);
  }
  function setFilter(filter) { currentFilter = filter; qsa('[data-filter]').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter)); applyFilter(); }
  function getMember(index) { return allMembers[Number(index) - 1]; }
  function closeModal() { const modal = qs('#directoryModal'); if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('overflow-hidden'); } }
  function openModal(member) {
    if (!member) return; currentMember = member;
    const set = (id, value) => { const el = qs('#' + id); if (el) el.textContent = value || ''; };
    set('modalIndex', allMembers.indexOf(member) + 1); set('modalName', member.name); set('modalRole', member.role); set('modalCategory', labelFor(member.category)); set('modalSeat', member.seat); set('modalSummary', summaryText(member)); set('modalSource', member.source || currentSource);
    const link = qs('#modalDetailsLink'); if (link) link.href = detailsUrl(member);
    const photo = qs('#modalPhoto'); if (photo) { photo.src = member.image || profileFallback; photo.alt = member.name; photo.classList.remove('hidden'); photo.onerror = () => { photo.onerror = null; photo.src = profileFallback; }; }
    const fallback = qs('#modalFallbackLogo'); if (fallback) fallback.src = fallbackLogo;
    const modal = qs('#directoryModal'); if (!modal) return;
    modal.classList.remove('hidden'); modal.classList.add('flex'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('overflow-hidden');
    setTimeout(() => modal.querySelector('[data-close-modal],a,button')?.focus(), 30);
  }
  function buildDirectoryText(config) { return `${config.copyTitle || config.title || 'APSG Directory'}\nSource: ${currentSource}\n\n` + allMembers.map((m, i) => `${i + 1}. ${m.name} - ${m.role}${m.seat ? ' (' + m.seat + ')' : ''}`).join('\n'); }
  function showToast(message) { const t = document.createElement('div'); t.className = 'copy-toast'; t.textContent = message; document.body.appendChild(t); setTimeout(() => t.remove(), 1700); }
  function fallbackCopy(text, done) { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.focus(); t.select(); document.execCommand('copy'); t.remove(); done(); }
  function copyText(text, label) { const done = () => showToast(label || 'Copied'); if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done)); else fallbackCopy(text, done); }
  async function initDirectory() {
    const config = window.APSG_DIRECTORY_CONFIG || { directory: 'leadership', title: 'APSG Leadership Directory' };
    const rows = await fetchRows();
    const matched = rows.filter(m => matchesDirectory(m, config));
    allMembers = groupPublicRows(matched).map((m, i) => ({ ...m, index: i + 1 }));
    renderStats(config); renderFeatured(); renderCards(); applyFilter();
    qs('#directorySearch')?.addEventListener('input', applyFilter);
    qsa('[data-filter]').forEach(btn => btn.addEventListener('click', () => setFilter(btn.dataset.filter)));
    qs('#copyListBtn')?.addEventListener('click', () => copyText(buildDirectoryText(config), 'Directory copied'));
    qs('#copyTopBtn')?.addEventListener('click', () => copyText(buildDirectoryText(config), 'Directory copied'));
    qs('#printBtn')?.addEventListener('click', () => print());
    qs('#gridViewBtn')?.addEventListener('click', () => qs('#directoryShell')?.classList.remove('list-mode'));
    qs('#listViewBtn')?.addEventListener('click', () => qs('#directoryShell')?.classList.add('list-mode'));
    document.addEventListener('click', event => { const profileBtn = event.target.closest('[data-profile-index]'); const close = event.target.closest('[data-close-modal]'); if (profileBtn) { event.stopPropagation(); openModal(getMember(profileBtn.dataset.profileIndex)); } else if (close) closeModal(); });
    qs('#copyMemberBtn')?.addEventListener('click', () => { if (currentMember) copyText(`${currentMember.name}\n${currentMember.role}\n${currentMember.seat}\n${summaryText(currentMember)}\n${location.origin}${detailsUrl(currentMember)}`, 'Profile copied'); });
    qs('#printMemberBtn')?.addEventListener('click', () => print());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }
  function matchDetails(rows, params) {
    const id = params.get('id') || '';
    const profile = params.get('profile') || params.get('profile_slug') || params.get('profile_key') || '';
    const slug = params.get('slug') || '';
    const name = params.get('name') || '';
    const key = slugify(profile || slug || name);
    let selected = null;
    if (id) selected = rows.find(m => String(m.id) === String(id));
    if (!selected && key) selected = rows.find(m => slugify(m.profile_slug || m.profile_key || m.slug || m.name) === key || slugify(m.slug) === key || slugify(m.name) === key);
    if (!selected) return { target: null, roles: [] };
    const identity = identityKey(selected);
    return { target: primaryRecord(rows.filter(m => identityKey(m) === identity)), roles: rows.filter(m => identityKey(m) === identity) };
  }
  function paragraphBlock(text, fallback) {
    const body = plain(text) || fallback;
    return `<p class="mt-4 text-gray-700 leading-relaxed whitespace-pre-line">${esc(body)}</p>`;
  }
  async function initOfficialDetails() {
    const root = qs('#officialDetailsRoot'); if (!root) return;
    root.innerHTML = `<div class="max-w-4xl mx-auto px-4 pt-32 pb-20"><div class="premium-panel rounded-[2rem] p-8 text-center font-black text-apsgDeep">Loading official dossier...</div></div>`;
    const rows = await fetchRows();
    const { target, roles } = matchDetails(rows, new URLSearchParams(location.search));
    if (!target) { root.innerHTML = `<div class="max-w-4xl mx-auto px-4 pt-32 pb-20"><div class="rounded-[2rem] border border-apsgGold/25 bg-apsgGold/10 p-8 text-center"><h1 class="display-font text-3xl font-black text-apsgDeep">Official not found</h1><p class="mt-2 text-gray-600">The requested official does not exist, is not published, or is blocked by RLS.</p><p class="mt-2 text-xs text-gray-500">${esc(currentSource)}</p><a class="official-btn gold mt-5" href="/pages/leadership.html">Back to Leadership</a></div></div>`; return; }
    document.title = `${target.name} | APSG Official Dossier`;
    const img = target.image || profileFallback;
    const bio = target.biography || target.raw?.biography || '';
    const credentials = target.credentials || target.raw?.credentials || '';
    const achievements = target.achievements || target.raw?.achievements || '';
    root.innerHTML = `<section class="directory-hero text-white pt-28 pb-20 md:pt-36 md:pb-24"><div class="luxury-orb -top-28 -left-24"></div><div class="luxury-orb -bottom-20 -right-20"></div><div class="relative z-10 max-w-7xl mx-auto px-4 md:px-6 grid lg:grid-cols-[.9fr_1.1fr] gap-8 items-center"><div class="relative min-h-[26rem] overflow-hidden rounded-[2.25rem] border border-apsgGold/25 bg-apsgDeep shadow-palace"><img src="${esc(img)}" alt="${esc(target.name)}" class="absolute inset-0 h-full w-full object-cover object-top" loading="eager" onerror="this.onerror=null;this.src='${profileFallback}';"><div class="absolute inset-0 bg-gradient-to-t from-black/72 via-black/12 to-transparent"></div><div class="absolute left-6 bottom-6"><span class="official-chip dark"><i class="fa-solid fa-id-card"></i> Official Dossier</span></div></div><div><span class="official-chip dark"><i class="fa-solid ${esc(target.icon)} text-apsgGold"></i>${esc(labelFor(target.category))}</span><h1 class="display-font mt-5 text-4xl md:text-6xl font-black leading-[.95]">${esc(target.name)}</h1><p class="mt-4 text-lg md:text-xl text-white/82 leading-relaxed">${esc(target.role)}</p><p class="mt-3 max-w-2xl text-white/70 leading-relaxed">${esc(summaryText(target))}</p><div class="mt-6 flex flex-wrap gap-3 no-print"><a href="/pages/leadership.html" class="official-btn gold"><i class="fa-solid fa-arrow-left"></i> Back to Leadership</a><button id="copyOfficialDetails" class="official-btn"><i class="fa-solid fa-copy"></i> Copy Profile</button></div></div></div></section><section class="max-w-7xl mx-auto px-4 md:px-6 -mt-12 relative z-20 pb-20"><div class="premium-panel p-5 md:p-8 lg:p-10 grid lg:grid-cols-[.34fr_.66fr] gap-6"><aside class="tool-card p-5 h-fit"><p class="text-xs uppercase tracking-[.22em] text-[#73540c] font-black">Official Metadata</p><div class="mt-4 space-y-3 text-sm">${[['Primary Seat', target.seat], ['Organization', target.organization.toUpperCase()], ['State', target.state || 'National'], ['Profile Key', target.profile_slug], ['Source', target.source || currentSource]].map(([a,b]) => `<div class="stat-card p-4 rounded-2xl"><p class="text-[10px] uppercase tracking-widest text-gray-500 font-black">${esc(a)}</p><p class="mt-1 font-black text-apsgDeep break-words">${esc(b)}</p></div>`).join('')}</div></aside><main class="space-y-6"><section class="chapter-card p-6 md:p-8"><p class="text-xs uppercase tracking-[.26em] text-apsgGold font-black">Short Profile</p><h2 class="display-font mt-2 text-3xl md:text-4xl font-black text-apsgDeep">Official Overview</h2>${paragraphBlock(target.short_info, 'The official card excerpt will be updated by the APSG admin desk.')}</section><section class="chapter-card p-6 md:p-8"><p class="text-xs uppercase tracking-[.26em] text-apsgGold font-black">Credentials</p>${paragraphBlock(credentials, 'Credentials and public service records will be updated by the APSG admin desk.')}</section><section class="chapter-card p-6 md:p-8"><p class="text-xs uppercase tracking-[.26em] text-apsgGold font-black">Biography</p>${paragraphBlock(bio, 'Biography will be updated by the APSG admin desk.')}</section><section class="chapter-card p-6 md:p-8"><p class="text-xs uppercase tracking-[.26em] text-apsgGold font-black">Achievements</p>${paragraphBlock(achievements, 'Achievements and official impact records will be updated by the APSG admin desk.')}</section><section class="chapter-card p-6 md:p-8"><p class="text-xs uppercase tracking-[.26em] text-apsgGold font-black">Linked Roles</p><div class="mt-4 grid gap-3">${roles.map(r => `<article class="rounded-2xl border border-apsgGreen/10 bg-white p-4"><p class="font-black text-apsgDeep">${esc(r.role)}</p><p class="mt-1 text-sm text-gray-600">${esc(labelFor(r.leadership_group || r.category))} • ${esc(r.organization.toUpperCase())}${r.state ? ' • '+esc(r.state) : ''}</p></article>`).join('')}</div></section></main></div></section>`;
    qs('#copyOfficialDetails')?.addEventListener('click', () => copyText(`${target.name}\n${target.role}\n${target.seat}\n${summaryText(target)}`, 'Official profile copied'));
  }
  document.addEventListener('DOMContentLoaded', () => { if (qs('#directoryGrid')) initDirectory(); if (qs('#officialDetailsRoot')) initOfficialDetails(); });
  window.APSG_PUBLIC_OFFICIALS = { fetchRows, fetchAllRows, normalizeMember, isPublished, rowTargets, norm, slugify, targetAliases, matchesDirectory, detailsUrl, summaryText, labelFor, fallbackLogo, groupPublicRows, identityKey, friendlyError };
})();
