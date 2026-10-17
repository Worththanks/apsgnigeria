const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const submissionPath = path.resolve(__dirname, '..', 'assets/js/registration-submission.js');
const submissionApi = fs.existsSync(submissionPath) ? require(submissionPath) : null;
const { createSubmissionService } = submissionApi || {};

const base = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(base, relative), 'utf8');
const expectSource = (source, pattern, message) => assert.ok(pattern.test(source), message || `Expected source to satisfy ${pattern}`);
const expectNoSource = (source, pattern, message) => assert.ok(!pattern.test(source), message || `Expected source not to satisfy ${pattern}`);

// @spec REG-UI-006
test('registration masthead exposes a visible Home button link', () => {
  const page = read('pages/register.html');
  const css = read('assets/css/registration-presentation.css');
  const navStart = page.indexOf('<nav class="registration-shortcuts"');
  const navEnd = page.indexOf('</nav>', navStart);
  const nav = page.slice(navStart, navEnd);
  expectSource(nav, /<a\b(?=[^>]*class="[^"]*registration-home-button)(?=[^>]*href="\/")[^>]*>\s*Home\s*<\/a>/i,
    'the registration masthead includes a clearly labeled Home link to the site root');
  expectSource(css, /\.registration-home-button[\s\S]*?min-height:\s*48px[\s\S]*?border/, 'the Home link has button-sized, visibly bounded styling');
  expectSource(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?\.apsg-registration \.registration-shortcuts\s*\{\s*gap:\s*8px;/,
    'the compact masthead keeps its Home control within narrow screens');
});

