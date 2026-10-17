import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'admin/dashboard.html'), 'utf8');
const script = readFileSync(resolve(root, 'assets/js/dashboard.js'), 'utf8');
const dashboardCss = readFileSync(resolve(root, 'assets/css/dashboard.css'), 'utf8');
const sharedShellCss = readFileSync(resolve(root, 'assets/css/admin-unified.css'), 'utf8');

function countMatches(source, expression) {
  return [...source.matchAll(expression)].length;
}

function mustMatch(source, expression, message) {
  assert.ok(expression.test(source), message);
}

function mustNotMatch(source, expression, message) {
  assert.ok(!expression.test(source), message);
}

function getFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is defined`);
  const nextFunction = source.indexOf('\n        function ', start + 1);
  return source.slice(start, nextFunction === -1 ? source.length : nextFunction);
}

function getLoadDashboardSource(source) {
  const start = source.indexOf('async loadDashboard(');
  assert.notEqual(start, -1, 'loadDashboard is defined');
  const end = source.indexOf('\n        async function resolveAdminRole()', start);
  assert.notEqual(end, -1, 'loadDashboard body is delimited');
  return source.slice(start, end);
}

function getDetails(htmlSource, id) {
  const start = htmlSource.indexOf(`<details id="${id}"`);
  assert.notEqual(start, -1, `${id} disclosure exists`);
  const end = htmlSource.indexOf('</details>', start);
  assert.notEqual(end, -1, `${id} disclosure closes`);
  return { start, end: end + '</details>'.length, source: htmlSource.slice(start, end + '</details>'.length) };
}

function getPrimarySection(htmlSource) {
  const match = htmlSource.match(/<section[^>]*aria-label="Primary membership indicators"[^>]*>[\s\S]*?<\/section>/);
  assert.ok(match, 'primary membership indicator section exists');
  return { start: match.index, source: match[0] };
}

function calculateMetrics(source, members) {
  const helperNames = ['hasValue', 'hasPVC', 'hasAPCCard', 'hasDocuments', 'percent', 'countByField'];
  const helpers = helperNames.map(name => getFunctionSource(source, name)).join('\n');
  const start = source.indexOf('const withPVC = members.filter(hasPVC).length;');
  assert.notEqual(start, -1, 'membership metric calculations exist');
  const endMarker = 'const pendingTotal = missingPVC + missingAPC + missingAccounts + missingPhone + missingLocation + duplicatePhones;';
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, 'open-gap total calculation exists');
  const calculation = source.slice(start, end + endMarker.length);
  return Function('members', `${helpers}\nconst total = members.length;\n${calculation}\nreturn { total, withPVC, withAPC, withAccounts, withPhone, withEmail, withLocation, pvcRate, apcRate, accountRate, phoneRate, emailRate, locationRate, dataQuality, missingPVC, missingAPC, missingAccounts, missingPhone, missingLocation, duplicatePhones, pendingTotal };`)(members);
}

// @spec DASH-UI-001, DASH-UI-003, DASH-UI-004
test('shows the APSG command center and places membership work before secondary reports', () => {
  mustMatch(html, /APSG Command Center/, 'APSG Command Center title is visible');
  mustMatch(html, /href="\/admin\/members\.html"/, 'Members destination stays available');
  mustMatch(html, /Visible APSG Members/, 'member total discloses its APSG/session scope');
  mustMatch(html, /Open Data Gaps/, 'aggregate is labeled as data gaps');

  for (const id of ['totalMembers', 'weekRegistrations', 'dataQualityRate', 'pendingActionsCount']) {
    assert.equal(countMatches(html, new RegExp(`id=["']${id}["']`, 'g')), 1, `${id} appears once`);
  }

  const primary = getPrimarySection(html);
  assert.equal(countMatches(primary.source, /class="metric-card dashboard-kpi-card"/g), 4, 'primary area has four indicators');
  assert.ok(html.indexOf('dashboard-action-center') < html.indexOf('id="dashboardMoreReports"'), 'health and action panels precede secondary reports');
});

