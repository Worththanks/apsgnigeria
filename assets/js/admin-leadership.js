(function () {
  'use strict';

  const fallbackLogo = '/assets/images/logo/apsg.png';
  const officialsTables = window.APSG_OFFICIALS_TABLES || ['apsg_officials', 'officials', 'leadership_officials'];
  const memberTables = window.APSG_MEMBER_TABLES || ['members', 'apsg_members', 'registrations', 'member_registrations', 'profiles'];
  const storageBucket = window.APSG_STORAGE_BUCKET || 'officials';
  const storageFolder = window.APSG_IMAGE_FOLDER || 'officials';

  let officialTable = officialsTables[0];
  let memberTable = '';
  let officials = [];
  let members = [];
  let editingId = null;
  let slugTouched = false;
  let publishTargetsTouched = false;

  const qs = (selector, context = document) => context.querySelector(selector);
  const qsa = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  const levelPositions = {
    bot: ['Director-General', 'Board Chairperson', 'BOT Chairman', 'Board Member', 'National Grand Patron', 'National Patron', 'Grand Patron', 'Grand Matron', 'Matron', 'Patron', 'Adviser'],
    patronage: ['Global Grand Matron', 'National Grand Patron', 'Grand Matron', 'Grand Patron', 'Matron', 'Patron', 'Adviser'],
    national: ['Director-General', 'Deputy Director-General', 'National Chairman', 'National Secretary', 'National General Secretary', 'National Treasurer', 'National Women Leader', 'National Youth Leader', 'National Coordinator', 'Executive Member'],
    state: ['State Coordinator', 'State Chairman', 'State Secretary', 'State Women Leader', 'State Youth Leader', 'State Treasurer', 'State Executive Member'],
    lga: ['LGA Coordinator', 'LGA Chairman', 'LGA Secretary', 'LGA Women Leader', 'LGA Youth Leader', 'LGA Executive Member'],
    ward: ['Ward Coordinator', 'Ward Chairman', 'Ward Secretary', 'Ward Women Leader', 'Ward Youth Leader', 'Ward Executive Member'],
    pu: ['Polling Unit Coordinator', 'Polling Unit Agent', 'Polling Unit Mobiliser'],
    volunteer: ['Volunteer', 'Mobiliser', 'Canvasser', 'Support Team Member']
  };

  const nigeriaStates = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'
  ];

  const stateZones = {
    Abia: 'South East', Adamawa: 'North East', 'Akwa Ibom': 'South South', Anambra: 'South East', Bauchi: 'North East', Bayelsa: 'South South', Benue: 'North Central', Borno: 'North East', 'Cross River': 'South South', Delta: 'South South', Ebonyi: 'South East', Edo: 'South South', Ekiti: 'South West', Enugu: 'South East', FCT: 'North Central', Gombe: 'North East', Imo: 'South East', Jigawa: 'North West', Kaduna: 'North West', Kano: 'North West', Katsina: 'North West', Kebbi: 'North West', Kogi: 'North Central', Kwara: 'North Central', Lagos: 'South West', Nasarawa: 'North Central', Niger: 'North Central', Ogun: 'South West', Ondo: 'South West', Osun: 'South West', Oyo: 'South West', Plateau: 'North Central', Rivers: 'South South', Sokoto: 'North West', Taraba: 'North East', Yobe: 'North East', Zamfara: 'North West'
  };

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeKey(value) {
    return String(value || '').trim().toLowerCase();
  }

  function slugify(value) {
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function pick(row, keys) {
    for (const key of keys) {
      const value = row && row[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  }

  function toArray(value) {
    if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
    if (value === undefined || value === null || value === '') return [];
    if (typeof value === 'string') {
      const cleaned = value.trim();
      if (!cleaned) return [];
      if ((cleaned.startsWith('[') && cleaned.endsWith(']')) || (cleaned.startsWith('{') && cleaned.endsWith('}'))) {
        try {
          const parsed = JSON.parse(cleaned.replace(/^\{/, '[').replace(/\}$/, ']'));
          if (Array.isArray(parsed)) return parsed.map(String).map(v => v.trim()).filter(Boolean);
        } catch (error) {}
      }
      return cleaned.split(/[|,]/).map(v => v.trim()).filter(Boolean);
    }
    return [String(value).trim()].filter(Boolean);
  }

  function canonicalTarget(value) {
    const key = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const aliases = {
      home: 'leadership', main: 'leadership', overview: 'leadership', leadership_page: 'leadership',
      board: 'bot', trustees: 'bot', board_of_trustees: 'bot', board_members: 'bot',
      patronage: 'mp', matrons_patrons: 'mp', patrons_matrons: 'mp', matrons: 'mp', patrons: 'mp',
      nat_exec: 'national_executive', nat_executive: 'national_executive', natexco: 'national_executive', executive: 'national_executive', national: 'national_executive',
      state: 'state_executive', states: 'state_executive', state_exec: 'state_executive'
    };
    return aliases[key] || key;
  }

  function uniqueTargets(values) {
    const result = [];
    toArray(values).forEach(value => {
      const target = canonicalTarget(value);
      if (target && !result.includes(target)) result.push(target);
    });
    return result;
  }

  function defaultTargetsForCategory(category) {
    const key = canonicalTarget(category || 'leadership');
    if (key === 'bot') return ['leadership', 'bot'];
    if (['matron', 'patron', 'adviser', 'mp'].includes(key)) return ['leadership', 'mp'];
    if (key === 'national_executive') return ['leadership', 'national_executive'];
    if (key === 'state_executive') return ['leadership', 'state_executive'];
    return ['leadership'];
  }

  function getPublishTargets() {
    const selected = qsa('[name="publish_targets"]:checked').map(input => input.value);
    return uniqueTargets(selected.length ? selected : ['leadership']);
  }

  function setPublishTargets(targets, markTouched = false) {
    const normalized = uniqueTargets(targets).length ? uniqueTargets(targets) : ['leadership'];
    qsa('[name="publish_targets"]').forEach(input => {
      input.checked = normalized.includes(canonicalTarget(input.value));
    });
    if (markTouched) publishTargetsTouched = true;
    updatePublishTargetSummary();
  }

  function targetLabel(target) {
    return {
      leadership: 'Leadership',
      bot: 'BOT',
      mp: 'Matrons/Patrons',
      national_executive: 'NATEXCO',
      state_executive: 'State Executive'
    }[canonicalTarget(target)] || String(target || '').replace(/_/g, ' ');
  }

  function updatePublishTargetSummary() {
    const summary = qs('#publishTargetSummary');
    if (!summary) return;
    const targets = getPublishTargets();
    summary.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${targets.map(targetLabel).join(', ') || 'No page selected'}`;
  }

  function getClient() {
    return window.apsgSupabase || window.supabaseClient || window.supabaseClientPublic || window.supabaseClientAdmin || window.APSG_SUPABASE || window.sb || null;
  }

  async function fetchAllRows(table, orderColumn = 'display_order', chunkSize = 1000) {
    const client = getClient();
    const rows = [];
    let from = 0;
    while (true) {
      let query = client.from(table).select('*').range(from, from + chunkSize - 1);
      if (orderColumn) query = query.order(orderColumn, { ascending: true });
      const response = await query;
      if (response.error) throw response.error;
      const data = Array.isArray(response.data) ? response.data : [];
      rows.push(...data);
      if (data.length < chunkSize) break;
      from += chunkSize;
    }
    return rows;
  }

  function showToast(message, type = 'success') {
    const toast = qs('#leadershipToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.className = 'toast', 2300);
  }

  function setStatus(message) {
    const status = qs('#supabaseStatus');
    if (status) status.textContent = message;
  }

  function setText(selector, value) {
    const element = qs(selector);
    if (element) element.textContent = value;
  }

  function normalizeMember(row) {
    const first = pick(row, ['first_name', 'firstname', 'given_name']);
    const last = pick(row, ['last_name', 'surname', 'family_name']);
    const name = String(pick(row, ['full_name', 'name', 'member_name', 'official_name', 'display_name']) || `${first} ${last}`).trim();
    if (!name) return null;
    return {
      id: row.id || row.member_id || row.user_id || '',
      name,
      state: String(pick(row, ['state', 'state_name', 'residential_state'])).trim(),
      lga: String(pick(row, ['lga', 'lcda', 'local_government', 'local_government_area'])).trim(),
      ward: String(pick(row, ['ward', 'ward_name'])).trim(),
      zone: String(pick(row, ['zone', 'geo_zone', 'political_zone'])).trim(),
      image_url: String(pick(row, ['image_url', 'photo_url', 'avatar_url', 'profile_photo', 'profile_image', 'image', 'photo'])).trim()
    };
  }

  function normalizeOfficial(row, index = 0) {
    const fullName = String(pick(row, ['full_name', 'name', 'member_name', 'official_name', 'title'])).trim();
    const position = String(pick(row, ['position', 'role', 'designation', 'office', 'portfolio'])).trim();
    const imageUrl = String(pick(row, ['image_url', 'image', 'photo_url', 'avatar_url', 'profile_photo'])).trim();
    const status = String(pick(row, ['status', 'visibility', 'publish_status']) || (row.is_published === false ? 'draft' : 'published')).toLowerCase();
    const category = String(pick(row, ['category', 'section']) || 'national_executive').trim();
    const rawTargets = [
      ...toArray(row.publish_targets),
      ...toArray(row.page_targets),
      ...toArray(row.directories),
      ...toArray(row.directory)
    ];
    const publishTargets = uniqueTargets(rawTargets.length ? rawTargets : defaultTargetsForCategory(category));
    return {
      raw: row,
      id: row.id || row.uuid || row.slug || `local-${index}`,
      member_id: row.member_id || '',
      full_name: fullName,
      name: fullName,
      slug: String(pick(row, ['slug']) || slugify(fullName)).trim(),
      level: String(pick(row, ['level', 'scope'])).trim(),
      position,
      role: position,
      category,
      publish_targets: publishTargets,
      page_targets: publishTargets,
      directories: publishTargets,
      directory: publishTargets[0] || 'leadership',
      seat: String(pick(row, ['seat', 'board_seat', 'council', 'group'])).trim(),
      state: String(pick(row, ['state', 'state_name'])).trim(),
      zone: String(pick(row, ['zone', 'geo_zone'])).trim(),
      lga: String(pick(row, ['lga', 'lcda', 'local_government'])).trim(),
      ward: String(pick(row, ['ward', 'ward_name'])).trim(),
      image_url: imageUrl,
      image: imageUrl,
      short_info: String(pick(row, ['short_info', 'summary', 'excerpt', 'description'])).trim(),
      credentials: String(pick(row, ['credentials', 'qualification', 'qualifications'])).trim(),
      biography: String(pick(row, ['biography', 'bio', 'profile', 'profile_html', 'dossier'])).trim(),
      display_order: Number(pick(row, ['display_order', 'sort_order', 'order_no', 'order', 'priority'])) || 999,
      status,
      is_featured: row.is_featured === true || row.featured === true || row.is_featured === 'true',
      is_published: status === 'published' || row.is_published === true
    };
  }

  function populateStates() {
    const state = qs('#state');
    if (!state) return;
    state.innerHTML = '<option value="">National / Not State Specific</option>' + nigeriaStates.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  }

  function setStateValue(value) {
    const select = qs('#state');
    if (!select) return;
    const stateValue = String(value || '').trim();
    if (stateValue && !qsa('option', select).some(option => option.value === stateValue)) {
      select.insertAdjacentHTML('beforeend', `<option value="${esc(stateValue)}">${esc(stateValue)}</option>`);
    }
    select.value = stateValue;
    if (!qs('#zone').value) qs('#zone').value = stateZones[stateValue] || '';
  }

  function populatePositions(level, selected = '') {
    const position = qs('#position');
    if (!position) return;
    const options = levelPositions[level] || [];
    position.disabled = !options.length;
    position.innerHTML = '<option value="">Select Designation</option>' + options.map(role => `<option value="${esc(role)}">${esc(role)}</option>`).join('');
    if (selected && !options.includes(selected)) {
      position.insertAdjacentHTML('beforeend', `<option value="${esc(selected)}">${esc(selected)}</option>`);
    }
    position.value = selected || '';
  }

  function suggestCategory(level, position) {
    const category = qs('#category');
    if (!category) return;
    const text = `${level} ${position}`.toLowerCase();
    if (/matron/.test(text)) category.value = 'matron';
    else if (/patron/.test(text)) category.value = 'patron';
    else if (/adviser|advisor/.test(text)) category.value = 'adviser';
    else if (level === 'bot') category.value = 'bot';
    else if (level === 'state') category.value = 'state_executive';
    else if (level === 'national') category.value = 'national_executive';
    if (!publishTargetsTouched) setPublishTargets(defaultTargetsForCategory(category.value));
  }

  function fillMember(member) {
    if (!member) return;
    qs('#full_name').value = member.name || '';
    if (!slugTouched || !qs('#slug').value) qs('#slug').value = slugify(member.name);
    setStateValue(member.state);
    qs('#lga').value = member.lga || '';
    qs('#ward').value = member.ward || '';
    qs('#zone').value = member.zone || stateZones[member.state] || qs('#zone').value || '';
    if (member.image_url) {
      qs('#image_url').value = member.image_url;
      updatePreview(member.image_url);
    }
    showToast('Member details auto-filled');
  }

  async function loadMembers() {
    const client = getClient();
    const badge = qs('#memberLoadBadge');
    const datalist = qs('#memberOptions');
    if (!client || typeof client.from !== 'function') {
      if (badge) badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Supabase not connected';
      return;
    }

    for (const table of memberTables) {
      try {
        const rows = await fetchAllRows(table, null, 1000);
        const normalized = rows.map(normalizeMember).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
        if (normalized.length) {
          members = normalized;
          memberTable = table;
          if (datalist) {
            datalist.innerHTML = members.map(member => `<option value="${esc(member.name)}" data-id="${esc(member.id)}"></option>`).join('');
          }
          if (badge) badge.innerHTML = `<i class="fa-solid fa-database"></i> ${members.length} members loaded`;
          const help = qs('#memberPickerHelp');
          if (help) help.textContent = `Names loaded from Supabase table: ${table}`;
          return;
        }
      } catch (error) {
        console.warn('Member table skipped:', table, error);
      }
    }

    if (badge) badge.innerHTML = '<i class="fa-solid fa-circle-info"></i> No member table found';
  }

  async function loadOfficials() {
    const client = getClient();
    if (!client || typeof client.from !== 'function') {
      officials = [];
      setStatus('Supabase client not detected. Connect /assets/js/supabase-clients.js first.');
      renderOfficials();
      return;
    }

    setStatus('Loading officials from Supabase...');
    for (const table of officialsTables) {
      try {
        const rows = await fetchAllRows(table, 'display_order', 1000);
        officials = rows.map(normalizeOfficial).sort((a, b) => Number(a.display_order) - Number(b.display_order));
        officialTable = table;
        setStatus(`Live Supabase table: ${table} (${officials.length} records)`);
        renderOfficials();
        return;
      } catch (error) {
        console.warn('Official table skipped:', table, error);
      }
    }

    officials = [];
    setStatus('No officials table found. Run the SQL file included in this package.');
    renderOfficials();
  }

  function filteredOfficials() {
    const search = normalizeKey(qs('#officialSearch')?.value || '');
    const filter = canonicalTarget(qs('#officialFilter')?.value || 'all');
    return officials.filter(item => {
      const targets = uniqueTargets(item.publish_targets || item.directories || item.directory);
      const haystack = normalizeKey(`${item.full_name} ${item.position} ${item.category} ${item.state} ${item.lga} ${item.ward} ${item.seat} ${targets.join(' ')}`);
      const filterMatch = filter === 'all' || item.status === filter || canonicalTarget(item.category) === filter || targets.includes(filter);
      return (!search || haystack.includes(search)) && filterMatch;
    });
  }

  function renderStats() {
    const published = officials.filter(item => item.status === 'published' && item.full_name);
    const hasTarget = (item, target) => uniqueTargets(item.publish_targets || item.directories || item.directory).includes(target);
    const patronage = published.filter(item => hasTarget(item, 'mp')).length;
    const natexco = published.filter(item => hasTarget(item, 'national_executive')).length;
    const states = published.filter(item => hasTarget(item, 'state_executive')).length;

    const values = {
      statTotalOfficials: officials.length,
      statPublishedOfficials: published.length,
      statPatronageOfficials: patronage,
      statExecOfficials: natexco + states,
      statLeadership: published.filter(item => hasTarget(item, 'leadership')).length,
      statPatronage: patronage,
      statNatExec: natexco,
      statStateExec: states
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = qs(`#${id}`);
      if (element) element.textContent = value;
    });
  }

  function renderOfficials() {
    renderStats();
    const list = qs('#officialList');
    if (!list) return;
    const rows = filteredOfficials();
    list.innerHTML = rows.length ? rows.map(renderOfficialCard).join('') : '<div class="official-empty">No matching official record found.</div>';
  }

  function renderOfficialCard(item) {
    const image = item.image_url || fallbackLogo;
    const statusClass = item.status === 'draft' ? 'draft' : '';
    const featured = item.is_featured ? '<span class="featured">Featured</span>' : '';
    const targets = uniqueTargets(item.publish_targets || item.directories || item.directory);
    const targetBadges = targets.map(target => `<span class="publish-badge">${esc(targetLabel(target))}</span>`).join('');
    const detailsUrl = `/pages/official-details.html?id=${encodeURIComponent(item.id)}&slug=${encodeURIComponent(item.slug || '')}`;

    return `
      <article class="official-row" data-official-id="${esc(item.id)}">
        <div class="official-row-thumb">
          <span>${esc((item.full_name || 'A').slice(0, 1).toUpperCase())}</span>
          <img src="${esc(image)}" alt="${esc(item.full_name)}" loading="lazy" onerror="this.src='${fallbackLogo}'">
        </div>
        <div class="official-row-body">
          <h3 class="official-row-title">${esc(item.full_name || 'Unnamed Official')}</h3>
          <p class="official-row-role">${esc(item.position || 'Official')}</p>
          ${item.short_info ? `<p class="official-row-excerpt">${esc(item.short_info)}</p>` : ''}
          <div class="official-row-meta">
            <span class="${statusClass}">${esc(item.status || 'published')}</span>
            <span>${esc(String(item.category || 'leadership').replace(/_/g, ' '))}</span>
            ${targetBadges}
            ${item.state ? `<span>${esc(item.state)}</span>` : ''}
            ${featured}
          </div>
        </div>
        <div class="official-row-actions">
          <button type="button" class="action-icon edit" title="Edit" data-edit="${esc(item.id)}"><i class="fa-solid fa-pen-to-square"></i></button>
          <a class="action-icon view" title="View" href="${detailsUrl}" target="_blank" rel="noopener"><i class="fa-solid fa-eye"></i></a>
          <button type="button" class="action-icon delete" title="Delete" data-delete="${esc(item.id)}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </article>`;
  }

  function getPayload() {
    const fullName = qs('#full_name').value.trim();
    const position = qs('#position').value.trim();
    const imageUrl = qs('#image_url').value.trim();
    const shortInfo = qs('#short_info').value.trim();
    const status = qs('#status').value || 'published';
    const publishTargets = getPublishTargets();
    return {
      full_name: fullName,
      name: fullName,
      slug: qs('#slug').value.trim() || slugify(fullName),
      level: qs('#level').value,
      position,
      role: position,
      category: qs('#category').value,
      publish_targets: publishTargets,
      page_targets: publishTargets,
      directories: publishTargets,
      directory: publishTargets[0] || 'leadership',
      seat: qs('#seat').value.trim(),
      state: qs('#state').value.trim(),
      zone: qs('#zone').value.trim(),
      lga: qs('#lga').value.trim(),
      ward: qs('#ward').value.trim(),
      image_url: imageUrl,
      image: imageUrl,
      short_info: shortInfo,
      summary: shortInfo,
      credentials: qs('#credentials').value.trim(),
      biography: qs('#biography').value.trim(),
      display_order: Number(qs('#display_order').value) || 999,
      status,
      is_featured: qs('#is_featured').checked,
      is_published: status === 'published',
      updated_at: new Date().toISOString()
    };
  }

  function getMinimalPayload(payload) {
    return {
      full_name: payload.full_name,
      slug: payload.slug,
      level: payload.level,
      position: payload.position,
      category: payload.category,
      publish_targets: payload.publish_targets,
      page_targets: payload.page_targets,
      directories: payload.directories,
      directory: payload.directory,
      seat: payload.seat,
      state: payload.state,
      zone: payload.zone,
      lga: payload.lga,
      ward: payload.ward,
      image_url: payload.image_url,
      short_info: payload.short_info,
      credentials: payload.credentials,
      biography: payload.biography,
      display_order: payload.display_order,
      status: payload.status,
      is_featured: payload.is_featured,
      is_published: payload.is_published,
      updated_at: payload.updated_at
    };
  }

  async function saveOfficial(event) {
    event.preventDefault();
    const client = getClient();
    const payload = getPayload();

    if (!payload.full_name || !payload.position || !payload.short_info) {
      showToast('Full name, position and short info are required', 'error');
      return;
    }
    if (!client || typeof client.from !== 'function') {
      showToast('Supabase client not connected', 'error');
      return;
    }

    const saveBtn = qs('#saveOfficialBtn');
    if (saveBtn) saveBtn.disabled = true;

    try {
      let response;
      if (editingId) response = await client.from(officialTable).update(payload).eq('id', editingId).select();
      else response = await client.from(officialTable).insert({ ...payload, created_at: new Date().toISOString() }).select();

      if (response.error && /column|schema|cache/i.test(response.error.message || '')) {
        const minimal = getMinimalPayload(payload);
        if (editingId) response = await client.from(officialTable).update(minimal).eq('id', editingId).select();
        else response = await client.from(officialTable).insert({ ...minimal, created_at: new Date().toISOString() }).select();
      }

      if (response.error) throw response.error;

      const saved = Array.isArray(response.data) && response.data[0] ? normalizeOfficial(response.data[0]) : null;
      showToast(editingId ? 'Official updated successfully' : 'Official saved successfully');
      const openAfterSave = qs('#open_details_after_save').checked;
      clearForm();
      await loadOfficials();
      if (openAfterSave && saved) window.open(`/pages/official-details.html?id=${encodeURIComponent(saved.id)}&slug=${encodeURIComponent(saved.slug || '')}`, '_blank');
    } catch (error) {
      showToast(`Save failed: ${error.message || error}`, 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function setForm(item) {
    editingId = item.id;
    slugTouched = true;
    publishTargetsTouched = true;
    qs('#id').value = item.id || '';
    qs('#memberPicker').value = '';
    qs('#full_name').value = item.full_name || '';
    qs('#slug').value = item.slug || slugify(item.full_name);
    qs('#level').value = item.level || '';
    populatePositions(item.level || '', item.position || '');
    qs('#category').value = item.category || 'national_executive';
    setPublishTargets(item.publish_targets || item.directories || item.directory || defaultTargetsForCategory(item.category), true);
    qs('#seat').value = item.seat || '';
    setStateValue(item.state || '');
    qs('#zone').value = item.zone || stateZones[item.state] || '';
    qs('#lga').value = item.lga || '';
    qs('#ward').value = item.ward || '';
    qs('#image_url').value = item.image_url || '';
    updatePreview(item.image_url || fallbackLogo);
    qs('#short_info').value = item.short_info || '';
    qs('#credentials').value = item.credentials || '';
    qs('#biography').value = item.biography || '';
    qs('#display_order').value = item.display_order || 999;
    qs('#status').value = item.status || 'published';
    qs('#is_featured').checked = Boolean(item.is_featured);
    qs('#open_details_after_save').checked = false;
    setText('#formTitle', 'Edit Official Record');
    setText('#saveOfficialBtnText', 'Update Official');
    updateShortCount();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearForm() {
    editingId = null;
    slugTouched = false;
    publishTargetsTouched = false;
    qs('#officialForm')?.reset();
    qs('#id').value = '';
    qs('#display_order').value = 999;
    qs('#status').value = 'published';
    setPublishTargets(['leadership']);
    qs('#position').innerHTML = '<option value="">Select Designation</option>';
    qs('#position').disabled = true;
    setText('#formTitle', 'Create / Update Official');
    setText('#saveOfficialBtnText', 'Save Official');
    updatePreview(fallbackLogo);
    updateShortCount();
  }

  async function deleteOfficial(id) {
    const item = officials.find(record => String(record.id) === String(id));
    if (!item) return;
    if (!confirm(`Delete ${item.full_name}? This action cannot be undone.`)) return;
    const client = getClient();
    if (!client || typeof client.from !== 'function') {
      showToast('Supabase client not connected', 'error');
      return;
    }
    try {
      const response = await client.from(officialTable).delete().eq('id', id);
      if (response.error) throw response.error;
      showToast('Official deleted');
      await loadOfficials();
    } catch (error) {
      showToast(`Delete failed: ${error.message || error}`, 'error');
    }
  }

  function loadSample() {
    clearForm();
    qs('#full_name').value = 'Hon. Example Official';
    qs('#slug').value = 'hon-example-official';
    qs('#level').value = 'national';
    populatePositions('national', 'National Coordinator');
    qs('#category').value = 'national_executive';
    setPublishTargets(['leadership', 'national_executive'], true);
    qs('#seat').value = 'National Secretariat';
    setStateValue('Lagos');
    qs('#zone').value = 'South West';
    qs('#short_info').value = 'Provides strategic coordination, mobilisation support and official representation for APSG leadership activities.';
    qs('#credentials').value = 'APSG official leadership record.';
    qs('#biography').value = 'Full official dossier goes here.';
    qs('#display_order').value = 999;
    updateShortCount();
  }

  function updateShortCount() {
    const value = qs('#short_info')?.value || '';
    const count = qs('#shortInfoCount');
    if (count) count.textContent = value.length;
  }

  function updatePreview(url) {
    const image = qs('#officialImagePreview');
    if (!image) return;
    image.src = url || fallbackLogo;
    image.onerror = () => { image.src = fallbackLogo; };
  }

  function sanitizeFileName(value) {
    return slugify(value || 'official') || `official-${Date.now()}`;
  }

  async function uploadImage() {
    const client = getClient();
    const input = qs('#official_image_file');
    const file = input && input.files ? input.files[0] : null;
    if (!client || !client.storage) {
      showToast('Supabase Storage is not connected', 'error');
      return;
    }
    if (!file) {
      showToast('Select an image first', 'error');
      return;
    }

    const button = qs('#uploadImageBtn');
    const help = qs('#imageUploadHelp');
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const base = sanitizeFileName(qs('#slug').value || qs('#full_name').value);
    const path = `${storageFolder}/${base}-${Date.now()}.${extension}`;

    if (button) button.disabled = true;
    if (help) help.textContent = 'Uploading image to Supabase Storage...';

    try {
      const upload = await client.storage.from(storageBucket).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || undefined
      });
      if (upload.error) throw upload.error;
      const publicUrl = client.storage.from(storageBucket).getPublicUrl(path).data.publicUrl;
      qs('#image_url').value = publicUrl;
      updatePreview(publicUrl);
      showToast('Image uploaded successfully');
      if (help) help.textContent = 'Image uploaded. Public URL has been inserted into the Image URL field.';
    } catch (error) {
      showToast(`Image upload failed: ${error.message || error}`, 'error');
      if (help) help.textContent = 'Upload failed. Confirm the Supabase Storage bucket and policy exist.';
    } finally {
      if (button) button.disabled = false;
    }
  }

  function bindEvents() {
    qs('#officialForm')?.addEventListener('submit', saveOfficial);
    qs('#resetOfficialBtn')?.addEventListener('click', clearForm);
    qs('#loadSampleBtn')?.addEventListener('click', loadSample);
    qs('#reloadRecordsBtn')?.addEventListener('click', loadOfficials);
    qs('#refreshOfficialsBtn')?.addEventListener('click', () => { loadMembers(); loadOfficials(); });
    qs('#officialSearch')?.addEventListener('input', renderOfficials);
    qs('#officialFilter')?.addEventListener('change', renderOfficials);
    qsa('[name="publish_targets"]').forEach(input => input.addEventListener('change', () => { publishTargetsTouched = true; updatePublishTargetSummary(); }));
    qs('#selectAllPublishTargets')?.addEventListener('click', () => setPublishTargets(['leadership', 'bot', 'mp', 'national_executive', 'state_executive'], true));
    qs('#clearPublishTargets')?.addEventListener('click', () => setPublishTargets(['leadership'], true));
    qs('#short_info')?.addEventListener('input', updateShortCount);
    qs('#image_url')?.addEventListener('input', event => updatePreview(event.target.value.trim() || fallbackLogo));
    qs('#uploadImageBtn')?.addEventListener('click', uploadImage);
    qs('#clearImageBtn')?.addEventListener('click', () => {
      qs('#image_url').value = '';
      qs('#official_image_file').value = '';
      updatePreview(fallbackLogo);
    });
    qs('#official_image_file')?.addEventListener('change', event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      updatePreview(URL.createObjectURL(file));
    });
    qs('#slug')?.addEventListener('input', () => { slugTouched = true; });
    qs('#full_name')?.addEventListener('input', event => {
      if (!slugTouched || !qs('#slug').value) qs('#slug').value = slugify(event.target.value);
    });
    qs('#level')?.addEventListener('change', event => {
      populatePositions(event.target.value);
      suggestCategory(event.target.value, '');
    });
    qs('#position')?.addEventListener('change', event => suggestCategory(qs('#level').value, event.target.value));
    qs('#category')?.addEventListener('change', event => { if (!publishTargetsTouched) setPublishTargets(defaultTargetsForCategory(event.target.value)); });
    qs('#state')?.addEventListener('change', event => {
      qs('#zone').value = stateZones[event.target.value] || '';
    });
    qs('#memberPicker')?.addEventListener('change', event => {
      const member = members.find(item => normalizeKey(item.name) === normalizeKey(event.target.value));
      fillMember(member);
    });

    document.addEventListener('click', event => {
      const edit = event.target.closest('[data-edit]');
      const del = event.target.closest('[data-delete]');
      if (edit) {
        const item = officials.find(record => String(record.id) === String(edit.dataset.edit));
        if (item) setForm(item);
      }
      if (del) deleteOfficial(del.dataset.delete);
    });
  }

  function init() {
    populateStates();
    const bucketLabel = qs('#bucketNameLabel');
    if (bucketLabel) bucketLabel.textContent = storageBucket;
    bindEvents();
    updateShortCount();
    updatePublishTargetSummary();
    loadMembers();
    loadOfficials();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
