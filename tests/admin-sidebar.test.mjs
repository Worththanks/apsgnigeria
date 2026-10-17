import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const script = readFileSync(new URL('../assets/js/admin-unified.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../assets/css/admin-unified.css', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../admin/dashboard.html', import.meta.url), 'utf8');

const expectedAccess = new Map([
  ['/admin/dashboard.html', 'viewer,editor,admin,superadmin'],
  ['/admin/members.html', 'admin,superadmin'],
  ['/admin/account-details.html', 'admin,superadmin'],
  ['/admin/admin-leadership.html', 'admin,superadmin'],
  ['/admin/admin-official-create.html', 'admin,superadmin'],
  ['/admin/admin-officials-manager.html', 'admin,superadmin'],
  ['/admin/member-details.html', 'admin,superadmin'],
  ['/admin/edit-member.html', 'admin,superadmin'],
  ['/admin/admin-get-involved.html', 'admin,superadmin'],
  ['/admin/admin-get-involved.html#donations', 'admin,superadmin'],
  ['/admin/admin-get-involved.html#sponsorships', 'admin,superadmin'],
  ['/admin/admin-get-involved.html#volunteers', 'admin,superadmin'],
  ['/admin/admin-get-involved.html#rsvps', 'admin,superadmin'],
  ['/admin/admin-get-involved.html#verification', 'admin,superadmin'],
  ['/admin/admin-get-involved.html#receipts', 'admin,superadmin'],
  ['/admin/viewpdf.html', 'admin,superadmin'],
  ['/admin/apsg-support-receipts.html', 'admin,superadmin'],
  ['/admin/admin-blog.html', 'editor,admin,superadmin'],
  ['/admin/admin-meeting.html', 'editor,admin,superadmin'],
  ['/admin/admin-event.html', 'editor,admin,superadmin'],
  ['/admin/admin-gallery.html', 'editor,admin,superadmin'],
  ['/admin/settings.html', 'admin,superadmin'],
  ['/admin/admin-users.html', 'admin,superadmin'],
  ['/', 'viewer,editor,admin,superadmin'],
  ['/pages/leadership.html', 'viewer,editor,admin,superadmin'],
  ['/pages/state.html', 'viewer,editor,admin,superadmin'],
  ['/pages/cwdi.html', 'viewer,editor,admin,superadmin'],
  ['/pages/get-involved.html', 'viewer,editor,admin,superadmin'],
  ['/pages/donation.html', 'viewer,editor,admin,superadmin'],
  ['/pages/sponsor.html', 'viewer,editor,admin,superadmin'],
  ['/pages/volunteer.html', 'viewer,editor,admin,superadmin'],
  ['/pages/rsvp.html', 'viewer,editor,admin,superadmin'],
  ['/pages/blog.html', 'viewer,editor,admin,superadmin'],
  ['/pages/events.html', 'viewer,editor,admin,superadmin'],
  ['/pages/meetings.html', 'viewer,editor,admin,superadmin'],
  ['/pages/gallery.html', 'viewer,editor,admin,superadmin'],
  ['/pages/contact.html', 'viewer,editor,admin,superadmin']
]);

function navEntries(source) {
  return [...source.matchAll(/\[\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\]/g)]
    .map(([, label, href, icon, access]) => ({ label, href, icon, access }));
}

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const next = source.indexOf('\n  function ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

// @spec ADMIN-NAV-UI-001, ADMIN-NAV-UI-002, ADMIN-NAV-UI-003, ADMIN-NAV-UI-004
test('groups every existing destination once under the approved navigation hierarchy', () => {
  const entries = navEntries(script);
  const routes = entries.map(entry => entry.href);
  assert.equal(new Set(routes).size, routes.length, 'no destination is duplicated');
  assert.deepEqual(new Set(routes), new Set(expectedAccess.keys()), 'all existing admin, public, and hash destinations remain available');
  assert.match(script, /const directLinks\s*=\s*\[/, 'Dashboard and Members are direct links');
  for (const title of ['Member Operations', 'Get Involved', 'Publishing Desk', 'Settings & Access', 'Public Site']) {
    assert.ok(script.includes(`title: '${title}'`), `${title} is a disclosure group`);
  }
  assert.match(functionSource(script, 'groupMarkup'), /<details[\s\S]*?<summary[\s\S]*?group\.links\.map/);
  assert.match(functionSource(script, 'groupMarkup'), /apsg-nav-subgroup[\s\S]*?group\.nested\.links\.map/);
  assert.match(functionSource(script, 'linkMarkup'), /target="_blank" rel="noopener noreferrer"/);
});

// @spec ADMIN-NAV-UI-005, ADMIN-NAV-UI-007, ADMIN-NAV-UI-008
test('route matching requires the exact path and hash and resets disclosure state from the route', () => {
  const exactRouteSource = functionSource(script, 'exactRoute');
  const exactRoute = Function('location', 'URL', `${exactRouteSource}; return exactRoute;`)({
    origin: 'https://apsgnigeria.test', pathname: '/admin/admin-get-involved.html', hash: '#donations'
  }, URL);
  assert.equal(exactRoute('/admin/admin-get-involved.html#donations'), true);
  assert.equal(exactRoute('/admin/admin-get-involved.html'), false, 'base link does not match a section hash');
  assert.equal(exactRoute('/admin/admin-get-involved.html#rsvps'), false, 'a different section is not current');
  assert.equal(exactRoute('/admin/settings.html'), false, 'an unrelated destination is not current');

  const sync = functionSource(script, 'syncRouteState');
  assert.match(sync, /link\.setAttribute\('aria-current', 'page'\)/);
  assert.match(sync, /link\.removeAttribute\('aria-current'\)/);
  assert.match(sync, /group\.open\s*=\s*group\s*===\s*currentGroup/);
  assert.match(sync, /group\.open\s*=\s*Boolean\(currentLink[^;]*location\.hash\)/);
  assert.doesNotMatch(script, /localStorage|sessionStorage/, 'disclosure state is not persisted');
});

// @spec ADMIN-NAV-UI-006
test('hash and browser-history changes refresh the sidebar and Get Involved tab', () => {
  const bindEvents = functionSource(script, 'bindEvents');
  assert.match(bindEvents, /addEventListener\('hashchange',[\s\S]*?queueRouteUpdate\(container\)/);
  assert.match(bindEvents, /addEventListener\('popstate',[\s\S]*?queueRouteUpdate\(container\)/);
  assert.match(functionSource(script, 'queueRouteUpdate'), /syncRouteState\(container\);\s*hashRoute\(\)/);
  assert.match(functionSource(script, 'hashRoute'), /data-tab-jump/);
  assert.match(functionSource(script, 'hashRoute'), /button\.click\(\)/);
});

// @spec ADMIN-NAV-UI-009, ADMIN-NAV-UI-010, ADMIN-NAV-UI-011, ADMIN-NAV-UI-012
test('preserves role access, locked-link labels, visibility rules, and one session area', () => {
  const actualAccess = new Map(navEntries(script).map(entry => [entry.href, entry.access]));
  assert.deepEqual([...actualAccess].sort(([a], [b]) => a.localeCompare(b)), [...expectedAccess].sort(([a], [b]) => a.localeCompare(b)), 'each existing destination keeps its access roles');
  assert.match(functionSource(script, 'linkMarkup'), /data-access="\$\{escapeHtml\(access\)\}"/);
  assert.match(functionSource(script, 'roleChipMarkup'), /roleLabels\[requiredRole\]/);
  assert.match(functionSource(script, 'applyRolePresentation'), /locked-by-role/);
  assert.match(functionSource(script, 'applyRolePresentation'), /aria-disabled/);
  assert.match(functionSource(script, 'applyRolePresentation'), /destinations\.every\(link\s*=>\s*link\.hidden\)/);
  assert.match(functionSource(script, 'observeRolePresentation'), /attributeFilter:\s*\['hidden', 'class', 'aria-disabled'\]/);
  assert.match(functionSource(script, 'sessionMarkup'), /id="adminEmailLabel"[\s\S]*id="adminRoleLabel"[\s\S]*data-role-level="superadmin"/);
  assert.match(functionSource(script, 'removeLegacySidebarControls'), /\.apsg-role-card,\.role-card/);
  assert.match(functionSource(script, 'removeLegacySidebarControls'), /a\[href\*="logout" i\]/);
});

// @spec ADMIN-NAV-UI-013, ADMIN-NAV-UI-014, ADMIN-NAV-UI-015, ADMIN-NAV-UI-016, ADMIN-NAV-UI-017
test('mobile drawer state stays synchronized and reuses one existing opener and overlay', () => {
  const state = functionSource(script, 'setSidebarOpen');
  assert.match(state, /matchMedia\('\(max-width: 767px\)'\)/);
  assert.match(state, /setAttribute\('aria-hidden', String\(isMobile && !open\)\)/);
  assert.match(state, /sidebar\.inert\s*=\s*isMobile && !open/);
  assert.match(state, /mobileTrigger\.setAttribute\('aria-expanded', String\(open\)\)/);
  assert.match(state, /focusFirstUsable\(sidebar\)/);
  assert.match(state, /mobileTrigger\.focus\(\{ preventScroll: true \}\)/);
  assert.match(functionSource(script, 'ensureMobileTrigger'), /aria-controls/);
  assert.match(functionSource(script, 'ensureMobileTrigger'), /candidates\.slice\(1\)/);
  assert.match(functionSource(script, 'ensureMobileOverlay'), /#mobileOverlay,#mobile-overlay/);
  assert.match(functionSource(script, 'bindEvents'), /event\.key !== 'Escape'[\s\S]*setSidebarOpen\(false, \{ restoreFocus: true \}\)/);
  assert.match(functionSource(script, 'bindEvents'), /innerWidth > 767/);
  assert.match(functionSource(script, 'mountAdminShell'), /ensureMobileTrigger\(\)[\s\S]*ensureMobileOverlay\(\)/);
  assert.match(styles, /\.apsg-unified-sidebar:not\(\.open\)[\s\S]*visibility:hidden[\s\S]*transform:translateX\(-100%\)/);
  assert.match(styles, /@media\(prefers-reduced-motion:\s*reduce\)/);
});

// @spec ADMIN-NAV-UI-018, ADMIN-NAV-UI-020
test('fallback quicknav is accessible, dismissible, and omitted before login', () => {
  const build = functionSource(script, 'buildQuicknav');
  assert.ok(build.includes('/^\\/admin\\/login\\.html$/i'), 'admin login skips fallback quicknav');
  assert.match(build, /aria-controls/);
  assert.match(build, /if \(panel && !panel\.id\) panel\.id = 'apsg-admin-quicknav-panel'/);
  assert.match(build, /role="dialog"/);
  assert.match(build, /panel\.hidden\s*=\s*!quicknav\.classList\.contains\('open'\)/);
  assert.match(functionSource(script, 'setQuicknavOpen'), /aria-expanded/);
  assert.match(functionSource(script, 'setQuicknavOpen'), /focusFirstUsable\(panel\)/);
  assert.match(functionSource(script, 'bindEvents'), /quicknav\.contains\(event\.target\)/);
  assert.match(functionSource(script, 'buildQuicknav'), /data-apsg-nav-link[\s\S]*setQuicknavOpen\(false, true\)/);
  assert.match(functionSource(script, 'mountAdminShell'), /if \(sidebar\)[\s\S]*else \{\s*nav = buildQuicknav\(\)/);
});

// @spec ADMIN-NAV-UI-019
test('the shared shell leaves dashboard presentation and data behavior page-owned', () => {
  assert.match(dashboard, /\/assets\/js\/admin-unified\.js/);
  assert.match(dashboard, /id="totalMembers"/);
  assert.match(dashboard, /id="dataQualityRate"/);
  assert.match(dashboard, /id="pendingActionsCount"/);
  assert.doesNotMatch(script, /querySelector(All)?\([^)]*(?:totalMembers|dataQualityRate|pendingActionsCount)/);
});

// @spec ADMIN-NAV-UI-021, ADMIN-NAV-UI-022, ADMIN-NAV-UI-023
test('sidebar hierarchy, active route, focus, and narrow-screen styles remain readable', () => {
  assert.match(styles, /\.apsg-unified-sidebar\{[^}]*#061b12/);
  assert.match(styles, /\.apsg-unified-session\{/);
  assert.match(styles, /\.sidebar-link\[aria-current="page"\][^{]*\{[^}]*box-shadow:inset 3px 0/);
  assert.match(styles, /summary:focus-visible[^}]*outline:2px solid/);
  assert.match(styles, /@media\(max-width:767px\)[\s\S]*\.apsg-unified-sidebar/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
});
