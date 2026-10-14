(function () {
  'use strict';

  const TABLE = window.APSG_CONTENT_TABLE || 'site_content';
  const selectors = {
    form: '#apsgContentForm',
    contentId: '#contentId',
    contentType: '#contentType',
    contentTitle: '#contentTitle',
    contentCategory: '#contentCategory',
    contentExcerpt: '#contentExcerpt',
    contentBody: '#contentBody',
    contentImageUrl: '#contentImageUrl',
    contentVenue: '#contentVenue',
    contentEventDate: '#contentEventDate',
    contentStartTime: '#contentStartTime',
    contentEndTime: '#contentEndTime',
    contentCtaLabel: '#contentCtaLabel',
    contentCtaUrl: '#contentCtaUrl',
    contentFeatured: '#contentFeatured',
    contentStatus: '#contentStatus',
    contentList: '#contentItems',
    contentFilter: '#contentTypeFilter',
    contentSearch: '#contentSearchInput',
    message: '#contentDeskMessage',
    saveBtn: '#contentSaveBtn',
    cancelBtn: '#contentCancelEditBtn',
    reloadBtn: '#contentReloadBtn',
    total: '#contentTotalCount',
    published: '#contentPublishedCount',
    featured: '#contentFeaturedCount',
    slugPreview: '#contentSlugPreview',
    excerptCounter: '#excerptCounter',
    imagePreview: '#contentImagePreview',
    publicPreviewImage: '#publicPreviewImage',
    publicPreviewTitle: '#publicPreviewTitle',
    publicPreviewCategory: '#publicPreviewCategory',
    publicPreviewExcerpt: '#publicPreviewExcerpt',
    previewStatus: '#previewStatus'
  };

  const state = {
    items: [],
    filter: 'blog',
    search: '',
    editingId: null,
    loading: false,
    clientReady: false
  };

  document.addEventListener('DOMContentLoaded', initContentManager);

  async function initContentManager() {
    if (!document.querySelector(selectors.form)) return;

    state.filter = initialFilter();
    bindEvents();
    updateLivePreview();

    const client = await waitForSupabaseClient();
    if (!client) {
      showMessage('error', 'Supabase client is not available. Check /assets/js/supabase-clients.js.');
      renderEmpty('Supabase client not loaded.');
      return;
    }

    window.supabaseClient = client;
    state.clientReady = true;
    await loadContent();
  }

  function bindEvents() {
    $(selectors.form)?.addEventListener('submit', saveContent);

    $(selectors.contentFilter)?.addEventListener('change', event => {
      state.filter = event.target.value || 'all';
      renderList();
    });

    $(selectors.contentSearch)?.addEventListener('input', event => {
      state.search = String(event.target.value || '').trim().toLowerCase();
      renderList();
    });

    $(selectors.cancelBtn)?.addEventListener('click', resetForm);
    $(selectors.reloadBtn)?.addEventListener('click', loadContent);

    [
      selectors.contentTitle,
      selectors.contentCategory,
      selectors.contentExcerpt,
      selectors.contentImageUrl,
      selectors.contentStatus,
      selectors.contentType,
      selectors.contentVenue,
      selectors.contentEventDate,
      selectors.contentStartTime,
      selectors.contentEndTime,
      selectors.contentCtaLabel,
      selectors.contentCtaUrl,
      selectors.contentFeatured
    ].forEach(selector => {
      const el = $(selector);
      if (!el) return;
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', updateLivePreview);
      el.addEventListener('change', updateLivePreview);
    });
  }

  function initialFilter() {
    const selectValue = $(selectors.contentFilter)?.value;
    if (selectValue) return selectValue;
    const pageType = document.querySelector('[data-content-admin-type]')?.dataset?.contentAdminType;
    return pageType || 'all';
  }

  async function waitForSupabaseClient() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const client = window.supabaseClient || window.apsgSupabase || window.APSG_SUPABASE || (window.APSG && window.APSG.supabase);
      if (client && typeof client.from === 'function') return client;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }

  async function loadContent() {
    if (state.loading) return;
    setLoading(true, 'Loading content desk...');

    try {
      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      state.items = normalizeItems(data);
      updateStats();
      renderList();
      showMessage('success', `Content Desk ready. ${state.items.length.toLocaleString()} item${state.items.length === 1 ? '' : 's'} loaded.`);
    } catch (error) {
      console.error('Content Desk load error:', error);
      state.items = [];
      updateStats();
      renderEmpty('Could not load content. Confirm the site_content table, RLS policies, and Supabase schema are deployed.');
      showMessage('error', friendlySupabaseError(error));
    } finally {
      setLoading(false);
    }
  }

  async function saveContent(event) {
    event.preventDefault();
    if (state.loading) return;

    if (!hasPublishingAccess()) {
      showMessage('error', 'Publishing is blocked for this account. Ask a superadmin to enable editor/admin access.');
      return;
    }

    const payload = buildPayload();
    const validation = validatePayload(payload);
    if (!validation.ok) {
      showMessage('error', validation.message);
      focusFirstInvalid(validation.field);
      return;
    }

    const activeId = state.editingId || val(selectors.contentId);
    setLoading(true, activeId ? 'Updating content...' : 'Saving content...');

    try {
      let response;
      const now = new Date().toISOString();
      const savePayload = { ...payload, updated_at: now };

      if (activeId) {
        response = await window.supabaseClient
          .from(TABLE)
          .update(savePayload)
          .eq('id', activeId)
          .select()
          .single();
      } else {
        response = await window.supabaseClient
          .from(TABLE)
          .insert({ ...savePayload, created_at: now })
          .select()
          .single();
      }

      if (response.error) throw response.error;
      showMessage('success', activeId ? 'Content updated successfully.' : 'Content saved successfully.');
      resetForm();
      await loadContent();
    } catch (error) {
      console.error('Content Desk save error:', error);
      showMessage('error', friendlySupabaseError(error));
    } finally {
      setLoading(false);
    }
  }

  function buildPayload() {
    const title = val(selectors.contentTitle);
    const contentType = val(selectors.contentType) || 'blog';
    return {
      content_type: contentType,
      title,
      slug: slugify(title),
      excerpt: nullable(selectors.contentExcerpt),
      body: nullable(selectors.contentBody),
      category: nullable(selectors.contentCategory),
      image_url: nullable(selectors.contentImageUrl),
      venue: nullable(selectors.contentVenue),
      event_date: nullable(selectors.contentEventDate),
      start_time: nullable(selectors.contentStartTime),
      end_time: nullable(selectors.contentEndTime),
      cta_label: nullable(selectors.contentCtaLabel),
      cta_url: nullable(selectors.contentCtaUrl),
      is_featured: Boolean($(selectors.contentFeatured)?.checked),
      status: val(selectors.contentStatus) || 'draft'
    };
  }

  function validatePayload(payload) {
    if (!payload.content_type) return { ok: false, field: selectors.contentType, message: 'Please choose a content type.' };
    if (!payload.title) return { ok: false, field: selectors.contentTitle, message: 'Please enter a title.' };
    if (!payload.excerpt && !payload.body) return { ok: false, field: selectors.contentExcerpt, message: 'Please enter an excerpt or full body/details.' };
    if ((payload.content_type === 'meeting' || payload.content_type === 'event') && !payload.event_date) {
      return { ok: false, field: selectors.contentEventDate, message: 'Please add the meeting/event date.' };
    }
    if (payload.cta_url && !isValidLink(payload.cta_url)) {
      return { ok: false, field: selectors.contentCtaUrl, message: 'CTA URL must start with /, #, http://, https://, mailto:, tel:, or whatsapp:.' };
    }
    if (payload.image_url && !isValidImageReference(payload.image_url)) {
      return { ok: false, field: selectors.contentImageUrl, message: 'Image URL must be a public URL or a project path such as /assets/images/example.jpg.' };
    }
    return { ok: true };
  }

  async function deleteContent(id) {
    if (!hasPublishingAccess()) {
      showMessage('error', 'Delete is blocked for this account. Ask a superadmin to enable editor/admin access.');
      return;
    }
    const item = state.items.find(entry => String(entry.id) === String(id));
    const name = item?.title || 'this content item';
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

    setLoading(true, 'Deleting content...');
    try {
      const { error } = await window.supabaseClient.from(TABLE).delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'Content deleted successfully.');
      await loadContent();
    } catch (error) {
      console.error('Content Desk delete error:', error);
      showMessage('error', friendlySupabaseError(error));
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(id, nextStatus) {
    if (!id || state.loading) return;
    if (!hasPublishingAccess()) {
      showMessage('error', 'Publish/draft actions are blocked for this account. Ask a superadmin to enable editor/admin access.');
      return;
    }
    setLoading(true, nextStatus === 'published' ? 'Publishing content...' : 'Moving content to draft...');
    try {
      const { error } = await window.supabaseClient
        .from(TABLE)
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      showMessage('success', nextStatus === 'published' ? 'Content published.' : 'Content moved to draft.');
      await loadContent();
    } catch (error) {
      console.error('Content Desk status error:', error);
      showMessage('error', friendlySupabaseError(error));
    } finally {
      setLoading(false);
    }
  }

  function editContent(id) {
    const item = state.items.find(entry => String(entry.id) === String(id));
    if (!item) return;

    state.editingId = item.id;
    setVal(selectors.contentId, item.id);
    setVal(selectors.contentType, item.content_type || 'blog');
    setVal(selectors.contentTitle, item.title || '');
    setVal(selectors.contentCategory, item.category || '');
    setVal(selectors.contentExcerpt, item.excerpt || '');
    setVal(selectors.contentBody, item.body || '');
    setVal(selectors.contentImageUrl, item.image_url || '');
    setVal(selectors.contentVenue, item.venue || '');
    setVal(selectors.contentEventDate, normalizeDateInput(item.event_date));
    setVal(selectors.contentStartTime, trimTime(item.start_time));
    setVal(selectors.contentEndTime, trimTime(item.end_time));
    setVal(selectors.contentCtaLabel, item.cta_label || '');
    setVal(selectors.contentCtaUrl, item.cta_url || '');
    setVal(selectors.contentStatus, item.status || 'draft');
    if ($(selectors.contentFeatured)) $(selectors.contentFeatured).checked = Boolean(item.is_featured);
    setText(selectors.slugPreview, item.slug || slugify(item.title || ''));
    if ($(selectors.saveBtn)) $(selectors.saveBtn).innerHTML = '<i class="fas fa-save"></i> Update Content';
    $(selectors.cancelBtn)?.classList.remove('hidden');
    updateLivePreview();
    document.getElementById('contentDesk')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showMessage('success', 'Editing selected content item.');
  }

  function resetForm() {
    state.editingId = null;
    $(selectors.form)?.reset();
    setVal(selectors.contentId, '');
    setText(selectors.slugPreview, 'auto-generated');
    if ($(selectors.saveBtn)) $(selectors.saveBtn).innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Save Content';
    $(selectors.cancelBtn)?.classList.add('hidden');
    updateLivePreview();
  }

  function renderList() {
    const list = $(selectors.contentList);
    if (!list) return;

    const filtered = getFilteredItems();
    if (!filtered.length) {
      const detail = state.search ? `No content matched "${state.search}".` : (state.filter === 'all' ? 'No content has been created yet.' : `No ${typeName(state.filter)} content found.`);
      renderEmpty(detail);
      return;
    }

    list.innerHTML = filtered.map(renderListItem).join('');
    list.querySelectorAll('[data-edit-content]').forEach(btn => btn.addEventListener('click', () => editContent(btn.dataset.editContent)));
    list.querySelectorAll('[data-delete-content]').forEach(btn => btn.addEventListener('click', () => deleteContent(btn.dataset.deleteContent)));
    list.querySelectorAll('[data-publish-content]').forEach(btn => btn.addEventListener('click', () => togglePublish(btn.dataset.publishContent, btn.dataset.status)));
  }

  function getFilteredItems() {
    return state.items.filter(item => {
      const matchesType = state.filter === 'all' || item.content_type === state.filter;
      const haystack = [item.title, item.slug, item.excerpt, item.body, item.category, item.venue, item.status, typeName(item.content_type)]
        .map(value => String(value || '').toLowerCase())
        .join(' ');
      const matchesSearch = !state.search || haystack.includes(state.search);
      return matchesType && matchesSearch;
    });
  }

  function renderListItem(item) {
    const typeLabel = typeName(item.content_type);
    const status = item.status === 'published' ? 'published' : 'draft';
    const nextStatus = status === 'published' ? 'draft' : 'published';
    const date = item.event_date || item.updated_at || item.created_at;
    const image = item.image_url || '';
    const imageHtml = image
      ? `<img src="${escapeAttr(image)}" alt="" loading="lazy" decoding="async" onerror="this.closest('.content-row-thumb').classList.add('is-empty');this.remove();">`
      : '<i class="fas fa-newspaper"></i>';

    return `
      <article class="content-row ${status}">
        <div class="content-row-main">
          <div class="content-row-thumb ${image ? '' : 'is-empty'}">${imageHtml}</div>
          <div class="content-row-body">
            <div class="content-row-tags">
              <span class="content-pill type"><i class="fas ${typeIcon(item.content_type)}"></i>${escapeHtml(typeLabel)}</span>
              <span class="content-pill ${status}">${escapeHtml(status)}</span>
              ${item.is_featured ? '<span class="content-pill featured"><i class="fas fa-star"></i> Featured</span>' : ''}
            </div>
            <h4>${escapeHtml(item.title || 'Untitled')}</h4>
            <p>${escapeHtml(item.excerpt || truncate(stripTags(item.body || ''), 150) || 'No excerpt supplied.')}</p>
            <div class="content-row-meta">
              <span><i class="fas fa-layer-group"></i>${escapeHtml(item.category || 'Uncategorized')}</span>
              <span><i class="fas fa-calendar"></i>${escapeHtml(formatDate(date))}</span>
              ${item.venue ? `<span><i class="fas fa-location-dot"></i>${escapeHtml(item.venue)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="content-row-actions">
          <button type="button" class="content-action publish" data-publish-content="${escapeAttr(item.id)}" data-status="${nextStatus}"><i class="fas ${status === 'published' ? 'fa-eye-slash' : 'fa-bullhorn'}"></i>${status === 'published' ? 'Draft' : 'Publish'}</button>
          <button type="button" class="content-action edit" data-edit-content="${escapeAttr(item.id)}"><i class="fas fa-pen"></i>Edit</button>
          <button type="button" class="content-action delete" data-delete-content="${escapeAttr(item.id)}"><i class="fas fa-trash"></i>Delete</button>
        </div>
      </article>`;
  }

  function renderEmpty(message) {
    const list = $(selectors.contentList);
    if (!list) return;
    list.innerHTML = `
      <div class="content-empty-state">
        <div class="content-empty-icon"><i class="fas fa-folder-open"></i></div>
        <h4>${escapeHtml(message)}</h4>
        <p>Create a news update, meeting notice, or event from the form. Published items appear on the public website automatically.</p>
      </div>`;
  }

  function updateStats() {
    setText(selectors.total, state.items.length.toLocaleString());
    setText(selectors.published, state.items.filter(item => item.status === 'published').length.toLocaleString());
    setText(selectors.featured, state.items.filter(item => item.is_featured).length.toLocaleString());
  }

  function updateLivePreview() {
    const title = val(selectors.contentTitle) || 'Your headline will appear here';
    const category = val(selectors.contentCategory) || 'Category';
    const excerpt = val(selectors.contentExcerpt) || 'Your excerpt will preview here while you type.';
    const status = val(selectors.contentStatus) || 'draft';
    const imageUrl = val(selectors.contentImageUrl) || '/assets/images/logo/apsg.png';

    setText(selectors.slugPreview, title === 'Your headline will appear here' ? 'auto-generated' : slugify(title));
    setText(selectors.publicPreviewTitle, title);
    setText(selectors.publicPreviewExcerpt, excerpt);
    if ($(selectors.publicPreviewCategory)) $(selectors.publicPreviewCategory).innerHTML = `<i class="fas fa-tag"></i>${escapeHtml(category)}`;
    setText(selectors.previewStatus, status === 'published' ? 'Published Preview' : 'Draft Preview');
    setText(selectors.excerptCounter, `${String($(selectors.contentExcerpt)?.value || '').length}/450 characters`);
    [selectors.imagePreview, selectors.publicPreviewImage].forEach(selector => {
      const img = $(selector);
      if (!img) return;
      img.src = imageUrl;
    });
  }

  function setLoading(loading, message) {
    state.loading = loading;
    const saveBtn = $(selectors.saveBtn);
    const reloadBtn = $(selectors.reloadBtn);
    if (saveBtn) saveBtn.disabled = loading;
    if (reloadBtn) reloadBtn.disabled = loading;
    if (loading && message) showMessage('loading', message);
  }

  function showMessage(type, message) {
    const box = $(selectors.message);
    if (!box) return;
    box.className = `content-message ${type}`;
    const icon = type === 'loading'
      ? '<span class="content-spinner"></span>'
      : `<i class="fas ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i>`;
    box.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
    box.classList.remove('hidden');
    if (type !== 'error' && type !== 'loading') {
      clearTimeout(showMessage.timer);
      showMessage.timer = setTimeout(() => box.classList.add('hidden'), 3600);
    }
  }

  function friendlySupabaseError(error) {
    const msg = error?.message || 'Unable to complete content action.';
    const code = String(error?.code || '');
    if (!navigator.onLine) return 'Network appears offline. Check your internet connection and refresh.';
    if (code === '42P01' || /relation .* does not exist/i.test(msg)) return 'The site_content table was not found. Run the Supabase content schema first.';
    if (/duplicate key|unique/i.test(msg)) return 'A content item with this title/slug already exists. Rename the title slightly and try again.';
    if (code === '42501' || /violates row-level security|row-level security|permission denied|rls/i.test(msg)) return 'Supabase blocked this action. Confirm you are logged in and RLS policies allow editor/admin publishing.';
    return msg;
  }

  function hasPublishingAccess() {
    return document.body?.dataset?.publishingAccess !== 'blocked';
  }

  function normalizeItems(data) {
    return (Array.isArray(data) ? data : [])
      .map(item => ({ ...item, content_type: item.content_type || 'blog', status: item.status || 'draft' }))
      .sort((a, b) => sortDate(b) - sortDate(a));
  }

  function sortDate(item) {
    const date = new Date(item.updated_at || item.created_at || item.event_date || 0);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function focusFirstInvalid(selector) {
    const el = $(selector);
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function isValidLink(value) {
    return /^(https?:\/\/|\/|#|mailto:|tel:|whatsapp:)/i.test(String(value || ''));
  }

  function isValidImageReference(value) {
    return /^(https?:\/\/|\/|data:image\/)/i.test(String(value || ''));
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'content-item';
  }

  function typeName(type) {
    return ({ blog: 'News/Blog', meeting: 'Meeting', event: 'Event', all: 'All Content' })[type] || 'Content';
  }

  function typeIcon(type) {
    return ({ blog: 'fa-newspaper', meeting: 'fa-users-line', event: 'fa-calendar-check' })[type] || 'fa-file-lines';
  }

  function formatDate(value) {
    if (!value) return 'No date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No date';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function trimTime(value) {
    return value ? String(value).slice(0, 5) : '';
  }

  function normalizeDateInput(value) {
    return value ? String(value).slice(0, 10) : '';
  }

  function truncate(text, length) {
    const safe = String(text || '').trim();
    return safe.length > length ? safe.slice(0, length).trim() + '...' : safe;
  }

  function stripTags(value) {
    const div = document.createElement('div');
    div.innerHTML = value;
    return div.textContent || div.innerText || '';
  }

  function val(selector) {
    return String($(selector)?.value || '').trim();
  }

  function nullable(selector) {
    const value = val(selector);
    return value || null;
  }

  function setVal(selector, value) {
    const el = $(selector);
    if (el) el.value = value ?? '';
  }

  function setText(selector, value) {
    const el = $(selector);
    if (el) el.textContent = value;
  }

  function $(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }
})();
