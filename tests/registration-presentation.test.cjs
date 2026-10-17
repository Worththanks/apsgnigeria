const { test } = require('node:test');
const path = require('node:path');
const repoRoot = path.resolve(__dirname, '..');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const presentationPath = path.join(repoRoot, 'assets/js/registration-presentation.js');
const presentation = fs.existsSync(presentationPath) ? require(presentationPath) : null;
const { actionPlacement, createKeyboardTracker, fieldMessage } = presentation || {};

test('registration presentation source bundle is present', () => {
  assert.ok(presentation, 'registration-presentation.js must be promoted with the registration page');
  assert.ok(fs.existsSync(path.join(repoRoot, 'assets/css/registration-presentation.css')),
    'registration-presentation.css must be promoted with the registration page');
});

// @spec REG-UI-036, REG-UI-037, REG-UI-038, REG-UI-039
test('membership welcome keeps one accessible choice and clear returning-member guidance', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'pages/register.html'), 'utf8');
  const cssPath = path.join(repoRoot, 'assets/css/registration-presentation.css');
  assert.ok(fs.existsSync(cssPath), 'registration-presentation.css must be promoted with the registration page');
  const css = fs.readFileSync(cssPath, 'utf8');
  const inputs = [...html.matchAll(/<input type="radio" name="membershipChoice"[^>]*>/g)].map(match => match[0]);
  assert.match(html, /<h1 id="membershipChoiceTitle"[^>]*>Join your community<\/h1>/);
  assert.match(html, /Choose one organization and membership type to begin\./);
  assert.match(html, /Your residence and contact details come next\./);
  assert.equal(inputs.length, 4);
  assert.ok(inputs.every(input => !/\bchecked\b/.test(input)), 'first entry must not preselect a membership');
  assert.equal((html.match(/role="radiogroup"/g) || []).length, 1);
  assert.equal((html.match(/aria-label="(?:APSG|CWDI) (?:general membership|membership with Youth Wing classification)"/g) || []).length, 4);
  assert.match(html, /Full membership with Youth Wing classification/);
  assert.match(html, /Already a member\?/);
  assert.match(html, /verify your current record first/);
  assert.ok(html.indexOf('id="membershipReturningMemberNote"') < html.indexOf('id="continueRegistrationBtn"'));
  assert.match(css, /\.membership-choice-grid \.membership-choice-options \{ grid-template-columns:minmax\(0,1fr\);/);
  assert.match(css, /@media\(min-width:40rem\)[\s\S]*?membership-choice-options \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\);/);
  assert.match(css, /@media\(min-width:64rem\)[\s\S]*?membership-choice-grid \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important;/);
  assert.match(css, /membership-option input:focus-visible\+span \{ outline:3px solid/);

  const start = html.indexOf('    function updateMembershipChoices()');
  const end = html.indexOf('    document.querySelectorAll(\'input[name="membershipChoice"]\')', start);
  assert.ok(start >= 0 && end > start, 'membership-choice updater must remain directly inspectable');
  const button = { disabled: false };
  const hint = { textContent: '' };
  const invitation = { visible: false, classList: { toggle(_name, hidden) { invitation.visible = !hidden; } } };
  let selected = [];
  const options = ['apsg-member', 'apsg-youth', 'cwdi-member', 'cwdi-youth'].map(value => ({
    input: { checked: false },
    classList: { selected: false, toggle(_name, active) { this.selected = active; } },
    querySelector() { return this.input; },
    value
  }));
  const context = vm.createContext({
    document: {
      getElementById() { return button; },
      querySelectorAll() { return options; }
    },
    membershipChoiceContinueHint: hint,
    youthWingInvitation: invitation,
    readMembershipChoices: () => selected
  });
  vm.runInContext(html.slice(start, end), context);
  context.updateMembershipChoices();
  assert.equal(button.disabled, true);
  assert.equal(hint.textContent, 'Choose one option above to continue.');
  selected = [{ youthWing: true }];
  options[3].input.checked = true;
  context.updateMembershipChoices();
  assert.equal(button.disabled, false);
  assert.equal(hint.textContent, 'Selected. Continue when you are ready.');
  assert.equal(invitation.visible, true);
  assert.equal(options[3].classList.selected, true);
  assert.equal(options[0].classList.selected, false);
});

// @spec REG-UI-010, REG-UI-011, REG-UI-013, REG-UI-020
if (presentation) test('mobile primary action follows viewport, content size, dialog and keyboard state', () => {
  const base = { width:390, height:844, actionHeight:80 };
  assert.equal(actionPlacement(base), 'bottom');
  for (const change of [{width:768},{height:479},{actionHeight:220},{dialog:true},{keyboard:true},{fallbackEditing:true}]) assert.equal(actionPlacement({...base, ...change}), 'flow');
  assert.equal(actionPlacement({...base, height:480, actionHeight:120}), 'bottom');
});

