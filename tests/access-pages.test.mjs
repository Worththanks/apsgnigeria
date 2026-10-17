import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');

const adminHtml = read('admin/login.html');
const memberHtml = read('pages/member-login.html');
const accessCss = read('assets/css/deployment-polish.css');
const sharedCss = read('assets/css/styles.css');
const utilityCss = read('assets/css/tailwind-static.css');

function idsIn(html) {
  return [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
}

function cssRules(css) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].trim(),
    declarations: match[2].trim(),
  }));
}

function scopedRules(css, formId, selectorPart) {
  const scope = new RegExp(`body\\s*:has\\(\\s*#${formId}\\s*\\)`, 'i');
  return cssRules(css).filter(({ selector }) => scope.test(selector) && selector.includes(selectorPart));
}

// @spec ACCESS-UI-001
test('both access pages retain the shared palette and typography resources', () => {
  for (const token of ['--apsg-deep', '--apsg-green', '--apsg-gold', '--apsg-cream']) {
    assert.match(accessCss, new RegExp(`${token}\\s*:`));
  }

  for (const html of [adminHtml, memberHtml]) {
    assert.match(html, /family=Inter/);
    assert.match(html, /family=Playfair\+Display/);
  }
  assert.match(sharedCss, /font-family:\s*Inter/);
  assert.match(sharedCss, /font-family:\s*["']Playfair Display["']/);

  for (const [formId, pageName] of [['memberForm', 'admin'], ['singleLoginForm', 'member']]) {
    const heroRules = scopedRules(accessCss, formId, '.login-hero');
    assert.ok(heroRules.some(({ declarations }) => /url\(["']?\/assets\/images\/hero\/hero1\.jpg/i.test(declarations)),
      `${pageName} login must preserve the existing hero background image`);
  }
});

// @spec ACCESS-UI-010
test('access styling is scoped through existing form IDs without HTML hooks', () => {
  for (const html of [adminHtml, memberHtml]) {
    assert.match(html, /href="\/assets\/css\/deployment-polish\.css"/);
    assert.doesNotMatch(html, /data-access-page=/);
  }
  assert.ok(scopedRules(accessCss, 'memberForm', 'body:has(#memberForm)').length > 0,
    'admin access styling must be scoped to its existing member form');
  assert.ok(scopedRules(accessCss, 'singleLoginForm', 'body:has(#singleLoginForm)').length > 0,
    'member access styling must be scoped to its existing login form');
});

// @spec ACCESS-UI-002
test('admin access context cards stay quieter than the primary form panel', () => {
  const adminCards = scopedRules(accessCss, 'memberForm', '.access-card');
  const adminPanel = scopedRules(accessCss, 'memberForm', '.premium-panel');
  const missing = [];
  if (!adminCards.length || !adminCards.some(({ declarations }) => /(?:background|border)\s*:/.test(declarations))) {
    missing.push('quiet page-scoped surface treatment for the three access cards');
  }
  if (!adminPanel.length || !adminPanel.some(({ declarations }) => /box-shadow\s*:/.test(declarations))) {
    missing.push('page-scoped primary treatment for the admin form panel');
  }
  assert.deepEqual(missing, []);
});

// @spec ACCESS-UI-003, ACCESS-UI-004
test('member login hierarchy and approved responsive breakpoints remain intact', () => {
  const memberPanel = scopedRules(accessCss, 'singleLoginForm', '.premium-panel');
  assert.ok(memberPanel.length > 0, 'member credential panel needs a page-scoped primary treatment');

  assert.match(adminHtml, /lg:grid-cols-\[0\.95fr_1\.05fr\]/);
  assert.match(utilityCss, /@media\s*\(min-width:\s*1024px\)/);
  assert.match(memberHtml, /id="recoveryPanel"[^>]*class="[^"]*\bhidden\b/);
  assert.match(accessCss, /@media\s*\(max-width:\s*767px\)[\s\S]*?body:has\(#singleLoginForm\)\s+\.recovery-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(accessCss, /body\s*\{[^}]*min-width:\s*320px/s);
  assert.match(accessCss, /@media\s*\(max-width:\s*639px\)[\s\S]*?body:has\(#memberForm\)\s+\.login-hero\s*>\s*section\s*>\s*div:first-child\s*>\s*\.grid\s*\{\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(accessCss, /body:has\(#memberForm\)\s+\.premium-panel\s+\.mt-5\s+a\s*\{\s*min-height:\s*44px/s);
  assert.match(accessCss, /body:has\(#singleLoginForm\)\s+\.premium-panel\s*>\s*div:first-child\s*>\s*div:first-child\s*\{\s*width:\s*4rem/s);
});

// @spec ACCESS-UI-005, ACCESS-UI-006, ACCESS-UI-009
test('focus, reduced-motion, status, theme, and inactive-state protections remain available', () => {
  assert.match(accessCss, /:focus-visible/);
  assert.match(accessCss, /prefers-reduced-motion\s*:\s*reduce/);
  assert.match(utilityCss, /\.hidden\s*\{\s*display:\s*none\s*!important\s*\}/);
  assert.match(sharedCss, /html\.carbon\s+\.premium-panel/);
  assert.match(sharedCss, /html\.carbon\s+\.form-input/);

  for (const id of ['loginError', 'successNotice']) {
    assert.ok(adminHtml.includes(`id="${id}"`));
    assert.ok(memberHtml.includes(`id="${id}"`));
  }

  const scopedHiddenRules = cssRules(accessCss).filter(({ selector }) =>
    /body\s*:has\(\s*#(?:memberForm|singleLoginForm)\s*\)/i.test(selector) && selector.includes('.hidden'));
  assert.ok(scopedHiddenRules.every(({ declarations }) => /display\s*:\s*none\s*!important/i.test(declarations)),
    'access-page rules must not expose elements marked hidden');
});

// @spec ACCESS-UI-004
test('icon-bearing access inputs keep text clear of their leading icons', () => {
  for (const [formId, pageName] of [['memberForm', 'admin'], ['singleLoginForm', 'member']]) {
    const inputRules = scopedRules(accessCss, formId, '.form-input');
    assert.ok(inputRules.some(({ declarations }) => /padding-left\s*:\s*2\.75rem/.test(declarations)),
      `${pageName} inputs need enough left padding to clear their leading icons`);
  }
});

// @spec ACCESS-UI-007
test('password controls gain CSS-generated visible labels', () => {
  for (const [formId, buttonId] of [
    ['memberForm', 'togglePasswordBtn'],
    ['singleLoginForm', 'toggleSecretBtn'],
  ]) {
    const buttonRules = scopedRules(accessCss, formId, `#${buttonId}::`);
    assert.ok(buttonRules.some(({ selector, declarations }) =>
      /#(?:togglePasswordBtn|toggleSecretBtn)::(?:before|after)/.test(selector) &&
      /content\s*:\s*["'][^"']*show\s*\/\s*hide[^"']*["']/i.test(declarations)),
    `${buttonId} needs a CSS-generated visible “Show / hide” label`);
  }

});

// @spec ACCESS-UI-008
test('long member identity and recovery values stay contained within the page', () => {
  const recoveryCards = scopedRules(accessCss, 'singleLoginForm', '.identity-card');
  const recoveredId = scopedRules(accessCss, 'singleLoginForm', '.apsg-id-pill');
  const registrationInput = scopedRules(accessCss, 'singleLoginForm', '#identityInput');

  assert.ok(recoveryCards.some(({ declarations }) =>
    /min-width\s*:\s*0/.test(declarations) && /(?:overflow-wrap\s*:\s*anywhere|word-break\s*:\s*break-word)/.test(declarations)));
  assert.ok(recoveredId.some(({ declarations }) => /(?:max-width\s*:\s*100%|overflow-wrap\s*:\s*anywhere)/.test(declarations)));
  assert.ok(registrationInput.some(({ declarations }) => /max-width\s*:\s*100%/.test(declarations)));
});

// @spec ACCESS-UI-011, ACCESS-BEH-008, ACCESS-BEH-009
test('existing labels, recovery steps, links, and script-target IDs remain present and unique', () => {
  const adminRequiredIds = [
    'memberTab', 'adminTab', 'memberForm', 'adminForm', 'regInput', 'phoneInput', 'emailInput',
    'passwordInput', 'togglePasswordBtn', 'memberLoginBtn', 'adminLoginBtn', 'loginError',
    'successNotice', 'successText', 'helperNotice', 'helperText', 'snowThemeBtn', 'carbonThemeBtn',
  ];
  const memberRequiredIds = [
    'singleLoginForm', 'identityInput', 'secretInput', 'toggleSecretBtn', 'loginBtn', 'forgotApsgIdBtn',
    'loginError', 'successNotice', 'successText', 'recoveryPanel', 'recoveryLookupStep',
    'recoveryConfirmStep', 'recoveryRevealStep', 'recoveryContactStep', 'recoveryPhoneInput',
    'recoveryLocalInput', 'findApsgIdBtn', 'recoveryBackBtn', 'candidateName', 'candidateState',
    'candidateLga', 'candidateWard', 'recoveredApsgId', 'recoveredFullName', 'recoveredState',
    'recoveredLga', 'recoveredWard', 'recoveredPhoneVerifyInput', 'recoveredLoginBtn',
    'recoveryRestartBtn', 'contactBackLoginBtn',
  ];

  for (const [html, requiredIds] of [[adminHtml, adminRequiredIds], [memberHtml, memberRequiredIds]]) {
    const ids = idsIn(html);
    assert.equal(new Set(ids).size, ids.length, 'every existing script-target ID must remain unique');
    for (const id of requiredIds) assert.ok(ids.includes(id), `missing existing ID: ${id}`);
  }

  for (const copy of [
    'Registration Number', 'Phone Number', 'Admin Email Address', 'Access note',
    'Forgot your APSG ID', 'Local Area / LGA / Ward',
    'We found a possible APSG record', 'Ask your APSG coordinator',
  ]) {
    assert.ok(`${adminHtml}\n${memberHtml}`.includes(copy), `existing copy should remain: ${copy}`);
  }
  assert.match(adminHtml, /href="\/pages\/register\.html"/);
  assert.match(memberHtml, /href="\/pages\/register\.html"/);
  assert.match(adminHtml, /const MEMBER_DETAILS_URL = '\/admin\/member-details\.html\?mode=member'/);
  assert.match(memberHtml, /const MEMBER_DETAILS_URL = '\/admin\/member-details\.html\?mode=member'/);
});

// @spec ACCESS-UI-012
test('user-facing copy omits provider names, internal route names, paths, and query instructions', () => {
  for (const implementationCopy of [
    'Supabase login',
    'Supabase authentication',
    'Use <strong>?portal=admin</strong> to open this tab by default.',
    'member-details.html</strong>',
    'Supabase client is not available. Please check /assets/js/supabase-clients.js.',
    'Supabase auth client is not available. Please check /assets/js/supabase-clients.js.',
    'Unable to check Supabase right now. Please try again.',
  ]) {
    assert.ok(!`${adminHtml}\n${memberHtml}`.includes(implementationCopy),
      `remove implementation detail from user-facing copy: ${implementationCopy}`);
  }
  assert.doesNotMatch(adminHtml, /showError\(\s*error\?\.message/,
    'raw authentication-provider errors must not be displayed');
});

// @spec ACCESS-UI-013
test('service failures display the approved plain-language guidance', () => {
  assert.ok(adminHtml.includes('Sign-in is temporarily unavailable. Please try again shortly.'));
  assert.ok(adminHtml.includes("We couldn't sign you in. Check your details and try again."));
  assert.ok(memberHtml.includes("We couldn't look up your APSG ID right now. Please try again shortly."));
});