// @spec DASH-UI-002
test('groups member actions and removes the dashboard Print action', () => {
  mustMatch(html, /<details class="dashboard-actions">[\s\S]*?<summary[^>]*>[\s\S]*?Actions[\s\S]*?<\/summary>/, 'member actions use a native Actions disclosure');
  mustMatch(html, /href="\/admin\/account-details\.html"/, 'account details destination is preserved');
  mustMatch(html, /onclick="exportAccountCsv\(\)"/, 'account export handler is preserved');
  mustMatch(html, /onclick="exportCsv\(\)"/, 'CSV export handler is preserved');
  mustMatch(html, /onclick="exportFilteredCsv\('missing-docs'\)"/, 'missing-document export handler is preserved');
  mustNotMatch(html, /window\.print\s*\(/, 'dashboard Print action is absent');
});

// @spec DASH-UI-005
test('keeps the seven-day registration trend in the primary view and state distribution in More reports', () => {
  const reports = getDetails(html, 'dashboardMoreReports');
  const primary = html.slice(getPrimarySection(html).start, reports.start);
  mustMatch(primary, /aria-label="Recent registration trend"/, 'seven-day membership trend is in the primary view');
  mustNotMatch(primary, /Registrations by State/, 'geographic chart is not in the primary view');
  mustMatch(reports.source, /Registrations by State/, 'geographic chart is inside More reports');
});

// @spec DASH-UI-006
test('keeps the latest-members preview visible with its Members destination', () => {
  const reports = getDetails(html, 'dashboardMoreReports');
  const latestStart = html.indexOf('aria-label="Latest members"');
  assert.ok(latestStart >= 0 && latestStart < reports.start, 'Latest Members stays outside the report disclosure');
  const latest = html.slice(latestStart, reports.start);
  mustMatch(latest, /id="latestMembersTable"/, 'latest member table remains in the primary view');
  mustMatch(latest, /href="\/admin\/members\.html"/, 'latest member destination is preserved');
});

// @spec DASH-UI-007, DASH-UI-008, DASH-UI-009
test('keeps secondary reports in a closed native disclosure with live targets and module states', () => {
  const reports = getDetails(html, 'dashboardMoreReports');
  mustNotMatch(reports.source.match(/^<details[^>]*>/)?.[0] || '', /\bopen\b/, 'More reports starts closed');
  mustMatch(reports.source, /<summary[^>]*>[\s\S]*More reports[\s\S]*<\/summary>/, 'More reports has a native keyboard-operable summary');

  for (const id of ['lastRegistered', 'lastUpdatedLabel', 'recentActivityList', 'incompleteRecordsTable', 'topStatesTable', 'topLgasValue', 'topPublicPagesTable', 'publishingModuleStatus', 'websiteAnalyticsModuleStatus']) {
    assert.equal(countMatches(reports.source, new RegExp(`id=["']${id}["']`, 'g')), 1, `${id} exists once inside More reports`);
  }
  mustMatch(reports.source, /Content Publishing Desk/, 'publishing reports remain available');
  mustMatch(reports.source, /Website Intelligence Overview/, 'website analytics remain available');
  mustMatch(html, /\/assets\/js\/admin-unified\.js/, 'shared admin shell script remains loaded');
});

// @spec DASH-UI-011, DASH-DATA-004, DASH-DATA-005
test('distinguishes successful empty membership data from initial and refresh failures', () => {
  mustMatch(html, /id="noDataMessage"/, 'successful-empty message target remains available');
  mustMatch(html, /id="dashboardDataStatus"[^>]*data-state="loading"/, 'initial membership load has a visible loading state');
  mustMatch(html, /id="dashboardRetryButton"/, 'membership failure offers retry');
  mustMatch(script, /setDashboardDataStatus\('empty'/, 'empty status is reserved for a successful zero-row response');
  mustMatch(script, /setDashboardDataStatus\('error'/, 'initial query failure has its own state');
  mustMatch(script, /setDashboardDataStatus\('stale'/, 'failed refresh marks retained values stale');
  mustMatch(script, /hasSuccessfulMemberLoad/, 'loader distinguishes initial failure from refresh failure');
});

// @spec DASH-UI-012
test('uses the shared sidebar presentation without Dashboard-local shell overrides', () => {
  const pageStyle = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  mustNotMatch(pageStyle, /(?:#sidebar|\.sidebar-link|\.sidebar-heading|\.role-chip|\.role-level|\.apsg-role-card|\.apsg-role-sidebar|\.admin-sidebar|\.apsg-unified-session|\.danger-link|\.locked-by-role)[^{,}]*\s*\{/i, 'inline dashboard styles do not override shared sidebar elements');
  mustNotMatch(dashboardCss, /(?:^|[}\s])(?:#sidebar|\.sidebar-link(?:[.:][\w-]+)?|\.sidebar-heading|\.role-chip(?:\.[\w-]+)?|\.role-level(?:\.[\w-]+)?|\.apsg-role-card|\.apsg-role-sidebar|\.admin-sidebar|\.danger-link|\.locked-by-role)\s*\{/m, 'dashboard stylesheet does not redefine shared sidebar elements');
  mustMatch(html, /\/assets\/css\/admin-unified\.css/, 'shared sidebar stylesheet remains loaded');
  mustMatch(sharedShellCss, /\.sidebar-link/, 'shared shell owns sidebar link styling');
});

// @spec DASH-UI-013, DASH-UI-014
test('keeps dashboard panels responsive and preserves the native disclosure state on resize', () => {
  mustMatch(dashboardCss, /\.dashboard-primary-grid\s*\{[^}]*grid-template-columns/, 'primary indicators use a responsive grid');
  mustMatch(dashboardCss, /\.table-scroll\s*\{[^}]*overflow-x\s*:\s*auto/i, 'wide tables remain horizontally scrollable in their container');
  mustMatch(dashboardCss, /overflow-x\s*:\s*hidden/i, 'dashboard prevents page-level horizontal overflow');
  mustMatch(html, /<details id="dashboardMoreReports"/, 'More reports uses native disclosure state');
  mustNotMatch(script, /dashboardMoreReports\s*\.\s*open\s*=/, 'viewport changes do not overwrite the disclosure state');
});

// @spec DASH-UI-015, DASH-UI-016
test('removes the duplicate mini-tile row and keeps Recent Activity focused on member events', () => {
  const reports = getDetails(html, 'dashboardMoreReports');
  const primary = html.slice(0, reports.start);
  mustNotMatch(primary, /class=["'][^"']*\bmini-tile\b/, 'header mini tiles are not repeated above the primary indicators');
  mustMatch(reports.source, /id="lastRegistered"[\s\S]*?id="lastUpdatedLabel"/, 'Last Record and Updated remain in reports');
  mustMatch(reports.source, /class="sr-only"[^>]*>[\s\S]*id="weekMiniLabel"[\s\S]*id="pendingMiniLabel"/, 'legacy script targets remain hidden from visual summaries');
  mustMatch(html, /Preview of up to 5 newest APSG member records/, 'activity description identifies member-record events');
  const activityRenderer = getFunctionSource(script, 'renderRecentActivity');
  mustNotMatch(activityRenderer, /Data Quality|Pending Actions|Open Data Gaps/, 'activity rows do not repeat aggregate summaries');
});

// @spec DASH-UI-017
test('preserves browser-print output while omitting a dedicated Print button', () => {
  mustNotMatch(html, /window\.print\s*\(/, 'the dashboard has no Print button');
  mustMatch(dashboardCss, /@media\s+print\s*\{[\s\S]*?details\.dashboard-more-reports\s*\{[^}]*display\s*:\s*block/i, 'closed More reports content is included in browser print output');
  mustMatch(dashboardCss, /\.dashboard-report-controls[\s\S]*?display\s*:\s*none\s*!important/i, 'interactive report controls are hidden in browser print output');
  mustMatch(html, /class="[^"]*no-print[^"]*"/, 'existing no-print control hooks remain available');
});

// @spec DASH-DATA-001, DASH-DATA-002, DASH-DATA-003
test('uses one APSG registry row set for dashboard figures, lists, and exports', () => {
  mustMatch(script, /\.from\(['"]members['"]\)/, 'membership rows are queried from public.members');
  mustNotMatch(script, /cwdi_members/i, 'APSG dashboard does not query or combine the CWDI registry');
  const loader = getFunctionSource(script, 'fetchAllMembers');
  mustMatch(loader, /allRows\.push\(\.\.\.data\)/, 'all successful membership pages are combined into the APSG row set');
  mustMatch(getLoadDashboardSource(script), /const members = await memberLoad|const members = await fetchAllMembers/, 'dashboard renderers receive the loaded APSG rows');
  mustMatch(script, /cachedMembers\s*=\s*members/, 'dashboard exports cache the same APSG row set used for metrics');
});

// @spec DASH-DATA-006, DASH-DATA-007
test('rejects incomplete or duplicate offset pages and describes the read as best effort', () => {
  const loader = getFunctionSource(script, 'fetchAllMembers');
  mustMatch(loader, /const ids\s*=\s*allRows\.map\([^\n]*\.id/, 'record IDs are collected for duplicate checks');
  mustMatch(loader, /new Set\(ids\)/, 'duplicate record IDs are rejected');
  mustMatch(loader, /uniqueIds\.size\s*!==\s*totalCount/, 'the unique-row count is validated against the initial exact count');
  mustMatch(loader, /totalCount/, 'loaded row count is compared with the initial exact count');
  mustMatch(`${html}\n${script}`, /best-effort/i, 'pagination limitations are disclosed');
});

// @spec DASH-DATA-008, DASH-DATA-009
test('calculates data quality and open data gaps from the documented categories', () => {
  const metrics = calculateMetrics(script, [
    { pvc_number: 'PVC-1', apc_upload_path: 'apc.png', account_number: '001', phone: ' 111 ', email: 'a@example.test', state: 'Lagos', lga: 'Ojo', ward: 'A' },
    { phone: '111', state: 'Lagos', ward: 'B' },
    { pvc_upload_path: 'pvc.png', apc_card_number: 'APC-3', account_number: '003', phone: '', email: 'c@example.test', state: 'Lagos', lga: 'Ojo', ward: 'C' }
  ]);
  assert.equal(metrics.dataQuality, 67);
  assert.equal(metrics.duplicatePhones, 2, 'each row in a trimmed duplicate group counts');
  assert.equal(metrics.pendingTotal, 7, 'missing data and duplicate records sum as open gaps');
  assert.equal(calculateMetrics(script, []).dataQuality, 0, 'empty registry has zero data quality');
});

// @spec DASH-DATA-010
test('uses half-open local calendar periods and excludes future or invalid timestamps', () => {
  const helper = getFunctionSource(script, 'isWithinLocalPeriod');
  const isWithinLocalPeriod = Function(`${helper}\nreturn isWithinLocalPeriod;`)();
  const now = new Date(2026, 9, 16, 12, 0, 0);
  const start = new Date(2026, 9, 10, 0, 0, 0);
  const endExclusive = new Date(2026, 9, 17, 0, 0, 0);
  assert.equal(isWithinLocalPeriod(new Date(2026, 9, 10, 0, 0, 0), start, endExclusive, now), true, 'start boundary is inclusive');
  assert.equal(isWithinLocalPeriod(new Date(2026, 9, 16, 11, 0, 0), start, endExclusive, now), true, 'past date inside the period is counted');
  assert.equal(isWithinLocalPeriod(new Date(2026, 9, 16, 13, 0, 0), start, endExclusive, now), false, 'future timestamp is excluded');
  assert.equal(isWithinLocalPeriod(endExclusive, start, endExclusive, now), false, 'end boundary is exclusive');
  assert.equal(isWithinLocalPeriod('invalid-date', start, endExclusive, now), false, 'invalid timestamp is excluded');
  mustMatch(script, /previousWeekCount\s*===\s*0\s*\?\s*\(weekCount\s*>\s*0\s*\?\s*100\s*:\s*0\)/, 'zero previous-period growth is defined');
});

// @spec DASH-DATA-011
test('starts membership loading independently of publishing and website analytics', () => {
  const loader = getLoadDashboardSource(script);
  const memberStart = loader.indexOf('fetchAllMembers(');
  const moduleStart = loader.indexOf('Promise.allSettled(');
  assert.ok(memberStart >= 0 && moduleStart >= 0 && memberStart < moduleStart, 'membership request starts before site-report modules are awaited');
  mustMatch(loader, /moduleLoad\.then/, 'site modules render independently after the load starts');
});

// @spec DASH-DATA-012
test('labels bounded table previews while leaving the incomplete export untruncated', () => {
  const latestStart = html.indexOf('aria-label="Latest members"');
  const latest = html.slice(latestStart, html.indexOf('</section>', latestStart));
  const reports = getDetails(html, 'dashboardMoreReports').source;
  const incompleteStart = reports.indexOf('<h3', reports.indexOf('Incomplete Records') - 120);
  const incomplete = reports.slice(incompleteStart, reports.indexOf('</section>', incompleteStart));
  mustMatch(latest, /preview[\s\S]{0,100}8|8[\s\S]{0,100}preview/i, 'latest-members preview cap is disclosed');
  mustMatch(incomplete, /preview[\s\S]{0,100}10|10[\s\S]{0,100}preview/i, 'incomplete-record preview cap is disclosed');
  mustMatch(getFunctionSource(script, 'renderLatestMembers'), /slice\(0,\s*8\)/, 'latest-members preview is limited to 8 rows');
  mustMatch(getFunctionSource(script, 'renderIncompleteRecords'), /slice\(0,\s*10\)/, 'incomplete-record preview is limited to 10 rows');
  mustNotMatch(getFunctionSource(script, 'exportFilteredCsvFile'), /slice\(0,\s*10\)/, 'incomplete-record export is not capped at its preview size');
});

// @spec DASH-DATA-013
test('blocks member exports until a successful fresh or empty load', () => {
  mustMatch(script, /function getFreshMembersForExport\(/, 'a common fresh-data export gate exists');
  for (const name of ['exportFilteredCsvFile', 'exportCsvFile', 'exportAccountCsvFile']) {
    mustMatch(getFunctionSource(script, name), /getFreshMembersForExport\(/, `${name} checks data freshness`);
  }
  mustMatch(script, /status === 'fresh' \|\| status === 'empty'/, 'only fresh and successful-empty data enables exports');
  mustMatch(script, /No matching records available for this export\./, 'successful-empty export gives a no-records result');
});
