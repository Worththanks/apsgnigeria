/* APSG admin auth guard: Supabase Auth + admin_profiles role checks. */
(function () {
  'use strict';
  const allowedRoles = ['viewer', 'editor', 'admin', 'superadmin'];
  const roleRank = { viewer: 1, editor: 2, admin: 3, superadmin: 4 };
  const path = location.pathname.toLowerCase();
  const loginPath = '/admin/login.html';
  const pageRules = [
    [/admin-users/, 'admin'],
    [/settings/, 'admin'],
    [/admin-blog|admin-event|admin-meeting|admin-gallery/, 'editor'],
    [/dashboard/, 'viewer'],
    [/members|member-details|edit-member|account-details|admin-leadership|admin-official|official-admin|admin-get-involved|apsg-support-receipts|viewpdf|scan|generator/, 'admin']
  ];
  const requiredRole = (pageRules.find(([rx]) => rx.test(path)) || [null, 'viewer'])[1];
  let cached = null;

  function titleCase(v) { return String(v || '').replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase()); }
  function client() { return window.apsgSupabase || window.supabaseClient || window.supabaseClientPublic || window.APSG_SUPABASE || null; }
  function rank(role) { return roleRank[String(role || '').toLowerCase()] || 0; }
  function hasRole(role, required) { return rank(role) >= rank(required || 'viewer'); }
  function showAccessDenied(message, role) {
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:1.5rem;background:linear-gradient(135deg,#03170d,#05351f 50%,#0f7a3d);font-family:Inter,system-ui,sans-serif;color:#07140e;">
        <section style="width:min(680px,100%);border:1px solid rgba(216,173,52,.36);border-radius:28px;background:rgba(255,255,255,.96);box-shadow:0 34px 110px rgba(0,0,0,.24);padding:2rem;text-align:center;">
          <div style="width:72px;height:72px;margin:0 auto 1rem;border-radius:24px;background:#05351f;color:#d8ad34;display:grid;place-items:center;font-size:34px;">!</div>
          <p style="font-size:.74rem;font-weight:900;letter-spacing:.22em;text-transform:uppercase;color:#9a741a;margin:0 0 .6rem;">Access denied</p>
          <h1 style="margin:0;color:#05351f;font-size:clamp(2rem,6vw,3.2rem);line-height:.95;font-family:Georgia,serif;">Admin permission required</h1>
          <p style="margin:1rem auto 0;max-width:52ch;color:#526158;line-height:1.65;font-weight:650;">${message || 'Your account is signed in but does not have the role required to view this APSG admin desk.'}</p>
          <p style="margin:.85rem 0 0;color:#6b7280;font-size:.9rem;">Current role: <strong>${titleCase(role || 'none')}</strong> · Required: <strong>${titleCase(requiredRole)}</strong></p>
          <div style="margin-top:1.35rem;display:flex;gap:.7rem;justify-content:center;flex-wrap:wrap;">
            <a href="/admin/dashboard.html" style="border-radius:999px;background:#d8ad34;color:#05351f;padding:.85rem 1.1rem;font-weight:900;text-decoration:none;">Go to dashboard</a>
            <a href="/admin/login.html" style="border-radius:999px;background:#05351f;color:white;padding:.85rem 1.1rem;font-weight:900;text-decoration:none;">Sign in again</a>
          </div>
        </section>
      </main>`;
  }
  async function resolveProfile(sb, user) {
    const tries = [
      q => q.eq('id', user.id),
      q => q.eq('user_id', user.id),
      q => user.email ? q.ilike('email', user.email) : q.eq('id', user.id)
    ];
    let lastError = null;
    for (const apply of tries) {
      try {
        const res = await apply(sb.from('admin_profiles').select('role,is_active,status,email,id,user_id,full_name').limit(1)).maybeSingle();
        if (res.error) { lastError = res.error; continue; }
        if (res.data) {
          const active = res.data.is_active !== false && String(res.data.status || 'active').toLowerCase() !== 'disabled' && String(res.data.status || 'active').toLowerCase() !== 'inactive';
          return { ...res.data, role: active ? String(res.data.role || '').toLowerCase() : 'disabled' };
        }
      } catch (error) { lastError = error; }
    }
    if (lastError) console.warn('[APSG Admin Auth] role lookup issue:', lastError.message || lastError);
    return { role: '', email: user.email || '' };
  }
  function applyRoleUi(role, user, profile) {
    window.APSG_ADMIN_ROLE = role;
    window.APSG_ADMIN_USER = user;
    window.APSG_ADMIN_PROFILE = profile;
    const label = document.getElementById('adminRoleLabel');
    if (label) label.textContent = titleCase(role);
    const email = document.getElementById('adminEmailLabel');
    if (email) email.textContent = profile?.email || user?.email || 'signed in';
    document.querySelectorAll('[data-role-level]').forEach(el => el.classList.toggle('active', el.dataset.roleLevel === role));
    document.querySelectorAll('[data-access]').forEach(el => {
      const access = String(el.dataset.access || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
      const locked = access.length && !access.includes(role);
      el.classList.toggle('locked-by-role', locked);
      if (locked) {
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('title', 'Locked for ' + titleCase(role) + ' role');
        if (/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.disabled = true;
      } else {
        el.removeAttribute('aria-disabled');
        el.removeAttribute('title');
      }
    });
    document.querySelectorAll('[data-min-role]').forEach(el => {
      const locked = !hasRole(role, el.dataset.minRole);
      el.classList.toggle('locked-by-role', locked);
      if (locked && /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.disabled = true;
      if (locked) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
    });
  }
  async function getAccess() {
    if (cached) return cached;
    const sb = client();
    if (!sb || !sb.auth) return { ok: false, role: 'none', reason: 'Supabase auth client unavailable.' };
    const { data, error } = await sb.auth.getSession();
    if (error || !data || !data.session) return { ok: false, role: 'none', reason: 'No active Supabase admin session.' };
    const user = data.session.user;
    const profile = await resolveProfile(sb, user);
    const role = profile.role;
    if (!allowedRoles.includes(role)) return { ok: false, role: role || 'none', user, profile, reason: 'This signed-in account is not active in admin_profiles.' };
    cached = { ok: true, role, user, profile };
    return cached;
  }
  window.requireAdminAccess = async function requireAdminAccess(options) {
    const roles = options?.roles || [];
    const minimum = options?.minRole || (roles.includes('superadmin') ? 'superadmin' : 'viewer');
    const access = await getAccess();
    if (!access.ok) {
      if (options?.render !== false) showAccessDenied(access.reason, access.role);
      return false;
    }
    if (roles.length && !roles.includes(access.role)) {
      if (options?.render !== false) showAccessDenied('This action is locked to: ' + roles.map(titleCase).join(', ') + '.', access.role);
      return false;
    }
    if (!hasRole(access.role, minimum)) {
      if (options?.render !== false) showAccessDenied('This page or action requires at least ' + titleCase(minimum) + ' permission.', access.role);
      return false;
    }
    applyRoleUi(access.role, access.user, access.profile);
    return true;
  };
  async function boot() {
    if (path.endsWith(loginPath)) return;
    const access = await getAccess();
    if (!access.ok) {
      if (access.reason && /session/i.test(access.reason)) location.replace(`${loginPath}?next=${encodeURIComponent(location.pathname + location.search)}`);
      else showAccessDenied(access.reason, access.role);
      return;
    }
    applyRoleUi(access.role, access.user, access.profile);
    if (!hasRole(access.role, requiredRole)) {
      showAccessDenied('This admin role is lower than the permission required for this page.', access.role);
      return;
    }
    document.documentElement.classList.add('apsg-admin-authorized');
    window.dispatchEvent(new CustomEvent('apsg:admin-authorized', { detail: { role: access.role, user: access.user, profile: access.profile } }));
  }
  document.addEventListener('click', function (event) {
    const locked = event.target.closest('[aria-disabled="true"], .locked-by-role');
    if (locked && locked.matches('a,button,[role="button"]')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
