/* =========================================================
   APSG Involvement Suite - World-Class Process Layer
   Forms, reference generation, acknowledgement PDF, audit log,
   WhatsApp/email handoff, local export and optional Supabase hook.
   Requires: jsPDF, jsPDF AutoTable, QRious for PDF receipts.
   ========================================================= */
(function () {
  'use strict';

  const DEFAULT_CONTACT = {
    whatsapp: '2348023154308',
    email: 'info@apsgnigeria.org',
    org: 'APC Progressive Support Group (APSG)',
    shortOrg: 'APSG Nigeria',
    website: 'www.apsgnigeria.org',
    logo: '/assets/images/logo/apsg.png',
    verificationBaseUrl: '/pages/verify-receipt.html?ref=',
    donationAccount: {
      accountName: 'APSG',
      accountNumber: '2023394018',
      bankName: 'KUDA Microfinance'
    }
  };

  const CONTACT = Object.assign({}, DEFAULT_CONTACT, window.APSG_CONTACT || {});
  const STORAGE_KEY = 'apsg_involvement_submissions_v2';
  const SESSION_KEY = 'apsg_last_involvement_payload';
  let lastReceiptPayload = null;

  const TYPE_MAP = {
    DONATION: { code: 'DON', label: 'APSG Donation Pledge Acknowledgement', status: 'PLEDGE RECEIVED / AWAITING PAYMENT INSTRUCTION', icon: 'heart-circle-check' },
    DONATION_PAYMENT: { code: 'PAY', label: 'APSG Donation Transfer Confirmation', status: 'TRANSFER DECLARED / PENDING APSG VERIFICATION', icon: 'money-check-dollar' },
    SPONSOR: { code: 'SPN', label: 'Sponsorship Interest Acknowledgement', status: 'SUBMITTED / AWAITING APSG PARTNERSHIP FOLLOW-UP', icon: 'award' },
    VOLUNTEER: { code: 'VOL', label: 'Volunteer Application Acknowledgement', status: 'SUBMITTED / AWAITING APSG VOLUNTEER DESK FOLLOW-UP', icon: 'people-carry-box' },
    RSVP: { code: 'RSV', label: 'RSVP Attendance Acknowledgement', status: 'RSVP SUBMITTED / AWAITING EVENT DESK CONFIRMATION', icon: 'ticket' },
    INVOLVE: { code: 'INV', label: 'APSG Involvement Acknowledgement', status: 'SUBMITTED / AWAITING APSG FOLLOW-UP', icon: 'handshake-angle' }
  };

  function qs(id) { return document.getElementById(id); }
  function qsa(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function safe(value) { return String(value == null ? '' : value).trim(); }
  function normalizeType(type) { return TYPE_MAP[String(type || 'INVOLVE').toUpperCase()] ? String(type || 'INVOLVE').toUpperCase() : 'INVOLVE'; }
  function typeMeta(type) { return TYPE_MAP[normalizeType(type)]; }
  function escapeHtml(value) {
    return safe(value).replace(/[&<>'"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch];
    });
  }
  function initials(name) {
    const parts = safe(name).split(/\s+/).filter(Boolean).slice(0, 3);
    return (parts.map(function (word) { return word[0]; }).join('').toUpperCase() || 'APSG').replace(/[^A-Z0-9]/g, '');
  }
  function shortHash(input) {
    let hash = 2166136261;
    const str = safe(input);
    for (let i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash >>> 0).toString(36).toUpperCase().slice(0, 5);
  }
  function parseAmount(value) {
    const cleaned = safe(value).replace(/[NGN,\s]/gi, '').replace(/[^0-9.]/g, '');
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }
  function money(value) {
    const numeric = parseAmount(value);
    if (numeric == null) return safe(value) || 'To be confirmed';
    return 'NGN ' + numeric.toLocaleString('en-NG');
  }
  function nowParts(date) {
    const d = date || new Date();
    return {
      year: d.getFullYear(),
      stamp: [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join(''),
      time: [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join('')
    };
  }
  function buildReference(type, name, seed) {
    const meta = typeMeta(type);
    const p = nowParts();
    const source = [type, name, seed || '', p.stamp, p.time, Math.random().toString(36)].join('|');
    return ['APSG', meta.code, p.stamp, initials(name), p.time + shortHash(source)].join('/');
  }
  function getLocalRecords() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (_) { return []; }
  }
  function setLocalRecords(records) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 250))); } catch (_) {}
  }
  function storePayload(payload) {
    const records = getLocalRecords().filter(function (row) { return row.reference !== payload.reference; });
    records.unshift(payload);
    setLocalRecords(records);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload)); } catch (_) {}
  }
  function getFieldCandidates(data, keys) {
    for (let i = 0; i < keys.length; i += 1) {
      if (safe(data[keys[i]])) return safe(data[keys[i]]);
    }
    return '';
  }
  function getFormFields(form) {
    const formData = new FormData(form);
    const fields = [];
    const data = {};
    for (const pair of formData.entries()) {
      const key = safe(pair[0]);
      const value = safe(pair[1]);
      if (!key || !value) continue;
      data[key] = value;
      fields.push([key, value]);
    }
    return { data: data, fields: fields };
  }
  function formToPayload(formId, title, type) {
    const form = qs(formId);
    if (!form) return null;
    const normalizedType = normalizeType(type || form.dataset.receiptType || 'INVOLVE');
    const meta = typeMeta(normalizedType);
    const result = getFormFields(form);
    const name = getFieldCandidates(result.data, ['Full Name', 'Sponsor Name', 'Organisation / Individual Name', 'Name', 'Contact Person']) || 'APSG Participant';
    const email = getFieldCandidates(result.data, ['Email', 'Email Address']);
    const phone = getFieldCandidates(result.data, ['Phone', 'Phone / WhatsApp', 'WhatsApp']);
    const amount = getFieldCandidates(result.data, ['Pledge Amount', 'Amount Transferred', 'Proposed Support Value', 'Support Value', 'Amount', 'Donation Amount']);
    const category = getFieldCandidates(result.data, ['Support Category', 'Sponsor Category', 'Volunteer Unit', 'Event', 'Payment Channel', 'Category']) || meta.label;
    const reference = form.dataset.reference || buildReference(normalizedType, name, JSON.stringify(result.data));
    form.dataset.reference = reference;
    const createdAt = form.dataset.createdAt || new Date().toISOString();
    form.dataset.createdAt = createdAt;
    const verificationUrl = CONTACT.verificationBaseUrl ? new URL(CONTACT.verificationBaseUrl + encodeURIComponent(reference), window.location.origin).href : '';

    return {
      id: reference.replace(/[^A-Z0-9]/gi, '-'),
      formId: formId,
      title: title || meta.label,
      type: normalizedType,
      typeCode: meta.code,
      label: meta.label,
      name: name,
      email: email,
      phone: phone,
      category: category,
      amount: amount,
      reference: reference,
      fields: result.fields,
      data: result.data,
      createdAt: createdAt,
      status: meta.status,
      verificationUrl: verificationUrl,
      channel: 'web',
      sourcePage: window.location.pathname
    };
  }
  function showToast(message, mode) {
    let toast = qs('toastCopy');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toastCopy';
      toast.className = 'toast-copy';
      document.body.appendChild(toast);
    }
    const icon = mode === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check';
    toast.innerHTML = '<i class="fas ' + icon + '" aria-hidden="true"></i><span>' + escapeHtml(message) + '</span>';
    toast.classList.toggle('is-error', mode === 'error');
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }
  function buildWhatsAppUrl(message) {
    if (!CONTACT.whatsapp) return '#';
    return 'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(message);
  }
  function linesFromPayload(payload) {
    const lines = [payload.title, '', 'Reference: ' + payload.reference, 'Status: ' + payload.status, 'Type: ' + payload.label, ''];
    payload.fields.forEach(function (item) { lines.push(item[0] + ': ' + item[1]); });
    lines.push('', 'Please follow up through official APSG channels.');
    if (payload.verificationUrl) lines.push('Verification: ' + payload.verificationUrl);
    return lines;
  }
  function prefillPaymentFlow(payload) {
    if (!payload || payload.type !== 'DONATION') return;
    const panel = document.querySelector('[data-payment-panel]');
    if (!panel) return;
    panel.classList.add('is-unlocked');
    const refEl = panel.querySelector('[data-payment-source-ref]');
    if (refEl) refEl.textContent = payload.reference;
    const values = {
      paymentOriginalReference: payload.reference,
      paymentFullName: payload.name,
      paymentPhone: payload.phone,
      paymentEmail: payload.email,
      paymentAmount: parseAmount(payload.amount) ? String(parseAmount(payload.amount)) : safe(payload.amount),
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentNarration: payload.reference + ' - ' + payload.name
    };
    Object.keys(values).forEach(function (id) {
      const el = qs(id);
      if (el && values[id] && !el.value) el.value = values[id];
    });
  }
  function copyPaymentReference() {
    const ref = safe((qs('paymentOriginalReference') || {}).value) || safe((document.querySelector('[data-payment-source-ref]') || {}).textContent);
    if (!ref || ref === 'Generate pledge first') return showToast('Generate your pledge reference first', 'error');
    copy(ref, 'Pledge reference copied');
  }
  function validatePaymentConfirmation(form) {
    const details = qs('paymentReceivedOfficialDetails');
    const transferred = qs('paymentTransferredDeclaration');
    if (details && !details.checked) {
      showToast('Confirm that you used the official APSG KUDA Microfinance account first', 'error');
      details.focus({ preventScroll: true });
      return false;
    }
    if (transferred && !transferred.checked) {
      showToast('Confirm that you have transferred the money before submitting', 'error');
      transferred.focus({ preventScroll: true });
      return false;
    }
    return true;
  }
  function submitPaymentConfirmation(event, formId, title) {
    if (event) event.preventDefault();
    const form = qs(formId);
    if (!form) return false;
    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }
    if (!validatePaymentConfirmation(form)) return false;
    const payload = formToPayload(formId, title || 'APSG Donation Transfer Confirmation', 'DONATION_PAYMENT');
    if (!payload) return false;
    payload.relatedReference = safe((qs('paymentOriginalReference') || {}).value);
    payload.status = typeMeta('DONATION_PAYMENT').status;
    payload.channel = 'payment-confirmation';
    updateReceiptCard(payload);
    optionalRemoteStore(payload);
    const lines = linesFromPayload(payload);
    lines.splice(3, 0, 'Original Pledge Reference: ' + (payload.relatedReference || 'Not supplied'));
    const url = buildWhatsAppUrl(lines.join('\n'));
    if (url !== '#') window.open(url, '_blank', 'noopener');
    generateAPSGReceipt(payload);
    showToast('Transfer confirmation submitted for APSG verification');
    return false;
  }
  function updateReceiptCard(payload) {
    lastReceiptPayload = payload;
    storePayload(payload);
    prefillPaymentFlow(payload);
    const card = document.querySelector('[data-receipt-card]');
    if (!card) return;
    card.classList.remove('hidden');
    card.classList.add('is-ready');
    const map = {
      '[data-receipt-ref]': payload.reference,
      '[data-receipt-name]': payload.name,
      '[data-receipt-type]': payload.label,
      '[data-receipt-status]': payload.status,
      '[data-receipt-amount]': money(payload.amount),
      '[data-receipt-date]': new Date(payload.createdAt).toLocaleString('en-GB')
    };
    Object.keys(map).forEach(function (selector) {
      const el = card.querySelector(selector);
      if (el) el.textContent = map[selector];
    });
    const copyButton = card.querySelector('[data-copy-ref]');
    if (copyButton) copyButton.dataset.copyValue = payload.reference;
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  async function optionalRemoteStore(payload) {
    try {
      if (!window.supabaseClient || !window.APSG_INVOLVEMENT_REMOTE_TABLE) return;
      await window.supabaseClient.from(window.APSG_INVOLVEMENT_REMOTE_TABLE).insert({
        reference: payload.reference,
        type: payload.type,
        name: payload.name,
        phone: payload.phone || null,
        email: payload.email || null,
        category: payload.category || null,
        amount: parseAmount(payload.amount),
        status: payload.status,
        payload: payload,
        source_page: payload.sourcePage,
        created_at: payload.createdAt
      });
    } catch (err) {
      console.warn('APSG remote store skipped:', err);
    }
  }
  function submit(event, formId, title, type) {
    if (event) event.preventDefault();
    const form = qs(formId);
    if (!form) return false;
    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }
    const payload = formToPayload(formId, title, type);
    if (!payload) return false;
    updateReceiptCard(payload);
    optionalRemoteStore(payload);
    const url = buildWhatsAppUrl(linesFromPayload(payload).join('\n'));
    if (url !== '#') window.open(url, '_blank', 'noopener');
    showToast('Reference generated: ' + payload.reference);
    return false;
  }
  function sendEmail(formId, subject, type) {
    const form = qs(formId);
    if (!form) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const payload = formToPayload(formId, subject, type || form.dataset.receiptType || 'INVOLVE');
    updateReceiptCard(payload);
    optionalRemoteStore(payload);
    const body = linesFromPayload(payload).join('\n');
    window.location.href = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent((subject || payload.label) + ' - ' + payload.reference) + '&body=' + encodeURIComponent(body);
  }
  function copy(value, label) {
    const text = safe(value);
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast(label || 'Copied'); }).catch(function () { showToast('Copy manually: ' + text); });
    } else {
      showToast('Copy manually: ' + text);
    }
  }
  function copyElement(id, label) {
    const el = qs(id);
    if (el) copy(el.textContent.trim(), label || 'Copied');
  }
  function selectAmount(value, inputId, button) {
    const input = qs(inputId || 'pledgeAmount');
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus({ preventScroll: true });
    }
    qsa('.amount-chip').forEach(function (btn) { btn.classList.remove('is-active'); });
    if (button) button.classList.add('is-active');
  }
  function printReceiptCard() {
    window.print();
  }
  function downloadJson(payload) {
    const data = payload || lastReceiptPayload || getLocalRecords()[0];
    if (!data) return showToast('No acknowledgement data found', 'error');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'apsg-acknowledgement-' + data.reference.replace(/\//g, '-') + '.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }
  function exportCsv(records) {
    const rows = records || getLocalRecords();
    const headers = ['reference', 'type', 'name', 'phone', 'email', 'category', 'amount', 'status', 'createdAt', 'sourcePage'];
    const csv = [headers.join(',')].concat(rows.map(function (row) {
      return headers.map(function (key) { return '"' + safe(row[key]).replace(/"/g, '""') + '"'; }).join(',');
    })).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'apsg-involvement-submissions.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }
  async function imageToDataUrl(url) {
    try {
      const response = await fetch(url, { cache: 'force-cache' });
      const blob = await response.blob();
      return await new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onloadend = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      return null;
    }
  }
  function addFooter(doc, pageWidth, pageHeight) {
    doc.setDrawColor(214, 169, 43);
    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 106);
    doc.setFontSize(8.2);
    doc.text('This acknowledgement is system-generated and verifiable with the reference number above.', pageWidth / 2, pageHeight - 13, { align: 'center' });
    doc.text('Copyright ' + new Date().getFullYear() + ' ' + CONTACT.shortOrg, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }
  async function generateAPSGReceipt(payload) {
    if (!payload) {
      showToast('Submit or fill the form first', 'error');
      return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('Receipt library is still loading. Please try again.', 'error');
      return;
    }

    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const meta = typeMeta(payload.type);

    doc.setProperties({
      title: payload.label,
      subject: payload.title,
      author: CONTACT.shortOrg,
      keywords: 'APSG, receipt, acknowledgement, volunteer, donation, sponsor, RSVP',
      creator: 'APSG Participation Desk'
    });

    doc.setTextColor(238, 242, 239);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    for (let y = 42; y < pageHeight; y += 32) {
      doc.text('APSG NIGERIA - VERIFIED ACKNOWLEDGEMENT', pageWidth / 2, y, { align: 'center', angle: 16 });
    }

    doc.setFillColor(5, 53, 31);
    doc.rect(0, 0, pageWidth, 46, 'F');
    doc.setFillColor(214, 169, 43);
    doc.rect(0, 44, pageWidth, 2, 'F');

    const logoData = await imageToDataUrl(CONTACT.logo);
    if (logoData) {
      try { doc.addImage(logoData, 'PNG', 14, 8, 28, 28); } catch (_) {}
    } else {
      doc.setFillColor(214, 169, 43);
      doc.circle(28, 22, 12, 'F');
      doc.setFontSize(9);
      doc.setTextColor(5, 53, 31);
      doc.text('APSG', 28, 24, { align: 'center' });
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text(CONTACT.org, 48, 17);
    doc.setFontSize(11);
    doc.text(payload.label, 48, 25);
    doc.setFontSize(8.5);
    doc.setTextColor(226, 238, 230);
    doc.text('Website: ' + CONTACT.website, 48, 32);
    doc.text('Email: ' + CONTACT.email, 48, 37);

    doc.setTextColor(5, 53, 31);
    doc.setFontSize(20);
    doc.text(payload.type === 'DONATION_PAYMENT' ? 'Transfer Confirmation Submitted' : 'Participation Acknowledgement', pageWidth / 2, 60, { align: 'center' });

    doc.setFillColor(248, 251, 247);
    doc.roundedRect(14, 68, pageWidth - 28, 44, 4, 4, 'F');
    const date = new Date(payload.createdAt);
    const dateText = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeText = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(5, 53, 31);
    doc.text(payload.name, 20, 82);
    doc.setFontSize(10);
    doc.setTextColor(7, 20, 14);
    doc.text('Reference No: ' + payload.reference, 20, 92);
    doc.text('Date: ' + dateText + ' - ' + timeText, 20, 101);

    doc.setFillColor(214, 169, 43);
    doc.roundedRect(pageWidth - 78, 78, 57, 14, 7, 7, 'F');
    doc.setTextColor(5, 53, 31);
    doc.setFontSize(8.5);
    doc.text(payload.type === 'DONATION_PAYMENT' ? 'PENDING VERIFY' : meta.code + ' RECEIVED', pageWidth - 49.5, 87, { align: 'center' });

    const body = payload.fields.map(function (item) {
      const display = /amount|pledge|support value|sponsor value|proposed support/i.test(item[0]) ? money(item[1]) : item[1];
      return [item[0], display];
    });
    body.unshift(['Acknowledgement Type', payload.label]);
    body.unshift(['Reference Number', payload.reference]);
    body.push(['Status', payload.status]);

    if (doc.autoTable) {
      doc.autoTable({
        startY: 122,
        head: [['Detail', 'Information']],
        body: body,
        theme: 'grid',
        margin: { left: 14, right: 14 },
        styles: { fontSize: 9.2, cellPadding: 4.4, overflow: 'linebreak' },
        headStyles: { fillColor: [5, 53, 31], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 251, 247] },
        columnStyles: { 0: { cellWidth: 52, fontStyle: 'bold' } }
      });
    }

    let cursorY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 164) + 12;
    if (cursorY > pageHeight - 72) {
      addFooter(doc, pageWidth, pageHeight);
      doc.addPage();
      cursorY = 24;
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.3);
    doc.setTextColor(75, 85, 99);
    const note = payload.type === 'DONATION_PAYMENT'
      ? 'This document records your declaration that a transfer has been made to APSG, 2023394018, KUDA Microfinance. It remains pending until APSG confirms the transaction in the official account.'
      : (payload.type === 'DONATION'
        ? 'This document acknowledges receipt of your donation pledge/request. It is not a final payment confirmation until APSG verifies the transaction through official channels.'
        : 'This document acknowledges your submission to APSG. A coordination desk may follow up through official channels.');
    const wrappedNote = doc.splitTextToSize(note, pageWidth - 45);
    doc.text(wrappedNote, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += wrappedNote.length * 5 + 8;

    try {
      const qrValue = JSON.stringify({ reference: payload.reference, type: payload.type, name: payload.name, date: payload.createdAt, verify: payload.verificationUrl });
      const qr = new QRious({ value: qrValue, size: 132, level: 'H' });
      doc.addImage(qr.toDataURL(), 'PNG', pageWidth - 48, cursorY, 30, 30);
    } catch (_) {}

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 53, 31);
    doc.setFontSize(10);
    doc.text('APSG Participation Desk', 18, cursorY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 106);
    doc.setFontSize(8.5);
    doc.text('Official follow-up and verification channel', 18, cursorY + 17);
    doc.text(CONTACT.email, 18, cursorY + 23);

    addFooter(doc, pageWidth, pageHeight);
    const filename = payload.type.toLowerCase() + '-acknowledgement-' + payload.reference.replace(/\//g, '-') + '.pdf';
    doc.save(filename);
    showToast('PDF acknowledgement generated');
  }
  function downloadReceipt(formId, title, type) {
    let payload = lastReceiptPayload;
    if (formId) payload = formToPayload(formId, title || 'APSG Acknowledgement', type || 'INVOLVE');
    if (!payload) {
      try { payload = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (_) {}
    }
    if (payload) {
      updateReceiptCard(payload);
      generateAPSGReceipt(payload);
    } else {
      showToast('No acknowledgement data found', 'error');
    }
  }
  function hydrateReceiptFromSession() {
    try {
      const payload = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      if (payload && document.querySelector('[data-receipt-card]')) updateReceiptCard(payload);
    } catch (_) {}
  }
  function initEnhancements() {
    qsa('[data-copy-ref]').forEach(function (btn) {
      btn.addEventListener('click', function () { copy(btn.dataset.copyValue || (lastReceiptPayload && lastReceiptPayload.reference), 'Reference copied'); });
    });
    hydrateReceiptFromSession();
  }

  window.APSGInvolvement = {
    submit: submit,
    sendEmail: sendEmail,
    downloadReceipt: downloadReceipt,
    submitPaymentConfirmation: submitPaymentConfirmation,
    copyPaymentReference: copyPaymentReference,
    generateAPSGReceipt: generateAPSGReceipt,
    copy: copy,
    copyElement: copyElement,
    selectAmount: selectAmount,
    buildWhatsAppUrl: buildWhatsAppUrl,
    formToPayload: formToPayload,
    showToast: showToast,
    printReceiptCard: printReceiptCard,
    downloadJson: downloadJson,
    exportCsv: exportCsv,
    getLocalRecords: getLocalRecords,
    contact: CONTACT
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancements);
  } else {
    initEnhancements();
  }
})();