// @spec REG-UI-040, REG-UI-041, REG-FORM-017, REG-FORM-018, REG-FORM-023
test('registration keeps personal, residence and contact details ordered and phone controls independent', () => {
  const page = read('pages/register.html');
  const css = read('assets/css/registration-presentation.css');
  const formStart = page.indexOf('<form id="regForm"');
  const formEnd = page.indexOf('</form>', formStart);
  const form = page.slice(formStart, formEnd);
  const personal = form.indexOf('Personal details');
  const residence = form.indexOf('Country of Residence');
  const contact = form.indexOf('Contact Details');
  assert.ok(personal >= 0 && personal < residence && residence < contact, 'details groups follow the approved order');
  expectNoSource(form, /Role &amp; Designation|Role & Designation/, 'role fields are part of Personal details');
  const personalGroup = form.slice(personal, residence);
  for (const id of ['firstName', 'middleName', 'lastName', 'sex', 'level', 'designation']) expectSource(personalGroup, new RegExp(`id="${id}"`), `${id} is in Personal details`);

  const primary = form.indexOf('id="phone"');
  const email = form.indexOf('id="email"');
  const secondary = form.indexOf('id="nigerianPhone"');
  const preference = form.indexOf('name="preferred_contact_type"');
  assert.ok(primary >= 0 && primary < email && email < secondary && secondary < preference, 'primary contact and email precede diaspora-only contact controls');
  const secondaryControl = form.slice(secondary - 500, preference + 700);
  expectSource(secondaryControl, /\+234/, 'the secondary phone uses a fixed +234 prefix');
  expectSource(secondaryControl, /aria-describedby=/, 'the secondary phone has linked help or error text');
  expectSource(secondaryControl, /role="radiogroup"|fieldset/, 'the preference choices have a named group');
  expectNoSource(secondaryControl, /(?:id|name)="(?:nigerian_phone_e164|preferred_contact_type)"[^>]*\brequired\b/, 'optional contact fields are conditionally validated');
  expectSource(form, /id="phone"[^>]*\brequired\b/, 'the primary phone remains required');
  expectSource(css, /@media\s*\(max-width:\s*767px\)[\s\S]*?#regForm \.grid\s*\{[^}]*grid-template-columns:minmax\(0,1fr\)/, 'the narrow registration layout uses one column');
  expectSource(css, /#regForm \.primary-phone-row\s*\{[\s\S]*?grid-template-columns:minmax\(13rem,\.9fr\) minmax\(0,1\.5fr\)/, 'the primary calling code and number share a compact row');
  expectSource(css, /@media\s*\(max-width:\s*39\.999rem\)[\s\S]*?#regForm \.primary-phone-row\s*\{[^}]*grid-template-columns:minmax\(0,1fr\)!important/, 'the primary phone controls stack at narrow widths');
  expectSource(css, /#regForm \.nigerian-phone-row\s*\{[\s\S]*?grid-template-columns:max-content minmax\(0,1fr\)/, 'the fixed +234 prefix sits beside its input');
  expectSource(form, /id="nigeriaHomeLocation"[\s\S]*?grid-cols-1[\s\S]*?md:grid-cols-2[\s\S]*?lg:grid-cols-3/, 'Nigerian geography reflows from two to three columns');
});

// @spec REG-FORM-019, REG-FORM-020, REG-FORM-021, REG-FORM-022, REG-FORM-024, REG-UI-042, REG-UI-043
test('residence transitions and review handle diaspora contact and Nigerian home location explicitly', () => {
  const page = read('pages/register.html');
  const start = page.indexOf('    function updateResidenceFields()');
  const end = page.indexOf('    function getRegistrationPhoneE164()', start);
  const residenceUpdate = page.slice(start, end);
  const reviewStart = page.indexOf('    function populatePreview()');
  const reviewEnd = page.indexOf('    let registrationSubmissionService', reviewStart);
  const review = page.slice(reviewStart, reviewEnd);

  assert.ok(start >= 0 && end > start);
  expectSource(residenceUpdate, /nigerianPhone|nigerianContact/i, 'secondary number visibility follows residence');
  expectSource(residenceUpdate, /preferredContact/i, 'contact preference visibility follows the valid secondary number');
  expectSource(residenceUpdate, /preferredContactGroup\.classList\.toggle\('hidden',\s*!validOptionalNumber\)/, 'preference choices appear only for a valid Nigerian contact number');
  expectSource(residenceUpdate, /if \(!validOptionalNumber\) preferredContactRadios\.forEach\(radio => \{ radio\.checked = false; \}\)/, 'a blank or invalid secondary number clears the prior preference');
  expectSource(page, /residenceCountrySelect\.addEventListener\('change'[\s\S]{0,180}(?:clear|reset|transition)/i, 'country changes clear only fields whose meaning changed');
  expectSource(page, /document\.activeElement[\s\S]{0,220}(?:residenceCountrySelect|residenceCountry)/i, 'focus moves to the residence selector if an updated visibility rule hides focus');
  expectSource(review, /nigerian_phone_e164|nigerianPhone/i, 'review reads the optional Nigerian number');
  expectSource(review, /preferred_contact_type|preferredContact/i, 'review reads the saved contact preference');
  expectSource(review, /Nigerian home location/, 'review separates Nigerian home location');
  expectSource(review, /residenceCountryCode[\s\S]{0,200}(?:nigerian|Nigerian)/i, 'review branches on verified residence');
  expectSource(page, /(?:primary|nigerian)[\s\S]{0,100}(?:contact preference|preferred contact)/i, 'the preferred contact labels are explicit');
});

function submissionFixture() {
  const calls = [];
  const client = {
    storage: { from: () => ({ upload: async () => ({ data: {} }), getPublicUrl: () => ({ data: { publicUrl: 'https://storage.invalid/file' } }), remove: async () => ({ error: null }) }) },
    rpc: async (name, args) => {
      calls.push(['rpc', name, args]);
      return { data: { status: 'registered', reg_number: 'APSG/DIA/GBR/2026/000001' } };
    }
  };
  const service = createSubmissionService({
    getClient: () => client,
    findMembers: async (_membership, phone) => { calls.push(['lookup', phone]); return []; },
    verifyMember: async () => null,
    makePath: () => 'fixture/file.pdf'
  });
  const data = {
    stateCode: '', lgaCode: '', year: 2026,
    fields: {
      first_name: 'Amina', last_name: 'Bello', phone: '+447700900123',
      residence_country_code: 'GBR', residence_city: 'London', residence_state_province: 'England',
      nigerian_phone_e164: '+2348012345678', preferred_contact_type: 'nigerian'
    }
  };
  return { service, data, calls };
}

if (createSubmissionService) {
// @spec REG-SUBMIT-033, REG-SUBMIT-034, REG-SUBMIT-035, REG-SUBMIT-036, REG-SUBMIT-037
test('submission validates the optional pair before lookup and keeps the primary phone as identity', async () => {
  const registerPage = read('pages/register.html');
  const valid = submissionFixture();
  await valid.service.submit({ organization: 'APSG', youthWing: false }, valid.data);
  assert.deepEqual(valid.calls.filter(call => call[0] === 'lookup').map(call => call[1]), ['+447700900123']);
  const payload = valid.calls.find(call => call[0] === 'rpc')[2].p_member;
  assert.equal(payload.nigerian_phone_e164, '+2348012345678');
  assert.equal(payload.preferred_contact_type, 'nigerian');

  for (const mutate of [
    fields => { fields.preferred_contact_type = ''; },
    fields => { fields.nigerian_phone_e164 = '+447700900456'; fields.preferred_contact_type = 'nigerian'; },
    fields => { fields.nigerian_phone_e164 = fields.phone; fields.preferred_contact_type = 'nigerian'; },
    fields => { fields.residence_country_code = 'NGA'; }
  ]) {
    const fixture = submissionFixture();
    mutate(fixture.data.fields);
    await assert.rejects(fixture.service.submit({ organization: 'APSG' }, fixture.data));
    assert.deepEqual(fixture.calls, [], 'invalid contact state is rejected before a primary-phone lookup or write');
  }

  const omitted = submissionFixture();
  omitted.data.fields.nigerian_phone_e164 = '  ';
  omitted.data.fields.preferred_contact_type = '';
  await omitted.service.submit({ organization: 'APSG' }, omitted.data);
  const omittedPayload = omitted.calls.find(call => call[0] === 'rpc')[2].p_member;
  assert.equal(omittedPayload.nigerian_phone_e164, null);
  assert.equal(omittedPayload.preferred_contact_type, null);
  expectSource(registerPage, /savedContact:\s*registrationReceiptContact\(registrationResults\[0\]\.member\)/, 'existing-member receipts use only the phone-and-registration-number-verified profile for saved contact details');
  expectSource(registerPage, /saved contact details were kept/i, 'existing-member messaging confirms that saved contacts remain unchanged');
  expectSource(registerPage, /These are the saved values from your verified profile/, 'receipt contact values are identified as verified saved profile data');
});


}
