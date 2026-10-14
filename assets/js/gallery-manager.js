/* =========================================================
   APSG Premium Admin Gallery Manager
   - Role-protected album publishing
   - One-click Google Drive folder import
   - Multiple photo/video/mixed links
   - Album search/filter + premium list rendering
   - Automatic public names: Folder Name 01, Folder Name 02
   ========================================================= */
(function () {
  'use strict';

  const TABLE_ALBUMS = 'gallery_albums';
  const TABLE_MEDIA = 'gallery_media';
  const ALLOWED_ROLES = ['editor', 'admin', 'superadmin'];

  const state = {
    editingId: null,
    albums: [],
    filter: 'all',
    search: '',
    parsedMedia: [],
    folderMedia: [],
    canManage: false,
    role: 'viewer'
  };

  const els = {};

  function $(id) { return document.getElementById(id); }
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function client() { return window.supabaseClient || window.apsgSupabase || window.APSG_SUPABASE || window.supabase || window.APSG?.supabase || null; }
  function loader() { return window.APSGDriveFolderLoader || null; }

  function toast(message, type) {
    const box = $('galleryToast');
    if (!box) return alert(message);
    box.textContent = message;
    box.className = `toast show ${type === 'error' ? 'error' : ''}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { box.className = 'toast'; }, 3400);
  }

  function showAccess(message, type = 'info', title = 'Gallery access') {
    const gate = $('galleryAccessGate');
    if (!gate) return;
    gate.className = `access-gate ${type === 'danger' ? 'danger' : type === 'success' ? 'success' : ''}`;
    gate.innerHTML = `<strong>${esc(title)}</strong><span>${esc(message)}</span>`;
    gate.classList.remove('hidden');
    clearTimeout(showAccess.timer);
    if (type !== 'danger') showAccess.timer = setTimeout(() => gate.classList.add('hidden'), 3600);
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `gallery-${Date.now()}`;
  }

  function padSerial(index) { return String(index + 1).padStart(2, '0'); }
  function folderName() { return clean(els.folderName?.value || els.eventTitle?.value || els.albumTitle?.value || 'APSG Gallery'); }
  function autoTitle(index) { return `${folderName()} ${padSerial(index)}`; }
  function extractDriveId(url) { return loader()?.extractDriveFileId(url) || ''; }
  function thumb(url, size = 'w1000') { const id = extractDriveId(url); return id && loader() ? loader().driveThumb(id, size) : url; }
  function preview(url) { const id = extractDriveId(url); return id && loader() ? loader().drivePreview(id) : url; }

  function guessType(url, fallback) {
    const text = String(url || '').toLowerCase();
    if (fallback === 'video' || fallback === 'image') return fallback;
    if (/\.(mp4|mov|webm|m4v|avi|mkv)(\?|$)/i.test(text)) return 'video';
    if (/\.(jpg|jpeg|png|webp|gif|avif|bmp|svg)(\?|$)/i.test(text)) return 'image';
    if (text.includes('video')) return 'video';
    return 'image';
  }

  function parseLine(line, defaultType) {
    const raw = String(line || '').trim();
    if (!raw) return null;
    const parts = raw.split('|').map(part => part.trim()).filter(Boolean);
    const url = parts[0];
    if (!/^https?:\/\//i.test(url)) return null;
    const maybeType = String(parts[parts.length - 1] || '').toLowerCase();
    const type = guessType(url, ['video', 'image', 'photo'].includes(maybeType) ? (maybeType === 'photo' ? 'image' : maybeType) : defaultType);
    const captionParts = parts.slice(1).filter(part => !['image', 'video', 'photo'].includes(part.toLowerCase()));
    return {
      media_type: type,
      source_url: url,
      drive_file_id: extractDriveId(url) || null,
      thumbnail_url: thumb(url, 'w1000'),
      preview_url: type === 'video' ? preview(url) : thumb(url, 'w1600'),
      caption: captionParts.join(' • '),
      sort_order: 0
    };
  }

  function parseTextarea(value, defaultType) {
    return String(value || '')
      .split(/\n+/)
      .map(line => parseLine(line, defaultType))
      .filter(Boolean);
  }

  function normalizeFolderMedia(media) {
    return (Array.isArray(media) ? media : []).map((item, index) => ({
      media_type: item.media_type === 'video' ? 'video' : 'image',
      source_url: item.source_url,
      drive_file_id: item.drive_file_id || extractDriveId(item.source_url) || null,
      thumbnail_url: item.thumbnail_url || thumb(item.source_url, 'w1000'),
      preview_url: item.preview_url || (item.media_type === 'video' ? preview(item.source_url) : thumb(item.source_url, 'w1600')),
      caption: item.caption || '',
      sort_order: index + 1
    }));
  }

  function parseAllMedia() {
    const imported = normalizeFolderMedia(state.folderMedia);
    const photos = parseTextarea(els.photoLinks?.value, 'image');
    const videos = parseTextarea(els.videoLinks?.value, 'video');
    const mixed = parseTextarea(els.mediaLines?.value, 'image');
    const combined = [...imported, ...photos, ...videos, ...mixed];
    const seen = new Set();

    state.parsedMedia = combined
      .filter(item => {
        const key = item.drive_file_id || item.source_url;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item, index) => ({
        ...item,
        auto_title: autoTitle(index),
        sort_order: index + 1
      }));

    return state.parsedMedia;
  }

  function renderPreview() {
    const wrap = $('mediaPreview');
    const summary = $('mediaUploadSummary');
    const importedSummary = $('folderImportSummary');
    if (!wrap) return;

    const media = parseAllMedia();
    const photos = media.filter(item => item.media_type === 'image').length;
    const videos = media.filter(item => item.media_type === 'video').length;

    if (summary) summary.innerHTML = `<strong>${media.length}</strong> items parsed • <strong>${photos}</strong> photos • <strong>${videos}</strong> videos`;
    if (importedSummary) importedSummary.innerHTML = state.folderMedia.length
      ? `<i class="fa-solid fa-circle-check"></i> ${state.folderMedia.length} files imported from Drive folder and ready to save.`
      : `<i class="fa-brands fa-google-drive"></i> Paste a public folder link and click Import.`;

    if (!media.length) {
      wrap.innerHTML = `<div class="admin-empty" style="grid-column:1/-1"><i class="fa-brands fa-google-drive"></i><strong>No media preview yet</strong><p>Import a Google Drive folder or paste media links to preview automatic public names.</p></div>`;
      return;
    }

    const items = media.slice(0, 100).map((item, index) => `
      <article class="media-preview-card">
        <img src="${esc(item.thumbnail_url)}" alt="${esc(autoTitle(index))}" loading="lazy" onerror="this.src='/assets/images/logo/apsg.png'">
        <span><i class="fa-solid ${item.media_type === 'video' ? 'fa-play' : 'fa-image'}"></i></span>
        <strong>${esc(autoTitle(index))}</strong>
      </article>
    `).join('');
    wrap.innerHTML = items + (media.length > 100 ? `<div class="admin-empty" style="grid-column:1/-1"><strong>+${media.length - 100} more files</strong><p>All files will still be saved.</p></div>` : '');
  }

  function saveDriveKey() {
    const key = String(els.driveApiKey?.value || '').trim();
    if (!key) return toast('Paste your Google Drive API key first.', 'error');
    localStorage.setItem('apsgDriveApiKey', key);
    window.APSG_DRIVE_API_KEY = key;
    toast('Drive API key saved in this browser.');
  }

  async function importFolderMedia() {
    const link = String(els.driveFolderUrl?.value || '').trim();
    const key = String(els.driveApiKey?.value || '').trim() || localStorage.getItem('apsgDriveApiKey') || window.APSG_DRIVE_API_KEY || '';
    const api = loader();
    if (!api) return toast('Google Drive folder loader script is missing.', 'error');
    if (!link) return toast('Paste the Google Drive folder URL first.', 'error');
    if (key) { localStorage.setItem('apsgDriveApiKey', key); window.APSG_DRIVE_API_KEY = key; }

    const btn = $('importFolderBtn');
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importing...'; }
      const media = await api.listGoogleDriveFolder(link, { apiKey: key });
      state.folderMedia = normalizeFolderMedia(media);
      if (!state.folderMedia.length) toast('No images or videos were found in this Drive folder.', 'error');
      else toast(`${state.folderMedia.length} media files imported from folder.`);
      renderPreview();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Could not import Google Drive folder.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-brands fa-google-drive"></i>Import'; }
    }
  }

  async function ensureFolderImportedIfNeeded() {
    const hasManual = String(els.photoLinks?.value || els.videoLinks?.value || els.mediaLines?.value || '').trim();
    const shouldAuto = Boolean(els.autoImportFolder?.checked);
    const hasFolder = String(els.driveFolderUrl?.value || '').trim();
    if (!state.folderMedia.length && !hasManual && shouldAuto && hasFolder) await importFolderMedia();
  }

  function formData() {
    const title = clean(els.albumTitle?.value);
    if (!title) throw new Error('Album title is required.');
    const media = parseAllMedia();
    const cover = clean(els.coverImageUrl?.value) || media.find(m => m.media_type === 'image')?.thumbnail_url || media[0]?.thumbnail_url || '';
    return {
      album: {
        title,
        slug: slugify(els.albumSlug?.value || title),
        event_title: clean(els.eventTitle?.value) || title,
        folder_name: folderName(),
        category: clean(els.albumCategory?.value) || 'Event Gallery',
        description: clean(els.albumDescription?.value),
        venue: clean(els.venue?.value),
        event_date: els.eventDate?.value || null,
        drive_folder_url: clean(els.driveFolderUrl?.value),
        cover_image_url: cover,
        status: els.status?.value || 'draft',
        is_featured: Boolean(els.isFeatured?.checked),
        media_count: media.length,
        photo_count: media.filter(item => item.media_type === 'image').length,
        video_count: media.filter(item => item.media_type === 'video').length,
        updated_at: new Date().toISOString()
      },
      media
    };
  }

  function assertCanManage(action) {
    if (state.canManage) return true;
    toast(`You do not have permission to ${action || 'manage gallery albums'}. Ask a superadmin to grant editor/admin access.`, 'error');
    return false;
  }

  async function saveAlbum(event) {
    event.preventDefault();
    if (!assertCanManage('save gallery albums')) return;
    const db = client();
    if (!db || !db.from) return toast('Supabase client not found.', 'error');
    try {
      els.saveBtn.disabled = true;
      els.saveText.textContent = state.editingId ? 'Updating...' : 'Saving...';
      await ensureFolderImportedIfNeeded();
      const payload = formData();
      let albumId = state.editingId;

      if (state.editingId) {
        const { error } = await db.from(TABLE_ALBUMS).update(payload.album).eq('id', state.editingId);
        if (error) throw error;
        const del = await db.from(TABLE_MEDIA).delete().eq('album_id', state.editingId);
        if (del.error) throw del.error;
      } else {
        payload.album.created_at = new Date().toISOString();
        const { data, error } = await db.from(TABLE_ALBUMS).insert(payload.album).select('id').single();
        if (error) throw error;
        albumId = data.id;
      }

      if (payload.media.length) {
        const rows = payload.media.map((item, index) => ({
          album_id: albumId,
          media_type: item.media_type,
          source_url: item.source_url,
          drive_file_id: item.drive_file_id,
          thumbnail_url: item.thumbnail_url,
          preview_url: item.preview_url,
          auto_title: autoTitle(index),
          caption: item.caption || null,
          sort_order: index + 1
        }));
        const { error } = await db.from(TABLE_MEDIA).insert(rows);
        if (error) throw error;
      }

      toast(state.editingId ? 'Gallery album updated successfully.' : 'Gallery album saved successfully.');
      resetForm();
      await loadAlbums();
    } catch (error) {
      console.error(error);
      toast(friendlyError(error), 'error');
    } finally {
      els.saveBtn.disabled = false;
      els.saveText.textContent = state.editingId ? 'Update Album' : 'Save Album';
    }
  }

  function resetForm() {
    state.editingId = null;
    state.folderMedia = [];
    els.form?.reset();
    if (els.albumCategory) els.albumCategory.value = 'Event Gallery';
    if (els.status) els.status.value = 'published';
    if (els.autoImportFolder) els.autoImportFolder.checked = true;
    if (els.driveApiKey) els.driveApiKey.value = localStorage.getItem('apsgDriveApiKey') || window.APSG_DRIVE_API_KEY || '';
    if (els.saveText) els.saveText.textContent = 'Save Album';
    renderPreview();
  }

  async function loadAlbums() {
    const db = client();
    const list = $('galleryAlbumList');
    if (!db || !db.from) { if (list) list.innerHTML = '<div class="admin-empty"><strong>Supabase client not found</strong></div>'; return; }
    if (list) list.innerHTML = '<div class="admin-loading">Loading albums...</div>';
    try {
      const { data, error } = await db.from(TABLE_ALBUMS).select('*, gallery_media(*)').order('created_at', { ascending: false });
      if (error) throw error;
      state.albums = Array.isArray(data) ? data : [];
      renderStats();
      renderAlbumList();
    } catch (error) {
      console.error(error);
      if (list) list.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-triangle-exclamation"></i><strong>Could not load albums</strong><p>${esc(friendlyError(error))}</p></div>`;
    }
  }

  function renderStats() {
    const media = state.albums.flatMap(album => album.gallery_media || []);
    const stats = {
      albums: state.albums.length,
      published: state.albums.filter(a => a.status === 'published').length,
      photos: state.albums.reduce((s, a) => s + Number(a.photo_count || 0), 0) || media.filter(m => m.media_type === 'image').length,
      videos: state.albums.reduce((s, a) => s + Number(a.video_count || 0), 0) || media.filter(m => m.media_type === 'video').length
    };
    Object.entries(stats).forEach(([key, value]) => {
      document.querySelectorAll(`[data-admin-gallery-stat="${key}"]`).forEach(node => { node.textContent = Number(value || 0).toLocaleString(); });
    });
  }

  function albumMatches(album) {
    const matchesStatus = state.filter === 'all' || album.status === state.filter;
    const q = state.search.toLowerCase();
    const text = `${album.title || ''} ${album.event_title || ''} ${album.category || ''} ${album.venue || ''} ${album.description || ''}`.toLowerCase();
    return matchesStatus && (!q || text.includes(q));
  }

  function renderAlbumList() {
    const list = $('galleryAlbumList');
    if (!list) return;
    const filtered = state.albums.filter(albumMatches);
    if (!filtered.length) {
      list.innerHTML = `<div class="admin-empty"><i class="fa-solid fa-folder-open"></i><strong>No album found</strong><p>Create or publish an album to manage it here.</p></div>`;
      return;
    }

    list.innerHTML = filtered.map(album => {
      const media = Array.isArray(album.gallery_media) ? album.gallery_media : [];
      const cover = album.cover_image_url || media.find(m => m.media_type === 'image')?.thumbnail_url || media[0]?.thumbnail_url || '';
      const photos = Number(album.photo_count ?? media.filter(m => m.media_type === 'image').length);
      const videos = Number(album.video_count ?? media.filter(m => m.media_type === 'video').length);
      return `
        <article class="admin-album-row">
          <div class="admin-album-thumb">${cover ? `<img src="${esc(cover)}" alt="${esc(album.title)}" loading="lazy" onerror="this.style.display='none'">` : '<i class="fa-solid fa-images"></i>'}</div>
          <div class="admin-album-main">
            <strong>${esc(album.title)}</strong>
            <p>${esc(album.description || 'No description yet.')}</p>
            <div class="admin-album-meta">
              <span class="admin-status ${esc(album.status || 'draft')}">${esc(album.status || 'draft')}</span>
              <span><i class="fa-solid fa-image"></i>${photos}</span>
              <span><i class="fa-solid fa-video"></i>${videos}</span>
              ${album.drive_folder_url ? '<span><i class="fa-brands fa-google-drive"></i>Folder</span>' : ''}
              ${album.is_featured ? '<span><i class="fa-solid fa-star"></i>Featured</span>' : ''}
            </div>
          </div>
          <div class="admin-album-actions">
            <button class="admin-icon-btn view" title="View" data-view="${esc(album.slug || album.id)}"><i class="fa-solid fa-eye"></i></button>
            <button class="admin-icon-btn edit" title="Edit" data-edit="${esc(album.id)}"><i class="fa-solid fa-pen"></i></button>
            <button class="admin-icon-btn import" title="Re-import folder" data-reimport="${esc(album.id)}"><i class="fa-brands fa-google-drive"></i></button>
            <button class="admin-icon-btn delete" title="Delete" data-delete="${esc(album.id)}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </article>`;
    }).join('');

    list.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => editAlbum(btn.dataset.edit)));
    list.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => deleteAlbum(btn.dataset.delete)));
    list.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => window.open(`/pages/gallery.html#${slugify(btn.dataset.view)}`, '_blank', 'noopener')));
    list.querySelectorAll('[data-reimport]').forEach(btn => btn.addEventListener('click', () => reimportAlbum(btn.dataset.reimport)));
  }

  function editAlbum(id) {
    const album = state.albums.find(item => String(item.id) === String(id));
    if (!album) return;
    state.editingId = album.id;
    state.folderMedia = [];
    els.albumTitle.value = album.title || '';
    els.albumSlug.value = album.slug || '';
    els.eventTitle.value = album.event_title || '';
    els.folderName.value = album.folder_name || album.event_title || album.title || '';
    els.albumCategory.value = album.category || 'Event Gallery';
    els.eventDate.value = album.event_date || '';
    els.venue.value = album.venue || '';
    els.albumDescription.value = album.description || '';
    els.driveFolderUrl.value = album.drive_folder_url || '';
    els.coverImageUrl.value = album.cover_image_url || '';
    els.status.value = album.status || 'draft';
    els.isFeatured.checked = Boolean(album.is_featured);
    const media = Array.isArray(album.gallery_media) ? [...album.gallery_media].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)) : [];
    els.photoLinks.value = media.filter(m => m.media_type === 'image').map(m => m.source_url).join('\n');
    els.videoLinks.value = media.filter(m => m.media_type === 'video').map(m => m.source_url).join('\n');
    els.mediaLines.value = '';
    els.saveText.textContent = 'Update Album';
    renderPreview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Editing selected album.');
  }

  async function reimportAlbum(id) {
    if (!assertCanManage('re-import gallery albums')) return;
    const album = state.albums.find(item => String(item.id) === String(id));
    if (!album) return;
    if (!album.drive_folder_url) return toast('This album has no Google Drive folder URL.', 'error');
    if (!confirm('Re-import this Google Drive folder and replace the saved media records?')) return;
    editAlbum(id);
    state.folderMedia = [];
    els.photoLinks.value = '';
    els.videoLinks.value = '';
    els.mediaLines.value = '';
    await importFolderMedia();
    if (state.folderMedia.length) els.form.requestSubmit();
  }

  async function deleteAlbum(id) {
    if (!assertCanManage('delete gallery albums')) return;
    if (!confirm('Delete this gallery album and all media records?')) return;
    const db = client();
    try {
      const { error } = await db.from(TABLE_ALBUMS).delete().eq('id', id);
      if (error) throw error;
      toast('Gallery album deleted.');
      if (state.editingId === id) resetForm();
      await loadAlbums();
    } catch (error) {
      console.error(error);
      toast(friendlyError(error), 'error');
    }
  }

  function setupTabs() {
    document.querySelectorAll('[data-media-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.mediaTab;
        document.querySelectorAll('[data-media-tab]').forEach(x => x.classList.toggle('active', x === btn));
        document.querySelectorAll('[data-media-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.mediaPanel === tab));
      });
    });
  }

  async function resolveGalleryAccess() {
    const db = client();
    let role = 'viewer';
    try {
      const session = (await db?.auth?.getSession?.())?.data?.session;
      if (!session?.user) {
        const redirect = encodeURIComponent(location.pathname + location.search);
        location.href = `/admin/login.html?redirect=${redirect}`;
        return false;
      }
      const email = String(session.user.email || '').toLowerCase();
      const fields = 'id,user_id,email,role,is_active,status';
      let res = await db.from('admin_profiles').select(fields).eq('id', session.user.id).limit(1).maybeSingle();
      if (!res?.data) res = await db.from('admin_profiles').select(fields).eq('user_id', session.user.id).limit(1).maybeSingle();
      if (!res?.data && email) res = await db.from('admin_profiles').select(fields).ilike('email', email).limit(1).maybeSingle();
      if (res?.error) throw res.error;
      const profile = res?.data;
      role = String(profile?.role || 'viewer').toLowerCase();
      const active = profile && profile.is_active !== false && String(profile.status || 'active').toLowerCase() !== 'inactive';
      state.canManage = Boolean(active && ALLOWED_ROLES.includes(role));
      state.role = role;
      setAccessUi(role, state.canManage);
      if (state.canManage) showAccess(`Gallery publishing access verified as ${role}.`, 'success', 'Access verified');
      else showAccess(`This page requires active editor, admin or superadmin access. Current role: ${role}.`, 'danger', 'Gallery blocked');
      return state.canManage;
    } catch (error) {
      console.warn('Gallery access check failed', error);
      state.canManage = false;
      state.role = role;
      setAccessUi(role, false);
      showAccess(friendlyError(error), 'danger', 'Gallery blocked');
      return false;
    }
  }

  function setAccessUi(role, allowed) {
    role = String(role || 'viewer').toLowerCase();
    document.body.dataset.galleryAccess = allowed ? 'granted' : 'blocked';
    const ids = ['saveGalleryBtn', 'publishGalleryBtn', 'importFolderBtn', 'saveDriveKeyBtn', 'clearFolderImportBtn'];
    ids.forEach(id => { const btn = $(id); if (btn) btn.disabled = !allowed; });
    document.querySelectorAll('#galleryForm input,#galleryForm select,#galleryForm textarea').forEach(input => { input.disabled = !allowed; });
  }

  function friendlyError(error) {
    const msg = String(error?.message || error || 'Unknown error.');
    const code = String(error?.code || '');
    if (!navigator.onLine) return 'Network appears offline. Check your connection and refresh.';
    if (code === '42P01' || /relation .* does not exist/i.test(msg)) return 'Gallery tables were not found. Confirm gallery_albums and gallery_media exist in Supabase.';
    if (code === '42501' || /permission denied|row-level security|rls/i.test(msg)) return 'Supabase RLS blocked this action. Confirm the logged-in admin has editor/admin access.';
    if (/duplicate key/i.test(msg)) return 'An album with this slug may already exist. Change the title/slug and try again.';
    return msg;
  }

  function bind() {
    els.form = $('galleryForm');
    els.albumTitle = $('albumTitle');
    els.albumSlug = $('albumSlug');
    els.eventTitle = $('eventTitle');
    els.folderName = $('folderName');
    els.albumCategory = $('albumCategory');
    els.eventDate = $('eventDate');
    els.venue = $('venue');
    els.albumDescription = $('albumDescription');
    els.driveFolderUrl = $('driveFolderUrl');
    els.driveApiKey = $('driveApiKey');
    els.coverImageUrl = $('coverImageUrl');
    els.photoLinks = $('photoLinks');
    els.videoLinks = $('videoLinks');
    els.mediaLines = $('mediaLines');
    els.status = $('status');
    els.isFeatured = $('isFeatured');
    els.autoImportFolder = $('autoImportFolder');
    els.saveBtn = $('saveGalleryBtn');
    els.saveText = $('saveGalleryBtnText');

    if (els.driveApiKey) els.driveApiKey.value = localStorage.getItem('apsgDriveApiKey') || window.APSG_DRIVE_API_KEY || '';
    if (els.autoImportFolder) els.autoImportFolder.checked = true;
    els.form?.addEventListener('submit', saveAlbum);
    $('resetGalleryBtn')?.addEventListener('click', resetForm);
    $('galleryFilter')?.addEventListener('change', event => { state.filter = event.target.value; renderAlbumList(); });
    $('gallerySearchInput')?.addEventListener('input', event => { state.search = event.target.value.trim(); renderAlbumList(); });
    $('saveDriveKeyBtn')?.addEventListener('click', saveDriveKey);
    $('importFolderBtn')?.addEventListener('click', importFolderMedia);
    $('clearFolderImportBtn')?.addEventListener('click', () => { state.folderMedia = []; renderPreview(); toast('Folder import cleared.'); });
    $('publishGalleryBtn')?.addEventListener('click', () => { if (els.status) els.status.value = 'published'; els.form?.requestSubmit(); });

    els.albumTitle?.addEventListener('input', () => {
      if (!els.albumSlug.value.trim()) els.albumSlug.value = slugify(els.albumTitle.value);
      if (!els.folderName.value.trim()) els.folderName.value = els.albumTitle.value;
      renderPreview();
    });
    [els.folderName, els.photoLinks, els.videoLinks, els.mediaLines].forEach(input => input?.addEventListener('input', renderPreview));
    setupTabs();
    renderPreview();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bind();
    await resolveGalleryAccess();
    if (typeof window.checkAuth === 'function') {
      try { await window.checkAuth(); } catch (error) { console.warn(error); }
    }
    await loadAlbums();
  });
})();