// @spec REG-UI-012, REG-UI-013
if (presentation) test('keyboard reference respects focus, orientation, scale and viewport recovery', () => {
  const tracker = createKeyboardTracker();
  const base = { height:844, scale:1, editing:false, orientation:'portrait' };
  assert.equal(tracker.update(base), false);
  assert.equal(tracker.update({...base,height:600,editing:true}), true);
  assert.equal(tracker.update({...base,height:704,editing:true}), false);
  assert.equal(tracker.update({...base,height:600,scale:2,editing:true}), false);
  assert.equal(tracker.update({...base,height:600,editing:true}), true);
  assert.equal(tracker.update({...base,height:390,orientation:'landscape',editing:true}), false);
  assert.equal(tracker.update({...base,height:390,orientation:'landscape'}), false);
  assert.equal(tracker.update(base), false);
});

// @spec REG-UI-017, REG-FORM-001, REG-FORM-005
if (presentation) test('inline messages preserve optional fields and explain required/invalid values', () => {
  const control = {disabled:false,required:false,value:'',type:'text',validity:{valid:true}};
  assert.equal(fieldMessage(control,'Middle Name'), '');
  assert.equal(fieldMessage({...control,required:true},'First Name'), 'Enter First Name.');
  assert.equal(fieldMessage({...control,required:true,type:'checkbox',checked:false},'Consent'), 'Confirm your consent to continue.');
  assert.equal(fieldMessage({...control,type:'email',value:'invalid',validity:{typeMismatch:true}},'Email Address'), 'Enter a valid email address.');
  assert.equal(fieldMessage({...control,disabled:true,required:true},'Ward'), '');
  assert.equal(fieldMessage({...control,validity:{customError:true},validationMessage:'Choose a PDF.'},'PVC'), 'Choose a PDF.');
});

// @spec REG-UI-006, REG-UI-007, REG-UI-008, REG-UI-009, REG-UI-016, REG-UI-018, REG-UI-019, REG-UI-031, REG-UI-032, REG-UI-033
test('registration integrates one presentation owner with native dialogs and original actions', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'pages/register.html'),'utf8');
  assert.equal((source.match(/<dialog\b/g)||[]).length,1);
  assert.match(source,/<dialog[^>]*id="registrationDialog"/);
  for (const id of ['previewModal','duplicateMemberModal','successModal']) assert.match(source,new RegExp(`<section[^>]*id="${id}"[^>]*hidden[^>]*inert`));
  assert.match(source,/APSGRegistrationPresentation.create/);
  assert.match(source,/registrationPresentation\.validate/);
  assert.match(source,/form.addEventListener\('submit'/);
  assert.doesNotMatch(source,/<footer\b/);
  assert.match(source,/isLocalRegistrationPreview = \['localhost', '127\.0\.0\.1', '::1'\]/);
});

// @spec REG-UI-035, REG-FORM-006
test('review renders applicant text and filenames without interpreting HTML', () => {
  const source=fs.readFileSync(path.join(repoRoot, 'pages/register.html'),'utf8');
  const start=source.indexOf('    function populatePreview()');
  const end=source.indexOf('    let registrationSubmissionService',start);
  assert.ok(start >= 0 && end > start, 'review renderer must be owned by the registration page');
  const nodes={firstName:{value:'Browser <b>Literal</b>'},lastName:{value:'Member'},middleName:{value:''},sex:{value:''},phone:{value:'00000009101'},email:{value:''},pvc:{value:'<number>'},apcCard:{value:''},pvcUpload:{files:[{name:'<local>.pdf'}]},apcUpload:{files:[]}};
  const previewContent={innerHTML:''};
  const context={document:{getElementById:id=>nodes[id]},selectedMemberships:[{organization:'APSG',label:'APSG'}],formData:null,
    levelSelect:{selectedIndex:0,options:[{text:'Volunteer'}]},designationSelect:{value:'<role>'},stateSelect:{value:'Lagos'},lgaSelect:{value:'Ikeja'},wardSelect:{value:'A'},window:{},previewContent,
    countryMetadata:{countries:[{alpha2:'NG',alpha3:'NGA',name:'Nigeria'}]},residenceCountrySelect:{value:'NG'},residenceCityInput:{value:''},residenceStateProvinceInput:{value:''},getRegistrationPhoneE164:()=>nodes.phone.value,
    currentReviewedState:()=>({fields:'synthetic snapshot',membership:'APSG',files:[]}),
    registrationOrganizationBranding:()=>'<div>APSG</div>',escapeRegistrationHtml:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))};
  vm.runInNewContext(source.slice(start,end)+'\npopulatePreview();',context);
  for(const value of ['&lt;b&gt;Literal&lt;/b&gt;','&lt;number&gt;','&lt;role&gt;','&lt;local&gt;.pdf'])assert.ok(previewContent.innerHTML.includes(value),value);
  assert.ok(!previewContent.innerHTML.includes('<b>Literal</b>'));
});

