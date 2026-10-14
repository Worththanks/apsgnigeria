/* =========================================================
   APSG Premium Gallery Public Renderer
   - Supabase albums grouped by event
   - Optional live Google Drive folder loading when no media rows exist
   - Lightbox + slideshow
   - No file names displayed: Folder/Album name + serial numbers only
   ========================================================= */
(function () {
  'use strict';

  const state = {
    albums: [],
    filteredAlbums: [],
    activeAlbum: null,
    activeMedia: [],
    activeIndex: 0,
    playing: false,
    timer: null,
    slideMs: 4200,
    category: 'all',
    search: ''
  };

  const els = {};

  const icon = {
    image: '<i class="fa-solid fa-image"></i>',
    video: '<i class="fa-solid fa-play"></i>',
    album: '<i class="fa-solid fa-folder-open"></i>'
  };

  function $(selector, root = document) { return root.querySelector(selector); }
  function $all(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function niceDate(value) {
    if (!value) return '';
    const d = new Date(value + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function padSerial(index) { return String(index + 1).padStart(2, '0'); }
  function autoMediaName(album, index) { return `${album.folder_name || album.event_title || album.title || 'APSG Gallery'} ${padSerial(index)}`; }
  function getClient() { return window.supabaseClient || window.apsgSupabase || window.APSG_SUPABASE || window.supabase || window.APSG?.supabase || null; }

  async function waitForClient() {
    for (let i = 0; i < 40; i += 1) {
      const client = getClient();
      if (client && typeof client.from === 'function') return client;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }
  function loader() { return window.APSGDriveFolderLoader || null; }

  function drivePreview(url) {
    const api = loader();
    return api ? api.drivePreview(url) : url;
  }

  function folderEmbedUrl(album) {
    const api = loader();
    const folderId = api?.extractDriveFolderId(album.drive_folder_url || '');
    return folderId ? api.embeddedFolderView(folderId) : '';
  }

  function getMediaImage(media, album) {
    if (!media) return album?.cover_image_url || '';
    return media.thumbnail_url || media.preview_url || media.source_url || album?.cover_image_url || '';
  }

  function albumCover(album) {
    const media = Array.isArray(album.gallery_media) ? album.gallery_media : [];
    return album.cover_image_url || media.find(m => m.media_type === 'image')?.thumbnail_url || media[0]?.thumbnail_url || '';
  }

  function showState(type, title, text) {
    if (!els.app) return;
    const iconName = type === 'loading' ? 'fa-spinner fa-spin' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-folder-open';
    els.app.innerHTML = `<div class="gallery-state"><i class="fa-solid ${iconName}"></i><h3>${esc(title)}</h3><p>${esc(text || '')}</p></div>`;
  }

  function normalizeAlbum(album) {
    const media = Array.isArray(album.gallery_media) ? album.gallery_media : [];
    media.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    media.forEach((item, index) => { item.auto_title = autoMediaName(album, index); });
    album.gallery_media = media;
    album.media_count = Number(album.media_count || media.length || 0);
    album.photo_count = Number(album.photo_count || media.filter(item => item.media_type === 'image').length || 0);
    album.video_count = Number(album.video_count || media.filter(item => item.media_type === 'video').length || 0);
    return album;
  }

  async function fetchAlbums() {
    const client = await waitForClient();
    if (!client || !client.from) throw new Error('Supabase client not found. Confirm /assets/js/supabase-clients.js is loading before gallery-public.js.');
    const { data, error } = await client
      .from('gallery_albums')
      .select('*, gallery_media(*)')
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('event_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (Array.isArray(data) ? data : []).map(normalizeAlbum);
  }

  async function loadFolderMediaForAlbum(album) {
    if (!album || !album.drive_folder_url) return [];
    if (Array.isArray(album.gallery_media) && album.gallery_media.length) return album.gallery_media;
    const api = loader();
    if (!api || !api.getApiKey()) return [];
    const imported = await api.listGoogleDriveFolder(album.drive_folder_url);
    album.gallery_media = imported.map((item, index) => ({
      ...item,
      auto_title: autoMediaName(album, index),
      sort_order: index + 1
    }));
    album.media_count = album.gallery_media.length;
    album.photo_count = album.gallery_media.filter(item => item.media_type === 'image').length;
    album.video_count = album.gallery_media.filter(item => item.media_type === 'video').length;
    updateStats(state.albums);
    return album.gallery_media;
  }

  function updateStats(albums) {
    const media = albums.flatMap(album => album.gallery_media || []);
    const events = new Set(albums.map(a => a.event_title || a.folder_name || a.title).filter(Boolean));
    const stats = {
      albums: albums.length,
      events: events.size,
      photos: albums.reduce((sum, album) => sum + Number(album.photo_count || 0), 0) || media.filter(item => item.media_type === 'image').length,
      videos: albums.reduce((sum, album) => sum + Number(album.video_count || 0), 0) || media.filter(item => item.media_type === 'video').length
    };
    Object.entries(stats).forEach(([key, value]) => {
      $all(`[data-gallery-stat="${key}"]`).forEach(node => { node.textContent = Number(value || 0).toLocaleString(); });
    });
  }

  function categories(albums) {
    const set = new Set(albums.map(a => a.category || a.event_title || 'Event Gallery').filter(Boolean));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }

  function passesFilter(album) {
    const text = `${album.title || ''} ${album.event_title || ''} ${album.category || ''} ${album.venue || ''} ${album.description || ''}`.toLowerCase();
    const matchesSearch = !state.search || text.includes(state.search.toLowerCase());
    const matchesCategory = state.category === 'all' || (album.category || album.event_title || 'Event Gallery') === state.category;
    return matchesSearch && matchesCategory;
  }

  function renderShell() {
    if (!els.app) return;
    const cats = categories(state.albums);
    els.app.innerHTML = `
      <div class="gallery-shell">
        <div class="gallery-toolbar">
          <div>
            <span class="gallery-chip" style="color:#05351f;background:#fff7d6;border-color:rgba(214,169,43,.35)">${icon.album} Event Albums</span>
            <h2 class="display-font mt-3 text-3xl md:text-5xl font-black text-[#05351f] leading-tight">Official APSG Gallery</h2>
            <p class="mt-2 text-gray-600 max-w-2xl">Browse photo and video albums grouped by official events. Media titles are automatically generated from album names and serial numbers.</p>
          </div>
          <div class="gallery-search-wrap"><i class="fa-solid fa-magnifying-glass"></i><input id="gallerySearch" type="search" placeholder="Search albums, events, venue..." value="${esc(state.search)}"></div>
        </div>
        <div class="gallery-toolbar" style="padding-top:.85rem;padding-bottom:.85rem;">
          <div id="galleryFilters" class="gallery-filter-row">${cats.map(cat => `<button class="gallery-filter-chip ${state.category === cat ? 'active' : ''}" data-gallery-category="${esc(cat)}">${cat === 'all' ? 'All Albums' : esc(cat)}</button>`).join('')}</div>
          <button class="gallery-btn light" id="galleryRefresh"><i class="fa-solid fa-rotate-right"></i> Refresh</button>
        </div>
        <div id="galleryFeaturedWrap" class="p-5 md:p-6"></div>
        <div id="galleryAlbumsGrid" class="gallery-albums-grid"></div>
      </div>
      <div id="galleryLightbox" class="gallery-lightbox" aria-modal="true" role="dialog"></div>
    `;

    $('#gallerySearch')?.addEventListener('input', event => { state.search = event.target.value.trim(); renderAlbums(); });
    $('#galleryRefresh')?.addEventListener('click', loadGallery);
    $all('[data-gallery-category]').forEach(btn => btn.addEventListener('click', () => { state.category = btn.dataset.galleryCategory || 'all'; renderShell(); renderAlbums(); }));
  }

  function renderFeatured(albums) {
    const wrap = $('#galleryFeaturedWrap');
    if (!wrap) return;
    const featured = albums.find(a => a.is_featured) || albums[0];
    if (!featured) { wrap.innerHTML = ''; return; }
    const cover = albumCover(featured);
    wrap.innerHTML = `
      <article class="gallery-featured">
        <div class="gallery-featured-media">${cover ? `<img src="${esc(cover)}" alt="${esc(featured.title)}" loading="lazy">` : '<span class="gallery-featured-mark"><i class="fa-solid fa-images"></i></span>'}</div>
        <div class="gallery-featured-body">
          <div class="flex flex-wrap gap-2 mb-4">
            <span class="gallery-count-chip"><i class="fa-solid fa-star"></i>${featured.is_featured ? 'Featured Album' : 'Latest Album'}</span>
            <span class="gallery-count-chip"><i class="fa-solid fa-images"></i>${Number(featured.photo_count || 0)} Photos</span>
            <span class="gallery-count-chip"><i class="fa-solid fa-video"></i>${Number(featured.video_count || 0)} Videos</span>
            ${featured.drive_folder_url ? '<span class="gallery-count-chip"><i class="fa-brands fa-google-drive"></i>Drive Folder</span>' : ''}
          </div>
          <h2>${esc(featured.title)}</h2>
          <p>${esc(featured.description || 'Official APSG event gallery with photos and videos grouped for public viewing.')}</p>
          <div class="mt-5 flex flex-wrap gap-2">
            ${featured.event_date ? `<span class="gallery-count-chip"><i class="fa-solid fa-calendar"></i>${esc(niceDate(featured.event_date))}</span>` : ''}
            ${featured.venue ? `<span class="gallery-count-chip"><i class="fa-solid fa-location-dot"></i>${esc(featured.venue)}</span>` : ''}
          </div>
          <button class="gallery-btn gold mt-6" data-open-album="${esc(featured.id)}"><i class="fa-solid fa-folder-open"></i>Open Album</button>
        </div>
      </article>`;
    wrap.querySelector('[data-open-album]')?.addEventListener('click', () => openAlbum(featured.id));
  }

  function safeImageFallback(img) {
    img.onerror = null;
    img.src = '/assets/images/logo/apsg.png';
    img.style.objectFit = 'contain';
    img.style.padding = '.75rem';
  }

  function renderAlbumCard(album) {
    const cover = albumCover(album);
    return `
      <article class="gallery-album-card" data-open-album="${esc(album.id)}" tabindex="0" role="button">
        <div class="gallery-album-cover">${cover ? `<img src="${esc(cover)}" alt="${esc(album.title)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/images/logo/apsg.png';this.style.objectFit='contain';this.style.padding='.75rem';">` : '<span><i class="fa-solid fa-folder-open"></i></span>'}<div class="gallery-album-overlay"><strong>${esc(album.title)}</strong></div></div>
        <div class="gallery-album-body">
          <div class="gallery-album-meta">
            ${album.event_date ? `<span><i class="fa-solid fa-calendar"></i>${esc(niceDate(album.event_date))}</span>` : ''}
            ${album.venue ? `<span><i class="fa-solid fa-location-dot"></i>${esc(album.venue)}</span>` : ''}
            <span><i class="fa-solid fa-layer-group"></i>${Number(album.media_count || 0)} items</span>
            ${album.drive_folder_url ? '<span><i class="fa-brands fa-google-drive"></i>Folder</span>' : ''}
          </div>
          <p class="gallery-album-desc">${esc(album.description || 'Open this album to view the official APSG photos and videos.')}</p>
        </div>
      </article>`;
  }

  function renderAlbums() {
    state.filteredAlbums = state.albums.filter(passesFilter);
    renderFeatured(state.filteredAlbums);
    const grid = $('#galleryAlbumsGrid');
    if (!grid) return;
    if (!state.filteredAlbums.length) {
      grid.innerHTML = `<div class="gallery-state" style="grid-column:1/-1"><i class="fa-solid fa-folder-open"></i><h3>No matching album</h3><p>Try another search or filter.</p></div>`;
      return;
    }
    grid.innerHTML = state.filteredAlbums.map(renderAlbumCard).join('');
    $all('[data-open-album]', grid).forEach(card => {
      const open = () => openAlbum(card.dataset.openAlbum);
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    });
  }

  async function openAlbum(albumId) {
    const album = state.albums.find(item => String(item.id) === String(albumId));
    if (!album) return;
    state.activeAlbum = album;
    state.activeIndex = 0;

    els.app.innerHTML = `<div class="gallery-state"><i class="fa-solid fa-spinner fa-spin"></i><h3>Opening album</h3><p>Preparing album media.</p></div>`;

    try {
      await loadFolderMediaForAlbum(album);
    } catch (error) {
      console.warn(error);
      album.folderLoadError = error.message || 'Could not load Drive folder automatically.';
    }

    state.activeMedia = album.gallery_media || [];
    renderAlbumView(album);
    location.hash = slugify(album.slug || album.title);
  }

  function renderAlbumView(album) {
    const embed = folderEmbedUrl(album);
    const hasMedia = state.activeMedia.length > 0;
    const section = document.createElement('section');
    section.className = 'gallery-album-view';
    section.innerHTML = `
      <div class="gallery-album-head">
        <div>
          <button class="gallery-btn white mb-5" id="backToAlbums"><i class="fa-solid fa-arrow-left"></i>Back to Albums</button>
          <h2>${esc(album.title)}</h2>
          <p class="mt-3 max-w-3xl">${esc(album.description || 'Official APSG photo and video album.')}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            ${album.event_date ? `<span class="gallery-count-chip"><i class="fa-solid fa-calendar"></i>${esc(niceDate(album.event_date))}</span>` : ''}
            ${album.venue ? `<span class="gallery-count-chip"><i class="fa-solid fa-location-dot"></i>${esc(album.venue)}</span>` : ''}
            <span class="gallery-count-chip"><i class="fa-solid fa-image"></i>${Number(album.photo_count || 0)} Photos</span>
            <span class="gallery-count-chip"><i class="fa-solid fa-video"></i>${Number(album.video_count || 0)} Videos</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 justify-start lg:justify-end">
          <button class="gallery-btn gold" id="startSlideshow" ${hasMedia ? '' : 'disabled'}><i class="fa-solid fa-play"></i>Start Slideshow</button>
          ${album.drive_folder_url ? `<a class="gallery-btn white" href="${esc(album.drive_folder_url)}" target="_blank" rel="noopener"><i class="fa-brands fa-google-drive"></i>Open Drive</a>` : ''}
        </div>
      </div>
      <div class="gallery-media-grid">
        ${hasMedia ? state.activeMedia.map((media, index) => renderMediaCard(media, album, index)).join('') : renderNoMediaFallback(album, embed)}
      </div>`;

    els.app.innerHTML = '';
    els.app.appendChild(section);
    els.app.insertAdjacentHTML('beforeend', '<div id="galleryLightbox" class="gallery-lightbox" aria-modal="true" role="dialog"></div>');
    $('#backToAlbums')?.addEventListener('click', () => { renderShell(); renderAlbums(); });
    $('#startSlideshow')?.addEventListener('click', () => openLightbox(0, true));
    $all('[data-open-media]').forEach(btn => btn.addEventListener('click', () => openLightbox(Number(btn.dataset.openMedia || 0), false)));
  }

  function renderNoMediaFallback(album, embed) {
    if (embed) {
      return `
        <div class="gallery-drive-embed" style="grid-column:1/-1">
          <div class="gallery-drive-embed-head">
            <strong><i class="fa-brands fa-google-drive"></i> Live Google Drive Folder View</strong>
            <span>For premium cards/slideshow, import this folder once from admin gallery.</span>
          </div>
          <iframe src="${esc(embed)}" loading="lazy" title="${esc(album.title)} Google Drive folder"></iframe>
          ${album.folderLoadError ? `<p class="gallery-drive-note">${esc(album.folderLoadError)}</p>` : ''}
        </div>`;
    }
    return `<div class="gallery-state" style="grid-column:1/-1"><i class="fa-solid fa-image"></i><h3>No media in this album</h3><p>Add a public Google Drive folder or import media from the admin gallery dashboard.</p></div>`;
  }

  function renderMediaCard(media, album, index) {
    const title = autoMediaName(album, index);
    const img = getMediaImage(media, album);
    const type = media.media_type === 'video' ? 'video' : 'image';
    return `
      <button class="gallery-media-card" data-open-media="${index}" aria-label="Open ${esc(title)}">
        ${img ? `<img src="${esc(img)}" alt="${esc(title)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/images/logo/apsg.png';this.style.objectFit='contain';this.style.padding='.75rem';">` : ''}
        ${type === 'video' ? '<span class="gallery-video-mark"><i class="fa-solid fa-play"></i></span>' : ''}
        <span class="gallery-media-info"><strong>${esc(title)}</strong><small>${type === 'video' ? 'Video' : 'Photo'} ${padSerial(index)}</small></span>
      </button>`;
  }

  function openLightbox(index, play) {
    if (!state.activeMedia.length) return;
    state.activeIndex = Math.max(0, Math.min(index, state.activeMedia.length - 1));
    state.playing = Boolean(play);
    renderLightbox();
    if (state.playing) startTimer();
  }

  function closeLightbox() { stopTimer(); const box = $('#galleryLightbox'); if (box) box.classList.remove('show'); }
  function nextMedia() { state.activeIndex = (state.activeIndex + 1) % state.activeMedia.length; renderLightbox(); }
  function prevMedia() { state.activeIndex = (state.activeIndex - 1 + state.activeMedia.length) % state.activeMedia.length; renderLightbox(); }
  function startTimer() { stopTimer(); state.playing = true; state.timer = setInterval(nextMedia, state.slideMs); }
  function stopTimer() { if (state.timer) clearInterval(state.timer); state.timer = null; state.playing = false; }
  function togglePlay() { if (state.playing) stopTimer(); else startTimer(); renderLightbox(); }

  function renderLightbox() {
    const box = $('#galleryLightbox');
    if (!box) return;
    const media = state.activeMedia[state.activeIndex];
    const album = state.activeAlbum;
    const title = autoMediaName(album, state.activeIndex);
    const total = state.activeMedia.length;
    const position = `${state.activeIndex + 1} / ${total}`;
    const percent = total ? ((state.activeIndex + 1) / total) * 100 : 0;
    const type = media.media_type === 'video' ? 'video' : 'image';
    const img = getMediaImage(media, album);
    const stage = type === 'video'
      ? `<iframe src="${esc(drivePreview(media.preview_url || media.source_url))}" allow="autoplay; fullscreen" allowfullscreen loading="lazy" title="${esc(title)}"></iframe>`
      : `<img src="${esc(img)}" alt="${esc(title)}">`;

    box.innerHTML = `
      <div class="gallery-lightbox-inner">
        <div class="gallery-lightbox-top"><div class="gallery-lightbox-title"><strong>${esc(title)}</strong><small>${type === 'video' ? 'Video' : 'Photo'} • ${esc(position)}</small></div><div class="gallery-lightbox-nav"><button class="gallery-lightbox-btn" data-lightbox-action="play"><i class="fa-solid ${state.playing ? 'fa-pause' : 'fa-play'}"></i></button><button class="gallery-lightbox-btn" data-lightbox-action="close"><i class="fa-solid fa-xmark"></i></button></div></div>
        <div class="gallery-lightbox-stage">${stage}</div>
        <div class="gallery-lightbox-bottom"><button class="gallery-lightbox-btn" data-lightbox-action="prev"><i class="fa-solid fa-chevron-left"></i></button><div class="gallery-progress"><span style="width:${percent}%"></span></div><button class="gallery-lightbox-btn" data-lightbox-action="next"><i class="fa-solid fa-chevron-right"></i></button></div>
      </div>`;
    box.classList.add('show');
    box.querySelector('[data-lightbox-action="close"]')?.addEventListener('click', closeLightbox);
    box.querySelector('[data-lightbox-action="prev"]')?.addEventListener('click', prevMedia);
    box.querySelector('[data-lightbox-action="next"]')?.addEventListener('click', nextMedia);
    box.querySelector('[data-lightbox-action="play"]')?.addEventListener('click', togglePlay);
    box.addEventListener('click', event => { if (event.target === box) closeLightbox(); }, { once: true });
  }

  async function loadGallery() {
    try {
      showState('loading', 'Loading APSG Gallery', 'Fetching published Google Drive albums from Supabase.');
      state.albums = await fetchAlbums();
      updateStats(state.albums);
      if (!state.albums.length) {
        showState('empty', 'No gallery album yet', 'Publish an album from the admin gallery dashboard to display it here.');
        return;
      }
      renderShell();
      renderAlbums();
      const hash = decodeURIComponent(location.hash.replace('#', '')).trim();
      if (hash) {
        const match = state.albums.find(album => slugify(album.slug || album.title) === hash);
        if (match) setTimeout(() => openAlbum(match.id), 200);
      }
    } catch (error) {
      console.error('Gallery load error:', error);
      showState('error', 'Gallery could not load', error.message || 'Please check Supabase and the gallery schema.');
    }
  }

  document.addEventListener('keydown', event => {
    const box = $('#galleryLightbox');
    if (!box || !box.classList.contains('show')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowRight') nextMedia();
    if (event.key === 'ArrowLeft') prevMedia();
    if (event.key === ' ') { event.preventDefault(); togglePlay(); }
  });

  document.addEventListener('DOMContentLoaded', () => {
    els.app = document.getElementById('galleryApp');
    if (els.app) loadGallery();
  });

  window.APSGGalleryPublic = { loadGallery, openAlbum: id => openAlbum(id), refresh: loadGallery };
})();
