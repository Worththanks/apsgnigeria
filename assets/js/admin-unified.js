/* Shared navigation shell for APSG admin pages. */
(function () {
  'use strict';

  if (!/^\/admin\//.test(location.pathname)) return;

  const roleLabels = { viewer: 'Viewer', editor: 'Editor', admin: 'Admin', superadmin: 'Superadmin' };
  const directLinks = [
    ['Dashboard', '/admin/dashboard.html', 'fa-chart-pie', 'viewer,editor,admin,superadmin'],
    ['Members', '/admin/members.html', 'fa-users', 'admin,superadmin']
  ];
  const groups = [
    {
      id: 'member-operations', title: 'Member Operations', icon: 'fa-users-gear', links: [
        ['Account Details', '/admin/account-details.html', 'fa-building-columns', 'admin,superadmin'],
        ['Leadership Desk', '/admin/admin-leadership.html', 'fa-users-viewfinder', 'admin,superadmin'],
        ['Create / Update Official', '/admin/admin-official-create.html', 'fa-user-pen', 'admin,superadmin'],
        ['Officials Manager', '/admin/admin-officials-manager.html', 'fa-table-list', 'admin,superadmin'],
        ['Member Dossier', '/admin/member-details.html', 'fa-id-card-clip', 'admin,superadmin'],
        ['Edit Member', '/admin/edit-member.html', 'fa-pen-to-square', 'admin,superadmin']
      ]
    },
    {
      id: 'get-involved', title: 'Get Involved', icon: 'fa-handshake-angle', links: [
        ['Get Involved Command', '/admin/admin-get-involved.html', 'fa-handshake-angle', 'admin,superadmin'],
        ['View PDF', '/admin/viewpdf.html', 'fa-file-pdf', 'admin,superadmin'],
        ['Support Receipts', '/admin/apsg-support-receipts.html', 'fa-file-invoice', 'admin,superadmin']
      ],
      nested: {
        id: 'get-involved-sections', title: 'Section shortcuts', links: [
          ['Donations', '/admin/admin-get-involved.html#donations', 'fa-heart', 'admin,superadmin'],
          ['Sponsorships', '/admin/admin-get-involved.html#sponsorships', 'fa-award', 'admin,superadmin'],
          ['Volunteers', '/admin/admin-get-involved.html#volunteers', 'fa-people-carry-box', 'admin,superadmin'],
          ['RSVPs', '/admin/admin-get-involved.html#rsvps', 'fa-ticket', 'admin,superadmin'],
          ['Payment Verification', '/admin/admin-get-involved.html#verification', 'fa-shield-halved', 'admin,superadmin'],
          ['Receipt Studio', '/admin/admin-get-involved.html#receipts', 'fa-receipt', 'admin,superadmin']
        ]
      }
    },
    {
      id: 'publishing-desk', title: 'Publishing Desk', icon: 'fa-newspaper', links: [
        ['News & Updates', '/admin/admin-blog.html', 'fa-newspaper', 'editor,admin,superadmin'],
        ['Meetings', '/admin/admin-meeting.html', 'fa-users-line', 'editor,admin,superadmin'],
        ['Events', '/admin/admin-event.html', 'fa-calendar-check', 'editor,admin,superadmin'],
        ['Gallery Albums', '/admin/admin-gallery.html', 'fa-images', 'editor,admin,superadmin']
      ]
    },
    {
      id: 'settings-access', title: 'Settings & Access', icon: 'fa-sliders', links: [
        ['Settings', '/admin/settings.html', 'fa-sliders', 'admin,superadmin'],
        ['Admin Users', '/admin/admin-users.html', 'fa-user-shield', 'admin,superadmin']
      ]
    },
    {
      id: 'public-site', title: 'Public Site', icon: 'fa-arrow-up-right-from-square', public: true, links: [
        ['Home', '/', 'fa-house', 'viewer,editor,admin,superadmin'],
        ['Leadership', '/pages/leadership.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['State', '/pages/state.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['CWDI', '/pages/cwdi.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['Get Involved', '/pages/get-involved.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['Donation', '/pages/donation.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['Sponsor', '/pages/sponsor.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['Volunteer', '/pages/volunteer.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['RSVP', '/pages/rsvp.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['Blog', '/pages/blog.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['Events', '/pages/events.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['Meetings', '/pages/meetings.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['Gallery', '/pages/gallery.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin'],
        ['Contact', '/pages/contact.html', 'fa-arrow-up-right-from-square', 'viewer,editor,admin,superadmin']
      ]
    }
  ];

  let sidebar = null;
  let mobileTrigger = null;
  let mobileOverlay = null;
  let quicknav = null;
  let routeUpdateQueued = false;

  function ready(callback) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
    else callback();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function icon(name) {
    return `<i class="fa-solid ${escapeHtml(name)}" aria-hidden="true"></i>`;
  }

  function exactRoute(href) {
    try {
      const destination = new URL(href, location.origin);
      return destination.pathname === location.pathname && destination.hash === location.hash;
    } catch (error) {
      return false;
    }
  }

  function roleChipMarkup(access) {
    const requiredRole = String(access || '').split(',')[0] || 'viewer';
    return `<span class="role-chip ${escapeHtml(requiredRole)}" data-apsg-role-chip hidden>${escapeHtml(roleLabels[requiredRole] || requiredRole)}</span>`;
  }

  // @spec ADMIN-NAV-UI-001, ADMIN-NAV-UI-002, ADMIN-NAV-UI-003, ADMIN-NAV-UI-005, ADMIN-NAV-UI-010, ADMIN-NAV-UI-012
  function linkMarkup(item, isPublic) {
    const [label, href, iconName, access] = item;
    const externalAttributes = isPublic ? ' target="_blank" rel="noopener noreferrer"' : '';
    const current = exactRoute(href);
    return `<a class="sidebar-link apsg-unified-link" data-apsg-nav-link data-access="${escapeHtml(access)}" href="${escapeHtml(href)}"${externalAttributes}${current ? ' aria-current="page"' : ''}>${icon(iconName)}<span>${escapeHtml(label)}</span>${roleChipMarkup(access)}${isPublic ? '<span class="sr-only"> Opens public page</span>' : ''}</a>`;
  }

  function sessionMarkup() {
    return `<section class="apsg-unified-session" aria-label="Signed-in administrator" aria-live="polite"><div class="apsg-session-heading"><span class="apsg-session-avatar">${icon('fa-user-shield')}</span><span><span class="apsg-session-kicker">Secure session</span><span class="apsg-session-status"><i aria-hidden="true"></i> Authenticated</span></span></div><strong id="adminEmailLabel">Checking session...</strong><span id="adminRoleLabel" class="apsg-role-badge">Role</span><span class="sr-only" aria-hidden="true"><span data-role-level="viewer">Viewer</span><span data-role-level="editor">Editor</span><span data-role-level="admin">Admin</span><span data-role-level="superadmin">Superadmin</span></span><button type="button" class="sidebar-link danger-link" data-apsg-logout>${icon('fa-right-from-bracket')}<span>Sign out</span></button></section>`;
  }

  // @spec ADMIN-NAV-UI-004
  function groupMarkup(group) {
    const nested = group.nested
      ? `<details class="apsg-nav-subgroup" data-apsg-nav-nested="${escapeHtml(group.nested.id)}"><summary>${escapeHtml(group.nested.title)}<span class="apsg-nav-chevron" aria-hidden="true">⌄</span></summary><div class="apsg-nav-group-items">${group.nested.links.map(item => linkMarkup(item, false)).join('')}</div></details>`
      : '';
    return `<details class="apsg-nav-group${group.public ? ' public' : ''}" data-apsg-nav-group="${escapeHtml(group.id)}"><summary>${icon(group.icon)}<span>${escapeHtml(group.title)}</span><span class="apsg-nav-chevron" aria-hidden="true">⌄</span></summary><div class="apsg-nav-group-items">${group.links.map(item => linkMarkup(item, Boolean(group.public))).join('')}${nested}</div></details>`;
  }

  function navMarkup() {
    return `<div class="apsg-nav-scroll"><div class="apsg-nav-eyebrow">Workspace</div><div class="apsg-nav-primary">${directLinks.map(item => linkMarkup(item, false)).join('')}</div><div class="apsg-nav-groups">${groups.map(groupMarkup).join('')}</div></div>${sessionMarkup()}`;
  }

  function findSidebar() {
    return document.getElementById('sidebar')
      || document.getElementById('adminSidebar')
      || document.querySelector('.admin-sidebar,.sidebar,aside[aria-label*="Admin" i]');
  }

  function findNav(container) {
    return container?.querySelector('.sidebar-nav,nav,[aria-label="Admin navigation"],.apsg-role-sidebar') || null;
  }

  function removeLegacySidebarControls(container) {
    container.querySelectorAll('.apsg-role-card,.role-card').forEach(card => card.remove());
    const sharedSession = container.querySelector('.apsg-unified-session');
    container.querySelectorAll('[onclick*="logout" i],[data-apsg-logout],a[href*="logout" i]').forEach(control => {
      if (sharedSession?.contains(control)) return;
      const wrapper = control.closest('.sidebar-footer,[class*="border-t"]') || control.parentElement;
      control.remove();
      if (wrapper && wrapper !== container && !wrapper.children.length && !wrapper.textContent.trim()) wrapper.remove();
    });
    container.querySelectorAll('.sidebar-footer').forEach(footer => {
      if (!footer.children.length && !footer.textContent.trim()) footer.remove();
    });
  }

  function ensureSidebarId(container) {
    if (!container.id) container.id = 'apsg-admin-sidebar';
    return container.id;
  }

  function upgradeExistingSidebar(container) {
    sidebar = container;
    sidebar.classList.add('apsg-unified-sidebar');
    sidebar.setAttribute('aria-label', 'APSG unified admin sidebar');
    const nav = findNav(sidebar);
    if (nav) {
      nav.classList.add('apsg-unified-nav');
      nav.innerHTML = navMarkup();
      nav.dataset.apsgUnified = 'true';
    } else {
      const newNav = document.createElement('nav');
      newNav.className = 'sidebar-nav apsg-unified-nav';
      newNav.setAttribute('aria-label', 'Admin navigation');
      newNav.innerHTML = navMarkup();
      sidebar.appendChild(newNav);
    }
    removeLegacySidebarControls(sidebar);
    ensureSidebarId(sidebar);
    return sidebar.querySelector('.apsg-unified-nav');
  }

  const triggerSelector = '[data-apsg-sidebar-open],#mobile-toggle,#sidebarToggle,#sidebarBtn,.mobile-toggle,[data-sidebar-toggle]';

  function ensureMobileTrigger() {
    const candidates = Array.from(document.querySelectorAll(triggerSelector));
    mobileTrigger = candidates[0] || document.createElement('button');
    if (!candidates.length) {
      mobileTrigger.type = 'button';
      mobileTrigger.className = 'apsg-admin-mobile-open';
      mobileTrigger.setAttribute('aria-label', 'Open admin navigation');
      mobileTrigger.innerHTML = `${icon('fa-bars')}<span>Menu</span>`;
      document.body.appendChild(mobileTrigger);
    }
    mobileTrigger.setAttribute('data-apsg-sidebar-open', '');
    mobileTrigger.setAttribute('aria-controls', ensureSidebarId(sidebar));
    mobileTrigger.setAttribute('aria-expanded', 'false');
    if (!mobileTrigger.hasAttribute('aria-label')) mobileTrigger.setAttribute('aria-label', 'Open admin navigation');
    if (/toggleSidebar|toggleAdminSidebar|closeSidebar/i.test(mobileTrigger.getAttribute('onclick') || '')) mobileTrigger.removeAttribute('onclick');
    candidates.slice(1).forEach(extra => {
      extra.hidden = true;
      extra.setAttribute('aria-hidden', 'true');
      extra.setAttribute('tabindex', '-1');
      extra.removeAttribute('onclick');
    });
    return mobileTrigger;
  }

  function ensureMobileOverlay() {
    mobileOverlay = document.querySelector('#mobileOverlay,#mobile-overlay,.apsg-admin-shell-overlay,.mobile-overlay[data-sidebar-overlay]');
    if (!mobileOverlay) {
      mobileOverlay = document.createElement('button');
      mobileOverlay.type = 'button';
      mobileOverlay.setAttribute('aria-label', 'Close admin navigation');
      document.body.appendChild(mobileOverlay);
    }
    mobileOverlay.classList.add('apsg-admin-shell-overlay');
    if (/toggleSidebar|toggleAdminSidebar|closeSidebar/i.test(mobileOverlay.getAttribute('onclick') || '')) mobileOverlay.removeAttribute('onclick');
    return mobileOverlay;
  }

  function setOverlayOpen(open) {
    if (!mobileOverlay) return;
    mobileOverlay.hidden = !open;
    mobileOverlay.classList.toggle('hidden', !open);
    mobileOverlay.classList.toggle('show', open);
    mobileOverlay.setAttribute('aria-hidden', String(!open));
  }

  function focusFirstUsable(container) {
    const first = container?.querySelector('a[href]:not([hidden]):not([aria-disabled="true"]),button:not([hidden]):not([disabled]),summary');
    if (first) first.focus({ preventScroll: true });
  }

  // @spec ADMIN-NAV-UI-013, ADMIN-NAV-UI-014, ADMIN-NAV-UI-015, ADMIN-NAV-UI-016, ADMIN-NAV-UI-017
  function setSidebarOpen(show, options = {}) {
    if (!sidebar) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const open = isMobile && (show === undefined ? !sidebar.classList.contains('open') : Boolean(show));
    sidebar.classList.toggle('open', open);
    sidebar.classList.remove('-translate-x-full');
    sidebar.setAttribute('aria-hidden', String(isMobile && !open));
    sidebar.inert = isMobile && !open;
    if (mobileTrigger) mobileTrigger.setAttribute('aria-expanded', String(open));
    setOverlayOpen(open);

    if (open && options.focus !== false) {
      window.requestAnimationFrame(() => focusFirstUsable(sidebar));
    } else if (!open && options.restoreFocus && isMobile && mobileTrigger && !mobileTrigger.hidden) {
      mobileTrigger.focus({ preventScroll: true });
    }
  }

  function applyRolePresentation(container) {
    if (!container) return;
    container.querySelectorAll('[data-apsg-nav-link]').forEach(link => {
      const chip = link.querySelector('[data-apsg-role-chip]');
      if (chip) chip.hidden = !(link.classList.contains('locked-by-role') || link.getAttribute('aria-disabled') === 'true');
    });
    container.querySelectorAll('[data-apsg-nav-group],[data-apsg-nav-nested]').forEach(group => {
      const destinations = Array.from(group.querySelectorAll(':scope > .apsg-nav-group-items [data-apsg-nav-link]'));
      group.hidden = destinations.length > 0 && destinations.every(link => link.hidden);
    });
  }

  function observeRolePresentation(container) {
    if (!container || !window.MutationObserver) return;
    const observer = new MutationObserver(() => applyRolePresentation(container));
    container.querySelectorAll('[data-apsg-nav-link]').forEach(link => {
      observer.observe(link, { attributes: true, attributeFilter: ['hidden', 'class', 'aria-disabled'] });
    });
  }

  // @spec ADMIN-NAV-UI-005, ADMIN-NAV-UI-006, ADMIN-NAV-UI-007, ADMIN-NAV-UI-008
  function syncRouteState(container) {
    if (!container) return;
    const links = Array.from(container.querySelectorAll('[data-apsg-nav-link]'));
    let currentLink = null;
    links.forEach(link => {
      const current = exactRoute(link.getAttribute('href'));
      link.classList.toggle('active', current);
      if (current) {
        link.setAttribute('aria-current', 'page');
        currentLink = currentLink || link;
      } else {
        link.removeAttribute('aria-current');
      }
    });

    const currentGroup = currentLink?.closest('[data-apsg-nav-group]') || null;
    container.querySelectorAll('[data-apsg-nav-group]').forEach(group => { group.open = group === currentGroup; });
    container.querySelectorAll('[data-apsg-nav-nested]').forEach(group => {
      group.open = Boolean(currentLink && group.contains(currentLink) && location.hash);
    });
  }

  function hashRoute() {
    const tab = (location.hash || '').replace(/^#/, '');
    if (!tab || !window.CSS?.escape) return;
    const route = `${location.pathname}${location.hash}`;
    window.setTimeout(() => {
      if (route !== `${location.pathname}${location.hash}`) return;
      const selector = `[data-tab="${CSS.escape(tab)}"],[data-tab-jump="${CSS.escape(tab)}"]`;
      const button = document.querySelector(selector);
      if (button) {
        button.click();
        document.querySelector(`#tab-${CSS.escape(tab)}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }, 350);
  }

  function queueRouteUpdate(container) {
    if (routeUpdateQueued) return;
    routeUpdateQueued = true;
    window.queueMicrotask(() => {
      routeUpdateQueued = false;
      syncRouteState(container);
      hashRoute();
    });
  }

  function buildQuicknav() {
    if (/^\/admin\/login\.html$/i.test(location.pathname)) return null;
    let wrap = document.querySelector('.apsg-admin-quicknav');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'apsg-admin-quicknav';
      wrap.innerHTML = `<button type="button" class="apsg-admin-quicknav-toggle" aria-expanded="false" aria-controls="apsg-admin-quicknav-panel">${icon('fa-compass')}<span>Admin Navigation</span></button><div class="apsg-admin-quicknav-panel" id="apsg-admin-quicknav-panel" role="dialog" aria-label="APSG admin navigation" hidden><h3>APSG Admin Navigation</h3><nav class="apsg-unified-nav" aria-label="Admin navigation">${navMarkup()}</nav></div>`;
      document.body.appendChild(wrap);
    }
    quicknav = wrap;
    const button = quicknav.querySelector('.apsg-admin-quicknav-toggle');
    const panel = quicknav.querySelector('.apsg-admin-quicknav-panel');
    if (panel && !panel.id) panel.id = 'apsg-admin-quicknav-panel';
    if (button && panel) {
      button.setAttribute('aria-controls', panel.id);
      panel.hidden = !quicknav.classList.contains('open');
      button.setAttribute('aria-expanded', String(quicknav.classList.contains('open')));
      button.addEventListener('click', () => setQuicknavOpen(!quicknav.classList.contains('open'), true));
      quicknav.addEventListener('click', event => {
        const link = event.target.closest('[data-apsg-nav-link]');
        if (link && link.getAttribute('aria-disabled') !== 'true') setQuicknavOpen(false, true);
      });
    }
    return quicknav.querySelector('.apsg-unified-nav');
  }

  function setQuicknavOpen(open, focus) {
    if (!quicknav) return;
    const button = quicknav.querySelector('.apsg-admin-quicknav-toggle');
    const panel = quicknav.querySelector('.apsg-admin-quicknav-panel');
    quicknav.classList.toggle('open', open);
    if (panel) panel.hidden = !open;
    if (button) button.setAttribute('aria-expanded', String(open));
    if (open && focus) window.requestAnimationFrame(() => focusFirstUsable(panel));
    if (!open && focus && button) button.focus({ preventScroll: true });
  }

  async function adminLogout() {
    try {
      const client = window.supabaseClient || window.apsgSupabase || window.APSG_SUPABASE;
      if (client?.auth) await client.auth.signOut();
    } catch (error) { /* Redirect to sign-in even if the local session is already gone. */ }
    location.href = '/admin/login.html';
  }

  function updateRole(detail) {
    const role = String(detail?.role || window.APSG_ADMIN_ROLE || '').toLowerCase();
    const user = detail?.user || window.APSG_ADMIN_USER || {};
    const profile = detail?.profile || window.APSG_ADMIN_PROFILE || {};
    document.querySelectorAll('#adminRoleLabel').forEach(label => { label.textContent = roleLabels[role] || role || 'Role'; });
    document.querySelectorAll('#adminEmailLabel').forEach(label => { label.textContent = profile.email || user.email || 'Signed in'; });
    document.body.dataset.adminRole = role || 'unknown';
  }

  function bindEvents(container) {
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-apsg-sidebar-open]');
      if (trigger && trigger === mobileTrigger) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setSidebarOpen();
        return;
      }

      const overlay = event.target.closest('.apsg-admin-shell-overlay,[data-close-sidebar]');
      if (overlay && sidebar) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setSidebarOpen(false, { restoreFocus: true });
        return;
      }

      if (event.target.closest('[data-apsg-logout]')) {
        event.preventDefault();
        adminLogout();
      }
    }, true);

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (quicknav?.classList.contains('open')) {
        event.preventDefault();
        setQuicknavOpen(false, true);
      } else if (sidebar?.classList.contains('open')) {
        event.preventDefault();
        setSidebarOpen(false, { restoreFocus: true });
      }
    });

    if (quicknav) {
      document.addEventListener('click', event => {
        if (quicknav.classList.contains('open') && !quicknav.contains(event.target)) setQuicknavOpen(false, true);
      }, true);
    }

    window.addEventListener('resize', () => {
      if (!sidebar) return;
      if (window.innerWidth > 767) setSidebarOpen(false, { focus: false });
      else setSidebarOpen(sidebar.classList.contains('open'), { focus: false });
    });
    window.addEventListener('hashchange', () => queueRouteUpdate(container));
    window.addEventListener('popstate', () => queueRouteUpdate(container));
  }

  // @spec ADMIN-NAV-UI-009, ADMIN-NAV-UI-011, ADMIN-NAV-UI-012, ADMIN-NAV-UI-018, ADMIN-NAV-UI-019, ADMIN-NAV-UI-020
  function mountAdminShell() {
    document.documentElement.classList.add('apsg-admin-shell-ready');
    sidebar = findSidebar();
    let nav;
    if (sidebar) {
      nav = upgradeExistingSidebar(sidebar);
      ensureMobileTrigger();
      ensureMobileOverlay();
      setSidebarOpen(false, { focus: false });
    } else {
      nav = buildQuicknav();
    }

    if (nav) {
      applyRolePresentation(nav);
      observeRolePresentation(nav);
      syncRouteState(nav);
    }
    bindEvents(nav);
    hashRoute();
    updateRole({});
    window.addEventListener('apsg:admin-authorized', event => {
      updateRole(event.detail);
      applyRolePresentation(nav);
    });
    window.toggleAdminSidebar = show => setSidebarOpen(show);
    window.toggleSidebar = show => setSidebarOpen(show);
    window.closeSidebar = () => setSidebarOpen(false, { restoreFocus: true });
    window.logout = adminLogout;
  }

  ready(mountAdminShell);
})();