// @spec REG-UI-034
test('Confirm requires the reviewed fields, membership and exact selected files', async () => {
  const source=fs.readFileSync(path.join(repoRoot, 'pages/register.html'),'utf8');
  const controls=[{id:'firstName',type:'text',value:'Browser'}, {id:'consent',type:'checkbox',checked:true}];
  const uploads={pvcUpload:{files:[]},apcUpload:{files:[]}};
  const calls=[];
  const context=vm.createContext({form:{querySelectorAll:()=>controls},document:{getElementById:id=>uploads[id],querySelector:()=>({value:'apsg-member'})},
    selectedMemberships:[{organization:'APSG',youth:false}],registrationSubmitBusy:false,reviewedSnapshot:null,formData:{},
    closePreview:options=>calls.push(['close',options.edit]),registrationPresentation:{announce:message=>calls.push(['error',message])},validateRegistrationFiles:()=>false});
  const snapshotStart=source.indexOf('    function currentReviewedState()');
  const snapshotEnd=source.indexOf('    // @spec REG-BRAND-',snapshotStart);
  const submitStart=source.indexOf('    async function submitForm(isDirect = false)');
  const submitEnd=source.indexOf('        const spinner =',submitStart);
  assert.ok(snapshotStart >= 0 && snapshotEnd > snapshotStart, 'review snapshot gate must remain directly inspectable');
  assert.ok(submitStart >= 0 && submitEnd > submitStart, 'submission entry point must remain directly inspectable');
  vm.runInContext(source.slice(snapshotStart,snapshotEnd)+source.slice(submitStart,submitEnd)+'\n}',context);
  context.reviewedSnapshot=context.currentReviewedState();
  await context.submitForm();
  assert.equal(calls.length,0,'unchanged review passes the snapshot gate');
  for (const mutate of [()=>{controls[0].value='Changed';},()=>{context.selectedMemberships=[{organization:'CWDI',youth:false}];},()=>{uploads.pvcUpload.files=[{name:'changed.pdf'}];}]) {
    context.reviewedSnapshot=context.currentReviewedState();
    mutate(); calls.length=0;
    await context.submitForm();
    assert.equal(calls[0][0],'close');
    assert.match(calls[1][1],/review.*again/);
  }
  context.reviewedSnapshot=context.currentReviewedState();
  uploads.pvcUpload.files=[{name:'changed.pdf'}];
  calls.length=0;
  await context.submitForm();
  assert.equal(calls[0][0],'close','a replacement File with the same name requires review');
  calls.length=0;
  await context.submitForm(true);
  assert.equal(calls.length,0,'direct submission uses its explicit current-value path');
});

// @spec REG-UI-001, REG-UI-002, REG-UI-003, REG-UI-004, REG-UI-005
test('three-stage progress preserves one current step and numbered responsive markers', () => {
  const source=fs.readFileSync(path.join(repoRoot, 'pages/register.html'),'utf8');
  const items=[1,2,3].map(stage=>({dataset:{registrationStage:String(stage)},attrs:{},classes:new Set(),setAttribute(key,value){this.attrs[key]=value;},removeAttribute(key){delete this.attrs[key];}}));
  items.forEach(item=>{item.classList={toggle:(name,enabled)=>enabled?item.classes.add(name):item.classes.delete(name)};});
  const start=source.indexOf('    function setRegistrationStage(stage)');
  const end=source.indexOf('    const REGISTRATION_MEMBERSHIP_CHOICES',start);
  assert.ok(start >= 0 && end > start, 'stage controller must remain directly inspectable');
  const context=vm.createContext({document:{querySelectorAll:()=>items},registrationPresentation:{setStage(){}}});
  vm.runInContext(source.slice(start,end),context);
  context.setRegistrationStage(3);
  assert.deepEqual(items.filter(item=>item.attrs['aria-current']==='step').map(item=>item.dataset.registrationStage),['3']);
  assert.ok(items[0].classes.has('is-complete'));
  context.setRegistrationStage(1);
  assert.equal(items.filter(item=>item.attrs['aria-current']==='step').length,1);
  assert.ok(!items[2].classes.has('is-complete'));
  assert.match(source,/registration-stepper[^}]*grid-template-columns:\s*repeat\(3/);
  assert.match(source,/\.step-label[^}]*overflow-wrap:\s*anywhere/);
  assert.match(source,/prefers-reduced-motion:\s*reduce/);
  assert.equal((source.match(/data-registration-stage="[123]"/g)||[]).length,3);
});
