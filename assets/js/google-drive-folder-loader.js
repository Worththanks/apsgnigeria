/* =========================================================
   APSG Google Drive Folder Loader
   Lists public images/videos inside one Google Drive folder.

   Requirements:
   - Folder/files must be shared: Anyone with the link can view.
   - For automatic folder listing, provide a restricted Google Drive API key:
     window.APSG_DRIVE_API_KEY = 'YOUR_BROWSER_API_KEY';
   - Restrict the key in Google Cloud by HTTP referrer to your domain.
   ========================================================= */
(function () {
  'use strict';

  const FILE_ID_RE = /[a-zA-Z0-9_-]{20,}/;

  function clean(value) {
    return String(value || '').trim();
  }

  function getApiKey(explicit) {
    if (explicit) return clean(explicit);
    const meta = document.querySelector('meta[name="google-drive-api-key"]');
    return clean(window.APSG_DRIVE_API_KEY || localStorage.getItem('apsgDriveApiKey') || meta?.content || '');
  }

  function extractDriveFileId(url) {
    const text = clean(url);
    if (!text) return '';
    const patterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/uc\?[^\s]*id=([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/thumbnail\?[^\s]*id=([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/
    ];
    for (const re of patterns) {
      const match = text.match(re);
      if (match) return match[1];
    }
    if (!text.includes('/') && FILE_ID_RE.test(text)) return text;
    return '';
  }

  function extractDriveFolderId(url) {
    const text = clean(url);
    if (!text) return '';
    const patterns = [
      /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/folders\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/,
      /folders\/([a-zA-Z0-9_-]+)/
    ];
    for (const re of patterns) {
      const match = text.match(re);
      if (match) return match[1];
    }
    if (!text.includes('/') && FILE_ID_RE.test(text)) return text;
    return '';
  }

  function driveThumb(fileId, size = 'w1600') {
    return fileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=${encodeURIComponent(size)}` : '';
  }

  function drivePreview(fileIdOrUrl) {
    const fileId = extractDriveFileId(fileIdOrUrl);
    return fileId ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview` : clean(fileIdOrUrl);
  }

  function driveView(fileId) {
    return fileId ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view` : '';
  }

  function driveFolderView(folderId) {
    return folderId ? `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}` : '';
  }

  function embeddedFolderView(folderId) {
    return folderId ? `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#grid` : '';
  }

  function guessType(file) {
    const mime = clean(file.mimeType).toLowerCase();
    const name = clean(file.name).toLowerCase();
    if (mime.startsWith('video/') || /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(name)) return 'video';
    return 'image';
  }

  function normalizeDriveFile(file, index) {
    const type = guessType(file);
    const id = file.id;
    const thumb = file.thumbnailLink || driveThumb(id, 'w1600');
    return {
      media_type: type,
      source_url: file.webViewLink || driveView(id),
      drive_file_id: id,
      thumbnail_url: type === 'video' ? (file.thumbnailLink || driveThumb(id, 'w1000')) : thumb,
      preview_url: type === 'video' ? drivePreview(id) : (file.thumbnailLink || driveThumb(id, 'w2000')),
      original_name: file.name || '',
      sort_order: index + 1,
      caption: ''
    };
  }

  async function fetchJsonWithRetry(url, tries = 2) {
    let lastError = null;
    for (let attempt = 0; attempt <= tries; attempt += 1) {
      try {
        const response = await fetch(url);
        const payload = await response.json().catch(() => ({}));
        if (response.ok) return payload;
        const message = payload?.error?.message || 'Google Drive folder import failed.';
        const error = new Error(message);
        error.status = response.status;
        throw error;
      } catch (error) {
        lastError = error;
        if (attempt === tries || (error.status && error.status < 500 && error.status !== 429)) break;
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    throw lastError || new Error('Google Drive folder import failed.');
  }

  function friendlyDriveError(error) {
    const msg = String(error?.message || error || 'Google Drive folder import failed.');
    if (/API key not valid|key/i.test(msg)) return 'Google Drive API key is invalid or restricted incorrectly. Confirm the key and HTTP referrer restrictions.';
    if (/File not found|not found|does not exist/i.test(msg)) return 'Google Drive folder was not found. Confirm the folder link is public and shared as Anyone with the link can view.';
    if (/permission|insufficient/i.test(msg)) return 'Google Drive denied access. Make the folder public: Anyone with the link can view.';
    if (/quota|rate/i.test(msg)) return 'Google Drive API quota or rate limit reached. Try again later or check Google Cloud quota.';
    return msg;
  }

  async function listGoogleDriveFolder(folderUrlOrId, options = {}) {
    const folderId = extractDriveFolderId(folderUrlOrId);
    const apiKey = getApiKey(options.apiKey);

    if (!folderId) {
      throw new Error('Could not read the Google Drive folder ID. Paste a valid folder link.');
    }

    if (!apiKey) {
      throw new Error('Google Drive API key is required for automatic folder import. Add the restricted browser API key in the admin Gallery Drive API field.');
    }

    const files = [];
    let pageToken = '';
    const q = `'${folderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`;
    const fields = 'nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink,webContentLink,createdTime,modifiedTime,size)';

    do {
      const params = new URLSearchParams({
        key: apiKey,
        q,
        fields,
        pageSize: String(options.pageSize || 1000),
        orderBy: options.orderBy || 'name'
      });
      if (pageToken) params.set('pageToken', pageToken);

      let payload;
      try {
        payload = await fetchJsonWithRetry(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, Number(options.retries ?? 2));
      } catch (error) {
        throw new Error(friendlyDriveError(error));
      }

      files.push(...(Array.isArray(payload.files) ? payload.files : []));
      pageToken = payload.nextPageToken || '';
    } while (pageToken);

    return files.map(normalizeDriveFile);
  }

  window.APSGDriveFolderLoader = {
    getApiKey,
    extractDriveFileId,
    extractDriveFolderId,
    driveThumb,
    drivePreview,
    driveView,
    driveFolderView,
    embeddedFolderView,
    friendlyDriveError,
    listGoogleDriveFolder
  };
})();
