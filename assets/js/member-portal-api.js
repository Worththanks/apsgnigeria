/* Shared browser adapter for the scoped member portal Edge Functions. */
(function () {
  'use strict';

  const client = () => window.supabaseClient || window.apsgSupabase || window.APSG_SUPABASE || window.supabaseClientPublic;

  function functionUrl(name) {
    const activeClient = client();
    const base = String(activeClient?.supabaseUrl || '').replace(/\/$/, '');
    if (!base) throw new Error('The member portal service is unavailable.');
    return `${base}/functions/v1/${name}`;
  }

  function requestHeaders(token) {
    const activeClient = client();
    const key = activeClient?.supabaseKey;
    if (!key) throw new Error('The member portal service is unavailable.');
    const headers = { apikey: key };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async function parseResponse(response) {
    let result = {};
    try { result = await response.json(); } catch (_) {}
    if (!response.ok) {
      const error = new Error(result?.message || 'The member portal request could not be completed.');
      error.code = result?.code || `HTTP_${response.status}`;
      error.status = response.status;
      error.member = result?.member || null;
      throw error;
    }
    return result;
  }

  // @spec PORTAL-EDIT-009, PORTAL-LOGIN-002
  async function request(name, options, timeoutMs = 20000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(functionUrl(name), { ...options, signal: controller.signal });
      return await parseResponse(response);
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('The member portal did not respond in time. Please retry.');
        timeoutError.code = 'request_timeout';
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // @spec PORTAL-LOGIN-001, PORTAL-LOGIN-002, PORTAL-EDIT-009
  async function postJson(name, body, token) {
    const headers = requestHeaders(token);
    headers['Content-Type'] = 'application/json';
    return request(name, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      headers,
      body: JSON.stringify(body)
    });
  }

  window.memberPortalApi = Object.freeze({
    verifyMember: (organization, registrationNumber, phone) => postJson('member-session', {
      action: 'verify', organization, registrationNumber, phone
    }),
    refreshMember: (token) => postJson('member-session', { action: 'refresh' }, token),
    updateProfile: (token, fields, revision) => postJson('member-profile-update', {
      fields, revision
    }, token),
    async replacePhoto(token, file, revision, idempotencyKey) {
      const headers = requestHeaders(token);
      headers['Idempotency-Key'] = idempotencyKey;
      headers['x-member-revision'] = revision || '';
      const form = new FormData();
      form.append('photo', file, file.name || 'profile-photo');
      form.append('revision', revision || '');
      return request('member-photo-replace', {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        headers,
        body: form
      }, 45000);
    }
  });
})();
