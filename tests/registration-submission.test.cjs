const { test } = require('node:test');
const path = require('node:path');
const repoRoot = path.resolve(__dirname, '..');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const submissionPath = path.join(repoRoot, 'assets/js/registration-submission.js');
const submission = fs.existsSync(submissionPath) ? require(submissionPath) : null;
const { createSubmissionService, validateFiles } = submission || {};

test('registration submission service and file validator are present', () => {
  assert.ok(submission, 'registration-submission.js must be promoted with the registration page');
  assert.equal(typeof createSubmissionService, 'function');
  assert.equal(typeof validateFiles, 'function');
});

const fields = { first_name: 'Amina', middle_name: 'Grace', last_name: 'Bello', sex: 'Female', phone: '08012345678' };
const documentFile = { name: 'card.pdf', type: 'application/pdf', size: 200, lastModified: 1 };
function fixture(options = {}) {
  let rows = options.rows || [];
  const calls = [];
  const saved = { ...fields, id: 42, reg_number: `${options.org || 'APSG'}/LA/IKO/2026/000042`, is_youth_wing_member: false };
  const client = {
    storage: { from: () => ({
      upload: async path => { calls.push(['upload', path]); return options.uploadError || (options.secondUploadError && calls.filter(call => call[0] === 'upload').length === 2) ? { error: new Error('upload failed') } : { data: { path } }; },
      getPublicUrl: path => ({ data: { publicUrl: `https://storage.example/${path}` } }),
      remove: async paths => { calls.push(['remove', paths]); return { error: null }; }
    }) },
    rpc: async (name, args) => {
      calls.push(['rpc', name, args]);
      Object.assign(saved, rows.length ? {} : args.p_member, { is_youth_wing_member: Boolean(args.p_youth_wing || saved.is_youth_wing_member) });
      if (options.commitThenError) { rows = [saved]; return { error: new Error('response lost') }; }
      if (options.writeError) return { error: new Error('write failed') };
      rows = [saved];
      return { data: { status: options.rows?.length ? (args.p_youth_wing ? 'youth-wing-added' : 'already-member') : 'registered', reg_number: saved.reg_number } };
    }
  };
  const service = createSubmissionService({ getClient: () => client,
    findMembers: async (_membership, phone) => { calls.push(['lookup', phone]); if (options.lookupError?.(calls.filter(call => call[0] === 'lookup').length)) throw new Error('lookup unavailable'); return rows; },
    verifyMember: async () => saved,
    makePath: (type, file) => `${type}/fixture-${file.name}`
  });
  return { service, calls, saved, data: { fields: { ...fields }, stateCode: 'LA', lgaCode: 'IKO', year: 2026 } };
}

