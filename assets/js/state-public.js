
(function () {
  const qs = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const slugify = value => String(value || '').toLowerCase().trim().replace(/federal capital territory|\(fct\)/g, 'fct').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const norm = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const fallbackLogo = window.APSG_LEADERSHIP_LOGO_FALLBACK || '/assets/images/logo/apsg1.png';
  const states = [
    { name: 'Abia', slug: 'abia', zone: 'South East', capital: 'Umuahia' },
    { name: 'Adamawa', slug: 'adamawa', zone: 'North East', capital: 'Yola' },
    { name: 'Akwa Ibom', slug: 'akwa-ibom', zone: 'South South', capital: 'Uyo' },
    { name: 'Anambra', slug: 'anambra', zone: 'South East', capital: 'Awka' },
    { name: 'Bauchi', slug: 'bauchi', zone: 'North East', capital: 'Bauchi' },
    { name: 'Bayelsa', slug: 'bayelsa', zone: 'South South', capital: 'Yenagoa' },
    { name: 'Benue', slug: 'benue', zone: 'North Central', capital: 'Makurdi' },
    { name: 'Borno', slug: 'borno', zone: 'North East', capital: 'Maiduguri' },
    { name: 'Cross River', slug: 'cross-river', zone: 'South South', capital: 'Calabar' },
    { name: 'Delta', slug: 'delta', zone: 'South South', capital: 'Asaba' },
    { name: 'Ebonyi', slug: 'ebonyi', zone: 'South East', capital: 'Abakaliki' },
    { name: 'Edo', slug: 'edo', zone: 'South South', capital: 'Benin City' },
    { name: 'Ekiti', slug: 'ekiti', zone: 'South West', capital: 'Ado-Ekiti' },
    { name: 'Enugu', slug: 'enugu', zone: 'South East', capital: 'Enugu' },
    { name: 'Federal Capital Territory (FCT)', slug: 'fct', zone: 'North Central', capital: 'Abuja' },
    { name: 'Gombe', slug: 'gombe', zone: 'North East', capital: 'Gombe' },
    { name: 'Imo', slug: 'imo', zone: 'South East', capital: 'Owerri' },
    { name: 'Jigawa', slug: 'jigawa', zone: 'North West', capital: 'Dutse' },
    { name: 'Kaduna', slug: 'kaduna', zone: 'North West', capital: 'Kaduna' },
    { name: 'Kano', slug: 'kano', zone: 'North West', capital: 'Kano' },
    { name: 'Katsina', slug: 'katsina', zone: 'North West', capital: 'Katsina' },
    { name: 'Kebbi', slug: 'kebbi', zone: 'North West', capital: 'Birnin Kebbi' },
    { name: 'Kogi', slug: 'kogi', zone: 'North Central', capital: 'Lokoja' },
    { name: 'Kwara', slug: 'kwara', zone: 'North Central', capital: 'Ilorin' },
    { name: 'Lagos', slug: 'lagos', zone: 'South West', capital: 'Ikeja', priority: true, special: '57 LGAs/LCDAs' },
    { name: 'Nasarawa', slug: 'nasarawa', zone: 'North Central', capital: 'Lafia' },
    { name: 'Niger', slug: 'niger', zone: 'North Central', capital: 'Minna' },
    { name: 'Ogun', slug: 'ogun', zone: 'South West', capital: 'Abeokuta', priority: true, special: 'South West expansion focus' },
    { name: 'Ondo', slug: 'ondo', zone: 'South West', capital: 'Akure' },
    { name: 'Osun', slug: 'osun', zone: 'South West', capital: 'Osogbo' },
    { name: 'Oyo', slug: 'oyo', zone: 'South West', capital: 'Ibadan' },
    { name: 'Plateau', slug: 'plateau', zone: 'North Central', capital: 'Jos' },
    { name: 'Rivers', slug: 'rivers', zone: 'South South', capital: 'Port Harcourt' },
    { name: 'Sokoto', slug: 'sokoto', zone: 'North West', capital: 'Sokoto' },
    { name: 'Taraba', slug: 'taraba', zone: 'North East', capital: 'Jalingo' },
    { name: 'Yobe', slug: 'yobe', zone: 'North East', capital: 'Damaturu' },
    { name: 'Zamfara', slug: 'zamfara', zone: 'North West', capital: 'Gusau' }
  ];
  const zoneShort = {'North Central': 'NC', 'North East': 'NE', 'North West': 'NW', 'South East': 'SE', 'South South': 'SS', 'South West': 'SW'};
  const zones = [
    { id: 'north-central', name: 'North Central', icon: 'fa-mountain-sun', summary: 'Federal capital influence, central coordination and cross-regional connection.' },
    { id: 'north-east', name: 'North East', icon: 'fa-sun', summary: 'Resilient chapter building across the North East zone.' },
    { id: 'north-west', name: 'North West', icon: 'fa-people-group', summary: 'High-population mobilisation zone with broad chapter reach.' },
    { id: 'south-east', name: 'South East', icon: 'fa-seedling', summary: 'Progressive participation and chapter growth across the South East.' },
    { id: 'south-south', name: 'South South', icon: 'fa-water', summary: 'Riverine, coastal and economic participation network.' },
    { id: 'south-west', name: 'South West', icon: 'fa-landmark-flag', summary: 'Strategic APSG mobilisation zone with priority Lagos and Ogun chapters.' }
  ].map(zone => ({ ...zone, states: states.filter(state => state.zone === zone.name) }));

  async function getOfficials() {
    if (window.APSG_PUBLIC_OFFICIALS && typeof window.APSG_PUBLIC_OFFICIALS.fetchRows === 'function') return await window.APSG_PUBLIC_OFFICIALS.fetchRows();
    return [];
  }

  function matchesStateOfficial(member, state) {
    const targets = member.targets || [];
    const stateTarget = targets.some(t => ['state', 'states', 'state_executive', 'state_executives', 'state_chapter', 'chapter'].includes(t));
    const explicit = member.hasExplicitTargets;
    const stateText = norm(member.state || member.raw?.state || member.raw?.state_name || '');
    const rowStateMatch = stateText === norm(state.name) || stateText === norm(state.slug) || slugify(stateText) === state.slug;
    if (explicit) return stateTarget && rowStateMatch;
    return rowStateMatch || (/state/.test(`${member.category} ${member.role}`.toLowerCase()) && rowStateMatch);
  }

  function stateDetailsUrl(state) { return `/pages/state-details.html?state=${encodeURIComponent(state.slug)}`; }
  function officialDetailsUrl(member) { return window.APSG_PUBLIC_OFFICIALS ? window.APSG_PUBLIC_OFFICIALS.detailsUrl(member) : `/pages/official-details.html?slug=${encodeURIComponent(member.slug)}`; }

  async function stateCounts() {
    const officials = await getOfficials();
    return Object.fromEntries(states.map(state => [state.slug, officials.filter(member => matchesStateOfficial(member, state)).length]));
  }

  function renderStateDirectory(counts = {}) {
    const zoneNav = qs('#zoneNav');
    const quickFilters = qs('#quickFilters');
    const zonesContainer = qs('#zonesContainer');
    if (!zonesContainer) return;
    if (zoneNav) zoneNav.innerHTML = zones.map(zone => `<a href="#${zone.id}" data-zone-link="${zone.id}" class="zone-link flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-black text-white/82 hover:text-apsgGold transition"><span>${esc(zone.name)}</span><span class="rounded-full bg-white/10 px-2 py-1 text-[10px] text-apsgGold">${zone.states.length}</span></a>`).join('');
    if (quickFilters) quickFilters.innerHTML = `<button type="button" data-filter="all" class="filter-chip active">All Zones</button><button type="button" data-filter="priority" class="filter-chip">Priority</button>${zones.map(zone => `<button type="button" data-filter="${zone.id}" class="filter-chip">${esc(zone.name)}</button>`).join('')}`;
    zonesContainer.innerHTML = zones.map(zone => `
      <section id="${zone.id}" data-zone-section="${zone.id}" class="scroll-mt-32">
        <div class="mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div><p class="text-xs uppercase tracking-[.26em] text-apsgGold font-black">${zone.states.length} Chapters</p><h3 class="display-font text-3xl md:text-4xl font-black text-apsgDeep flex items-center gap-3"><i class="fa-solid ${zone.icon} text-apsgGreen text-2xl"></i>${esc(zone.name)}</h3><p class="mt-2 text-gray-600 leading-relaxed">${esc(zone.summary)}</p></div>
          <span class="official-chip"><i class="fa-solid fa-map-pin"></i>${zone.states.length} States</span>
        </div>
        <div class="chapter-grid grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          ${zone.states.map(state => `<a href="${stateDetailsUrl(state)}" class="chapter-card-link" data-chapter-card data-zone="${zone.id}" data-state="${esc(state.name)}" data-priority="${state.priority ? 'true' : 'false'}" data-zone-name="${esc(zone.name)}"><article class="chapter-card relative overflow-hidden p-5 md:p-6 ${state.priority ? 'ring-2 ring-apsgGold/35' : ''}"><div class="flex items-start justify-between gap-3"><div class="grid h-12 w-12 place-items-center rounded-2xl ${state.priority ? 'bg-apsgGold text-apsgDeep' : 'bg-apsgGreen/10 text-apsgGreen'}"><i class="fa-solid ${state.priority ? 'fa-star' : 'fa-location-dot'}"></i></div><span class="rounded-full ${state.priority ? 'bg-apsgGold/20 text-[#72530b]' : 'bg-gray-100 text-gray-500'} px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em]">${state.priority ? 'Priority' : 'Open'}</span></div><h4 class="mt-5 text-xl font-black text-apsgDeep leading-tight">${esc(state.name)}</h4><p class="mt-2 text-sm text-gray-600">${esc(zone.name)} Chapter</p><div class="mt-4 flex items-center justify-between gap-2"><span class="rounded-full bg-apsgGreen/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-apsgGreen">View Details</span><span class="rounded-full border border-apsgGold/25 bg-apsgGold/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#72530b]">${counts[state.slug] || 0} Exec</span></div></article></a>`).join('')}
        </div>
      </section>`).join('');
    bindStateDirectoryTools();
  }

  function bindStateDirectoryTools() {
    const chapterSearch = qs('#chapterSearch');
    const visibleCount = qs('#visibleCount');
    const resultBadge = qs('#resultBadge');
    const noResults = qs('#noResults');
    const directoryMain = qs('#directoryMain');
    let activeFilter = 'all';
    function updateView() {
      const query = (chapterSearch?.value || '').trim().toLowerCase();
      let visible = 0;
      qsa('[data-zone-section]').forEach(section => {
        let sectionVisible = 0;
        qsa('[data-chapter-card]', section).forEach(card => {
          const hay = `${card.dataset.state || ''} ${card.dataset.zoneName || ''} ${card.dataset.zone || ''}`.toLowerCase();
          const matchesFilter = activeFilter === 'all' || activeFilter === card.dataset.zone || (activeFilter === 'priority' && card.dataset.priority === 'true');
          const matchesText = !query || hay.includes(query);
          const show = matchesFilter && matchesText;
          card.classList.toggle('hidden', !show); if (show) { visible++; sectionVisible++; }
        });
        section.classList.toggle('hidden', sectionVisible === 0);
      });
      if (visibleCount) visibleCount.textContent = `Showing ${visible} chapter${visible === 1 ? '' : 's'}`;
      if (resultBadge) resultBadge.textContent = `${visible} Chapter${visible === 1 ? '' : 's'}`;
      if (noResults) noResults.classList.toggle('hidden', visible > 0);
    }
    chapterSearch?.addEventListener('input', updateView);
    qs('#quickFilters')?.addEventListener('click', event => { const btn = event.target.closest('[data-filter]'); if (!btn) return; activeFilter = btn.dataset.filter; qsa('[data-filter]').forEach(x => x.classList.toggle('active', x === btn)); updateView(); });
    qs('#resetBtn')?.addEventListener('click', () => { if (chapterSearch) chapterSearch.value = ''; activeFilter = 'all'; qsa('[data-filter]').forEach(x => x.classList.toggle('active', x.dataset.filter === 'all')); updateView(); });
    qs('#gridViewBtn')?.addEventListener('click', () => directoryMain?.classList.remove('list-mode'));
    qs('#listViewBtn')?.addEventListener('click', () => directoryMain?.classList.add('list-mode'));
    qs('#copyChapterBtn')?.addEventListener('click', () => copyText('APSG State Chapter Directory\n\n' + zones.map(zone => `${zone.name}\n${zone.states.map(s => `- ${s.name}: ${stateDetailsUrl(s)}`).join('\n')}`).join('\n\n'), 'State directory copied'));
    qs('#downloadJsonBtn')?.addEventListener('click', () => { const blob = new Blob([JSON.stringify({ title: 'APSG State Chapter Directory', zones }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'apsg-state-directory.json'; a.click(); URL.revokeObjectURL(a.href); });
    updateView();
  }

  function showToast(message) { const t = document.createElement('div'); t.className = 'copy-toast'; t.textContent = message; document.body.appendChild(t); setTimeout(() => t.remove(), 1700); }
  function copyText(text, label) { if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast(label)).catch(() => showToast('Copy failed')); else showToast('Copy unavailable'); }

  function getRequestedState() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('state') || params.get('slug') || params.get('chapter') || '';
    const path = window.location.pathname.split('/').pop().replace('.html', '');
    const target = slugify(raw || (path !== 'state-details' ? path : ''));
    return states.find(state => state.slug === target || slugify(state.name) === target) || states.find(state => state.slug === 'lagos');
  }

  function buildRegisterLink(state) { return `/pages/register.html?state=${encodeURIComponent(state.name)}`; }

  async function renderStateDetails() {
    const select = qs('#stateSelect');
    if (!select) return;
    const current = getRequestedState();
    select.innerHTML = '<option value="" class="text-gray-900">Choose a state</option>' + states.map(state => `<option value="${state.slug}" class="text-gray-900" ${state.slug === current.slug ? 'selected' : ''}>${state.name}</option>`).join('');
    select.addEventListener('change', () => { if (!select.value) return; location.href = `/pages/state-details.html?state=${encodeURIComponent(select.value)}`; });
    await renderState(current);
  }

  async function renderState(state) {
    const officials = (await getOfficials()).filter(member => matchesStateOfficial(member, state)).sort((a, b) => Number(a.index) - Number(b.index));
    const titleName = state.slug === 'fct' ? 'FCT Chapter' : `${state.name} State Chapter`;
    document.title = `${titleName} | APSG Nigeria`;
    const set = (id, value) => { const el = qs('#' + id); if (el) el.textContent = value; };
    set('heroTitle', titleName); set('heroSubtitle', `${state.name} belongs to the ${state.zone} geopolitical zone. This page now shows dashboard-published state executives where available.`); set('heroStateName', state.name); set('heroZoneName', state.zone); set('heroZoneShort', zoneShort[state.zone] || 'NG'); set('heroCapital', state.capital); set('heroPriority', state.priority ? 'Priority' : 'Active'); set('printTitle', `APSG ${titleName}`); set('pageStateTitle', titleName); set('pageStateIntro', `${state.special ? state.special + ' • ' : ''}View the APSG profile for ${state.name}, including zone identity, capital desk, mobilisation mandate and published state executives.`); set('metricState', state.name); set('metricZone', state.zone); set('metricCapital', state.capital); set('mandateTitle', `${titleName} Mobilisation Mandate`); set('mandateText', `The APSG ${titleName} supports grassroots mobilisation, member registration, verification, leadership coordination and progressive participation across ${state.name}.`); set('localStructureTitle', state.slug === 'lagos' ? 'LGA / LCDA Coordinators' : 'LGA Coordinators'); set('localStructureText', state.slug === 'lagos' ? 'Drive mobilisation across Lagos LGAs/LCDAs, chapter meetings, member verification and ward-level coordination.' : 'Drive local government mobilisation, chapter meetings, member verification and ward-level coordination.'); set('relatedTitle', `Other ${state.zone} Chapters`); set('ctaTitle', `Be Part of APSG in ${state.name}`); set('ctaText', `Register today and connect with the APSG ${titleName} structure for disciplined grassroots mobilisation and progressive participation.`);
    ['heroRegisterBtn', 'registerBtn'].forEach(id => { const el = qs('#' + id); if (el) el.href = buildRegisterLink(state); });
    const badge = qs('#priorityBadge'); if (badge) badge.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${state.priority ? 'Priority' : 'Active'} Chapter • ${officials.length} Published Executive${officials.length === 1 ? '' : 's'}`;
    const publicApi = window.APSG_PUBLIC_OFFICIALS;
    const grouped = publicApi && typeof publicApi.groupPublicRows === 'function' ? publicApi.groupPublicRows(officials) : officials;
    const grid = qs('#executiveGrid');
    if (grid) {
      grid.classList.add('state-exec-grid-premium');
      grid.innerHTML = grouped.length ? grouped.map((member, index) => `
        <article class="directory-card premium-official-card state-exec-card" data-state-exec-index="${index}" data-name="${esc(member.name)}" data-role="${esc(member.role)}" data-category="${esc(norm(member.category))}" data-seat="${esc(member.seat)}">
          <div class="member-image-wrap premium-official-photo">
            <span class="member-index">${index + 1}</span>
            <span class="board-ribbon">${esc(member.seat || 'State Executive')}</span>
            <img src="${esc(member.image || '/assets/images/placeholders/profile-placeholder.svg')}" alt="${esc(member.name)}" class="member-photo" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/images/placeholders/profile-placeholder.svg';">
          </div>
          <div class="premium-official-body">
            <h3 class="premium-official-name">${esc(member.name)}</h3>
            <p class="premium-official-position">${esc(member.role)}</p>
            <p class="premium-official-excerpt">${esc(publicApi?.summaryText ? publicApi.summaryText(member) : (member.summary || 'Official profile excerpt will be updated by APSG admin.'))}</p>
            <div class="premium-official-actions no-print">
              <button type="button" class="premium-btn premium-btn-light" data-state-exec-open="${index}"><i class="fa-solid fa-eye"></i> Quick View</button>
              <a class="premium-btn premium-btn-dark" href="${officialDetailsUrl(member)}"><i class="fa-solid fa-file-lines"></i> View Dossier</a>
            </div>
          </div>
        </article>`).join('') : fallbackPositions().map(([title, body]) => `<div class="rounded-3xl border border-apsgGreen/10 bg-white/90 p-5 shadow-soft"><div class="flex items-start gap-3"><div class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-apsgDeep text-apsgGold"><i class="fa-solid fa-user-tie"></i></div><div><p class="font-black text-apsgDeep">${title}</p><p class="mt-1 text-sm text-gray-600">${body}</p><p class="mt-3 text-xs font-black uppercase tracking-[.18em] text-apsgGold">To be updated by APSG admin</p></div></div></div>`).join('');
      bindStateExecModal(grouped);
    }
    const related = states.filter(item => item.zone === state.zone && item.slug !== state.slug);
    const relatedWrap = qs('#relatedStates'); if (relatedWrap) relatedWrap.innerHTML = related.map(item => `<a href="${stateDetailsUrl(item)}" class="zone-pill"><i class="fa-solid fa-location-dot text-apsgGold"></i>${esc(item.name)}</a>`).join('');
    qs('#copyStateBtn')?.addEventListener('click', () => copyText(`APSG ${titleName}\nState: ${state.name}\nZone: ${state.zone}\nCapital Desk: ${state.capital}\nPublished executives: ${officials.length}\n${location.origin}${stateDetailsUrl(state)}`, 'State profile copied'));
  }


  function bindStateExecModal(records) {
    const modal = qs('#stateExecQuickModal');
    if (!modal) return;
    const api = window.APSG_PUBLIC_OFFICIALS || {};
    const photo = qs('#stateExecModalPhoto');
    const set = (id, value) => { const el = qs('#' + id); if (el) el.textContent = value || ''; };
    const close = () => { modal.setAttribute('aria-hidden', 'true'); modal.classList.remove('is-open'); document.body.classList.remove('overflow-hidden'); };
    const open = (member) => {
      if (!member) return;
      if (photo) { photo.src = member.image || '/assets/images/placeholders/profile-placeholder.svg'; photo.alt = member.name || 'Executive photo'; photo.onerror = () => { photo.onerror = null; photo.src = '/assets/images/placeholders/profile-placeholder.svg'; }; }
      set('stateExecModalName', member.name);
      set('stateExecModalRole', member.role);
      set('stateExecModalCategory', api.labelFor ? api.labelFor(member.category) : (member.category || 'State Executive'));
      set('stateExecModalSeat', member.seat || 'State Executive');
      set('stateExecModalSummary', api.summaryText ? api.summaryText(member) : (member.summary || 'Official profile excerpt will be updated by APSG admin.'));
      const link = qs('#stateExecModalDossier'); if (link) link.href = officialDetailsUrl(member);
      modal.setAttribute('aria-hidden', 'false'); modal.classList.add('is-open'); document.body.classList.add('overflow-hidden');
      setTimeout(() => modal.querySelector('[data-state-exec-close],a,button')?.focus(), 30);
    };
    qsa('[data-state-exec-open]').forEach(btn => btn.addEventListener('click', () => open(records[Number(btn.dataset.stateExecOpen)])));
    qsa('[data-state-exec-close]', modal).forEach(btn => btn.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  function fallbackPositions() { return [['State Coordinator', 'Overall chapter coordination and mobilisation command.'], ['Deputy State Coordinator', 'Supports operational structure and chapter supervision.'], ['State Secretary', 'Documentation, records, communication and reports.'], ['State Women Coordinator', 'Women mobilisation, inclusion and CWDI alignment.'], ['State Youth Coordinator', 'Youth engagement, digital participation and field mobilisation.'], ['State Media Coordinator', 'Publicity, media desk and information management.']]; }

  document.addEventListener('DOMContentLoaded', async () => {
    if (qs('#zonesContainer')) renderStateDirectory(await stateCounts());
    if (qs('#stateSelect')) renderStateDetails();
    const back = qs('#backTopBtn') || qs('#backToTop');
    if (back) { window.addEventListener('scroll', () => { back.classList.toggle('hidden', window.scrollY < 500); back.classList.toggle('grid', window.scrollY >= 500); }, { passive: true }); back.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' })); }
  });

  window.APSG_STATES = states;
})();
