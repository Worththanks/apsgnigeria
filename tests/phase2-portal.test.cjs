const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const base = require('node:path').resolve(__dirname, '..') + require('node:path').sep;
const login = fs.readFileSync(base + 'pages/member-login.html', 'utf8');
function fn(name) {
  const marker = new RegExp(`^    (?:async )?function ${name}\\(`, 'm');
  const start = login.search(marker);
  assert.ok(start >= 0, name);
  const tail = login.slice(start + 1);
  const next = tail.search(/^    (?:async )?function /m);
  return login.slice(start, next < 0 ? login.indexOf('</script>', start) : start + 1 + next);
}
function portal(client, options = {}) {
  const values = new Map();
  const phoneInputs = [];
  const phoneUtils = {
    toE164(value, defaultAlpha2, metadata) {
      phoneInputs.push({ value, defaultAlpha2, metadata });
      if (options.toE164) return options.toE164(value, defaultAlpha2, metadata);
      const normalized = String(value || '').trim();
      if (!/^(?:\+[1-9]\d{6,14}|0\d{7,13})$/.test(normalized)) throw new Error('Enter a valid phone number.');
      return normalized.startsWith('0') && defaultAlpha2 === 'NG'
        ? `+234${normalized.slice(1)}`
        : normalized;
    }
  };
  const context = vm.createContext({
    supabaseClient: client,
    MEMBER_DETAILS_URL: '/admin/member-details.html?mode=member',
    sessionStorage: { setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) },
    els: { memberPhoneCountryCode: { value: 'NG' }, recoveryPhoneCountryCode: { value: 'NG' } },
    phoneUtils,
    countryMetadata: {},
    console
  });
  for (const name of ['normalizePhone','textKey','memberTableForRegistrationNumber','memberDetailsUrl','saveMemberSession','findMemberByRegAndPhone','fetchMembersByPhone']) vm.runInContext(fn(name), context);
  return { context, values, phoneInputs };
}
// @spec PORTAL-LOGIN-001, PORTAL-LOGIN-006
test('CWDI login verifies only its RPC and preserves organization session', async () => {
  const member = { id: 1, reg_number: 'CWDI/LA/IKO/2026/000001', phone: '08012345678' };
  const calls = [];
  const p = portal({
    rpc: async (name, args) => { calls.push({ name, args }); assert.equal(name, 'cwdi_member_login_by_reg_phone'); return { data: member }; },
    from: () => assert.fail('CWDI table read')
  });
  const verified = await p.context.findMemberByRegAndPhone(member.reg_number, member.phone);
  p.context.saveMemberSession(verified);
  assert.equal(p.values.get('apsg_member_portal_source'), 'cwdi_members');
  assert.match(p.context.memberDetailsUrl(verified), /source=cwdi_members/);
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { name: 'cwdi_member_login_by_reg_phone', args: { p_reg_number: member.reg_number, p_phone: '+2348012345678' } });
  assert.equal(p.phoneInputs[0].defaultAlpha2, 'NG');
});
// @spec PORTAL-LOGIN-001, PORTAL-LOGIN-006
test('APSG login stays in APSG and sends one canonical phone to its verification RPC', async () => {
  const member = { id: 1, reg_number: 'APSG/LA/IKO/2026/000001' };
  const calls = [];
  const p = portal({
    rpc: async (name, args) => { calls.push({ name, args }); return { data: member }; },
    from: () => assert.fail('APSG table read')
  });
  assert.equal((await p.context.findMemberByRegAndPhone(member.reg_number, '08012345678'))._sourceTable, 'members');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ name: 'apsg_member_login_by_reg_phone', args: { p_reg_number: member.reg_number, p_phone: '+2348012345678' } }]);
  assert.equal(p.phoneInputs[0].defaultAlpha2, 'NG');
});
// @spec PORTAL-RECOVERY-001, PORTAL-RECOVERY-004
test('recovery searches each organization once with one canonical phone and retains both matches', async () => {
  const calls = [];
  const p = portal({ rpc: async (name, args) => {
    calls.push({ name, args });
    return { data: [{ id: 1, reg_number: name.startsWith('cwdi') ? 'CWDI/1' : 'APSG/1' }] };
  } });
  const rows = await p.context.fetchMembersByPhone('08012345678');
  assert.equal(rows.length, 2);
  assert.deepEqual(Array.from(rows, row => row._sourceTable).sort(), ['cwdi_members','members']);
  assert.deepEqual(calls.map(call => call.name).sort(), ['apsg_find_members_by_phone','cwdi_find_members_by_phone']);
  assert.ok(calls.every(call => call.args.p_phone === '+2348012345678'));
  assert.equal(p.phoneInputs.length, 1);
});
// @spec PORTAL-RECOVERY-001
test('recovery continues with APSG when CWDI lookup is unavailable', async () => {
  const p = portal({ rpc: async name => name.startsWith('cwdi') ? { error: new Error('offline') } : { data: [{ id: 1, reg_number: 'APSG/1' }] } });
  assert.equal((await p.context.fetchMembersByPhone('08012345678')).length, 1);
});

// @spec PORTAL-RECOVERY-004
test('invalid recovery phone is rejected before either registry is queried', async () => {
  const p = portal({ rpc: () => assert.fail('registry lookup must not run for an invalid phone') });
  await assert.rejects(p.context.fetchMembersByPhone('not-a-phone'), /valid phone number/i);
  assert.equal(p.phoneInputs.length, 1);
});