if (submission) {

// @spec REG-SUBMIT-002, REG-SUBMIT-006, REG-SUBMIT-007, REG-SUBMIT-014
for (const org of ['APSG', 'CWDI']) for (const youthWing of [false, true]) {
  test(`${org} ${youthWing ? 'Youth Wing' : 'general'} uses one registry and the saved ID`, async () => {
    const f = fixture({ org });
    const result = await f.service.submit({ organization: org, youthWing }, f.data, { pvc: documentFile });
    assert.equal(f.calls[0][0], 'lookup');
    assert.equal(f.calls[0][1], fields.phone);
    const rpc = f.calls.find(call => call[0] === 'rpc');
    assert.equal(rpc[1], `${org.toLowerCase()}_register_member`);
    assert.equal(rpc[2].p_youth_wing, youthWing);
    assert.equal(rpc[2].p_member.middle_name, 'Grace');
    assert.equal(rpc[2].p_member.sex, 'Female');
    assert.equal(result.regNumber, f.saved.reg_number);
    assert.equal(f.calls.filter(call => call[0] === 'rpc').length, 1);
    assert.equal(f.calls.filter(call => call[0] === 'remove').length, 0);
  });
}

// @spec REG-SUBMIT-003, REG-SUBMIT-005, REG-SUBMIT-015
test('existing member skips selected uploads and retains the stored profile', async () => {
  const row = { ...fields, first_name: 'AMINA', last_name: 'BELLO', middle_name: 'Stored', reg_number: 'APSG/LA/IKO/2026/000042' };
  const f = fixture({ rows: [row] }); f.saved.middle_name = 'Stored';
  const result = await f.service.submit({ organization: 'APSG', youthWing: true }, f.data, { pvc: documentFile });
  assert.equal(f.calls.some(call => call[0] === 'upload'), false);
  assert.equal(result.member.middle_name, 'Stored');
  assert.equal(result.regNumber, row.reg_number);
});

// @spec REG-SUBMIT-010, REG-SUBMIT-015
test('different-name phone conflict prevents uploads and writes', async () => {
  const f = fixture({ rows: [{ ...fields, first_name: 'Another' }] });
  await assert.rejects(f.service.submit({ organization: 'APSG' }, f.data, { pvc: documentFile }), { code: 'REGISTRATION_CONFLICT' });
  assert.equal(f.calls.some(call => ['upload', 'rpc'].includes(call[0])), false);
});

// @spec REG-SUBMIT-016
test('definite failed write cleans only files created by this registration', async () => {
  const f = fixture({ writeError: true });
  await assert.rejects(f.service.submit({ organization: 'APSG' }, f.data, { pvc: documentFile }), /write failed/);
  assert.deepEqual(f.calls.find(call => call[0] === 'remove')[1], ['pvc/fixture-card.pdf']);
});

// @spec REG-SUBMIT-016
test('lost response recovers the saved row and preserves attached uploads', async () => {
  const f = fixture({ commitThenError: true });
  const result = await f.service.submit({ organization: 'APSG' }, f.data, { pvc: documentFile });
  assert.equal(result.regNumber, f.saved.reg_number);
  assert.equal(f.calls.some(call => call[0] === 'remove'), false);
});

// @spec REG-SUBMIT-017
test('two submissions in flight share one write operation', async () => {
  const f = fixture();
  const results = await Promise.all([f.service.submit({ organization: 'APSG' }, f.data), f.service.submit({ organization: 'APSG' }, f.data)]);
  assert.equal(f.calls.filter(call => call[0] === 'rpc').length, 1);
  assert.equal(results[0].regNumber, results[1].regNumber);
});

// @spec REG-FORM-007
test('files enforce advertised formats and 5 MB limit', () => {
  assert.doesNotThrow(() => validateFiles({ pvc: documentFile }));
  assert.throws(() => validateFiles({ pvc: { ...documentFile, size: 5 * 1024 * 1024 + 1 } }), /5 MB/);
  assert.throws(() => validateFiles({ pvc: { ...documentFile, type: 'text/html' } }), /JPG|PNG|PDF/);
});

// @spec REG-SUBMIT-016
test('a failed second upload removes the first upload without a membership write', async () => {
  const f = fixture({ secondUploadError: true });
  await assert.rejects(f.service.submit({ organization: 'APSG' }, f.data, { pvc: documentFile, apc: documentFile }), /upload failed/);
  assert.equal(f.calls.some(call => call[0] === 'rpc'), false);
  assert.deepEqual(f.calls.find(call => call[0] === 'remove')[1], ['pvc/fixture-card.pdf']);
});

// @spec REG-SUBMIT-016
test('uncertain writes retain uploads through a failed lookup and reuse them on retry', async () => {
  const options = { writeError: true, lookupError: count => count === 2 || count === 3 };
  const f = fixture(options);
  await assert.rejects(f.service.submit({ organization: 'APSG' }, f.data, { pvc: documentFile }), /write failed/);
  await assert.rejects(f.service.submit({ organization: 'APSG' }, f.data, { pvc: documentFile }), /lookup unavailable/);
  assert.equal(f.calls.some(call => call[0] === 'remove'), false);
  options.writeError = false;
  await f.service.submit({ organization: 'APSG' }, f.data, { pvc: documentFile });
  assert.equal(f.calls.filter(call => call[0] === 'upload').length, 1);
});
}
