/* Centralized APSG/CWDI settings layer.
   Public pages read only public_visible=true settings. Admin pages may read/save all settings through authenticated RLS. */
(function () {
  'use strict';
  const DEFAULTS = {
    apsg_name: 'APC Progressive Support Group',
    cwdi_name: 'Confident Women Development Initiative',
    base_url: 'https://apsgnigeria.org',
    public_email: 'info@apsgnigeria.org',
    finance_email: 'info@apsgnigeria.org',
    contact_phone: '',
    whatsapp: '',
    office_address: 'Nigeria',
    logo_path: '/assets/images/logo/apsg1.png',
    favicon_path: '/assets/images/logo/apsg1.png',
    default_og_image: '/assets/images/og-image.jpg',
    primary_green: '#05351f',
    gold_accent: '#d6a92b',
    secondary_green: '#0f7a3d',
    public_theme_mode: 'light',
    admin_theme_mode: 'light',
    card_style: 'premium-glass',
    default_placeholder_image: '/assets/images/profile-placeholder.png',
    default_banner_image: '/assets/images/hero/hero3.jpg',
    public_footer_text: 'APC Progressive Support Group. Civic leadership, grassroots mobilisation and public engagement.',
    bank_name: 'Eco Bank',
    account_name: 'APC Progressive Support Group',
    account_number: '',
    minimum_donation: 50000,
    donation_bundles: [50000, 100000, 250000, 500000, 1000000, 5000000, 10000000],
    sponsorship_bundles: [50000, 100000, 250000, 500000, 1000000, 5000000, 10000000],
    currency_symbol: '₦',
    receipt_prefix: 'APSG-RCP',
    payment_proof_required: true,
    verification_status_labels: ['pending', 'confirmed', 'rejected'],
    donation_categories: ['Cash Donation', 'Campaign Materials', 'Logistics Support', 'Media Support', 'Welfare Support'],
    campaign_item_categories: ['Premium campaign T-shirts', 'Branded caps', 'Volunteer vests / field jackets', 'Banners, stage backdrops and roll-up stands', 'Flyers, leaflets and voter education cards', 'Posters and approved wall visuals', 'Volunteer ID cards and lanyards', 'Flags, stickers and handbill packs', 'Political campaign vehicle', 'Office space'],
    sponsor_package_types: ['Bronze Sponsor', 'Silver Sponsor', 'Gold Sponsor', 'Platinum Sponsor', 'Strategic Partner'],
    event_sponsorship_categories: ['Campaign road show', 'Inauguration', 'Political trip', 'Street walk', 'Fitness for members', 'Welfare outreach', 'Town hall meeting', 'Women mobilisation programme'],
    volunteer_categories: ['Mobilisation', 'Event Support', 'Media & Publicity', 'Protocol', 'Data Entry', 'Polling Unit Support', 'Security Liaison', 'Welfare Team'],
    rsvp_event_types: ['Meeting', 'Event', 'Training', 'Town Hall', 'Rally', 'CWDI Programme'],
    enable_donation_form: true,
    enable_sponsor_form: true,
    enable_volunteer_form: true,
    enable_rsvp_form: true,
    donation_success_message: 'Thank you. Your donation pledge has been received for pending verification.',
    sponsor_success_message: 'Thank you. Your sponsorship request has been received for pending verification.',
    volunteer_success_message: 'Thank you. Your volunteer application has been submitted.',
    rsvp_success_message: 'Thank you. Your RSVP has been submitted successfully.',
    whatsapp_pdf_sharing: true,
    receipt_logo: '/assets/images/logo/apsg1.png',
    receipt_footer_note: 'This receipt is valid only when the reference exists in APSG administrative records.',
    authorized_signatory: 'APSG Authorized Finance Desk',
    receipt_watermark_text: 'APSG',
    pdf_file_naming_format: '{receipt_ref}.pdf',
    download_receipt_button: true,
    view_pdf_setting: true,
    default_title_suffix: '| APSG Nigeria',
    default_meta_description: 'Official APSG Nigeria platform for civic engagement, leadership, mobilisation, public updates and community participation.',
    canonical_base_url: 'https://apsgnigeria.org',
    sitemap_base_url: 'https://apsgnigeria.org',
    default_page_keywords: ['APSG Nigeria', 'APC Progressive Support Group', 'CWDI', 'grassroots mobilisation', 'civic organization'],
    noindex_admin: true,
    public_indexing_status: 'index',
    default_blog_status: 'draft',
    featured_article_limit: 3,
    related_posts_count: 3,
    default_event_image: '/assets/images/hero/hero3.jpg',
    default_meeting_image: '/assets/images/hero/hero2.png',
    default_gallery_image: '/assets/images/og-image.jpg',
    slug_behavior: 'auto-generate-from-title',
    publish_labels: ['draft', 'published', 'archived'],
    maintenance_mode: false,
    analytics_enabled: false
  };
  const cache = { public: null, admin: null, loadedAt: 0 };
  const SENSITIVE_CATEGORIES = new Set(['security', 'maintenance', 'integrations', 'admin_access', 'deployment']);
  const SENSITIVE_KEY_PATTERN = /(service[_-]?role|serviceRole|database[_-]?password|db[_-]?password|private[_-]?key|secret|jwt[_-]?secret|smtp[_-]?password|token)/i;
  const roleRank = { viewer: 1, editor: 2, admin: 3, superadmin: 4 };
  function currentAdminRole() { return String(window.APSG_ADMIN_ROLE || window.APSG_ADMIN_PROFILE?.role || '').toLowerCase(); }
  function currentAdminEmail() { return window.APSG_ADMIN_USER?.email || window.APSG_ADMIN_PROFILE?.email || null; }
  function roleAtLeast(role, min) { return (roleRank[String(role || '').toLowerCase()] || 0) >= (roleRank[min] || 0); }
  function isSensitiveEntry(entry) {
    const category = String(entry.category || '').toLowerCase();
    const key = String(entry.key || entry.setting_key || '');
    return SENSITIVE_CATEGORIES.has(category) || SENSITIVE_KEY_PATTERN.test(key);
  }
  function sanitizeEntry(item) {
    if (!item || !item.key) throw new Error('Invalid settings payload.');
    if (SENSITIVE_KEY_PATTERN.test(String(item.key))) {
      throw new Error('Private secrets must not be stored in frontend-readable settings. Use server-side environment variables.');
    }
    const category = String(item.category || 'general').toLowerCase();
    const publicVisible = SENSITIVE_CATEGORIES.has(category) ? false : Boolean(item.public_visible);
    return {
      setting_key: item.key,
      setting_value: item.value === undefined ? null : item.value,
      public_visible: publicVisible,
      category: category || 'general',
      description: item.description || '',
      updated_by: item.updated_by || currentAdminEmail(),
      updated_at: new Date().toISOString()
    };
  }
  function client() { return window.supabaseClient || window.apsgSupabase || window.APSG_SUPABASE || window.supabaseClientPublic || null; }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function parseValue(value) {
    if (value == null) return '';
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return '';
    try { return JSON.parse(trimmed); } catch (e) { return trimmed; }
  }
  function stringifyValue(value) {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }
  function normalizeRows(rows) {
    const out = clone(DEFAULTS);
    (rows || []).forEach(row => {
      const key = row.setting_key || row.key;
      if (!key) return;
      out[key] = parseValue(row.setting_value);
    });
    return out;
  }
  function normalizeSettings(input) {
    return { ...clone(DEFAULTS), ...(input || {}) };
  }
  async function loadPublic(options) {
    const fresh = !options?.force && cache.public && Date.now() - cache.loadedAt < 60000;
    if (fresh) return cache.public;
    const sb = client();
    if (!sb || typeof sb.from !== 'function') {
      cache.public = clone(DEFAULTS);
      return cache.public;
    }
    try {
      const { data, error } = await sb.from('apsg_settings').select('setting_key,setting_value,category,public_visible,updated_at').eq('public_visible', true);
      if (error) throw error;
      cache.public = normalizeRows(data);
    } catch (error) {
      console.info('[APSG Settings] Public settings fallback:', error.message || error);
      cache.public = clone(DEFAULTS);
    }
    cache.loadedAt = Date.now();
    window.dispatchEvent(new CustomEvent('apsg:settings-loaded', { detail: { settings: cache.public, scope: 'public' } }));
    return cache.public;
  }
  async function loadAdmin(options) {
    const fresh = !options?.force && cache.admin && Date.now() - cache.loadedAt < 30000;
    if (fresh) return cache.admin;
    const sb = client();
    if (!sb || typeof sb.from !== 'function') {
      cache.admin = clone(DEFAULTS);
      return cache.admin;
    }
    try {
      const { data, error } = await sb.from('apsg_settings').select('*').order('category', { ascending: true }).order('setting_key', { ascending: true });
      if (error) throw error;
      cache.admin = normalizeRows(data);
    } catch (error) {
      console.info('[APSG Settings] Admin settings fallback:', error.message || error);
      cache.admin = clone(DEFAULTS);
    }
    cache.loadedAt = Date.now();
    window.dispatchEvent(new CustomEvent('apsg:settings-loaded', { detail: { settings: cache.admin, scope: 'admin' } }));
    return cache.admin;
  }
  async function saveSettings(entries, meta) {
    const sb = client();
    if (!sb || typeof sb.from !== 'function') throw new Error('Supabase client unavailable.');
    const list = Array.isArray(entries) ? entries : [];
    const role = currentAdminRole();
    if (!roleAtLeast(role, 'admin')) throw new Error('Settings updates require an authenticated admin session.');
    if (list.some(isSensitiveEntry) && role !== 'superadmin') {
      throw new Error('Security, integration, maintenance and deployment settings are superadmin-only.');
    }
    const rows = list.map(sanitizeEntry);
    let previous = [];
    try {
      const keys = rows.map(r => r.setting_key);
      const prior = await sb.from('apsg_settings').select('setting_key,setting_value,category,public_visible,updated_at,updated_by').in('setting_key', keys);
      if (!prior.error) previous = prior.data || [];
    } catch (error) { console.info('[APSG Settings] Previous settings lookup skipped:', error.message || error); }
    const { data, error } = await sb.from('apsg_settings').upsert(rows, { onConflict: 'setting_key' }).select();
    if (error) throw error;
    cache.public = null; cache.admin = null;
    try {
      await sb.from('admin_audit_logs').insert({
        action_type: meta?.action_type || 'settings_update',
        affected_table: 'apsg_settings',
        affected_record: rows.map(r => r.setting_key).join(','),
        admin_user: meta?.updated_by || currentAdminEmail(),
        old_value: previous,
        new_value: rows,
        ip_address: meta?.ip_address || null,
        user_agent: navigator.userAgent || null,
        created_at: new Date().toISOString()
      });
    } catch (auditError) { console.info('[APSG Settings] Audit log skipped:', auditError.message || auditError); }
    return data;
  }
  function applyPublicSettings(settings) {
    const cfg = normalizeSettings(settings);
    document.documentElement.style.setProperty('--deep', cfg.primary_green || DEFAULTS.primary_green);
    document.documentElement.style.setProperty('--gold', cfg.gold_accent || DEFAULTS.gold_accent);
    document.documentElement.style.setProperty('--green', cfg.secondary_green || DEFAULTS.secondary_green);
    const footer = document.querySelector('[data-apsg-footer-text]');
    if (footer) footer.textContent = cfg.public_footer_text;
    document.querySelectorAll('[data-apsg-setting]').forEach(el => {
      const key = el.getAttribute('data-apsg-setting');
      if (cfg[key] == null) return;
      if (el.matches('input,textarea,select')) el.value = Array.isArray(cfg[key]) ? cfg[key].join(',') : cfg[key];
      else el.textContent = Array.isArray(cfg[key]) ? cfg[key].join(', ') : String(cfg[key]);
    });
    return cfg;
  }
  function financeBundle(settings) {
    const s = normalizeSettings(settings);
    return {
      bank: { account_name: s.account_name, bank_name: s.bank_name, account_number: s.account_number, minimum_donation: Number(s.minimum_donation || 0) },
      contact: { whatsapp: s.whatsapp, email: s.finance_email || s.public_email },
      donation_bundles: s.donation_bundles,
      sponsorship_bundles: s.sponsorship_bundles,
      item_categories: s.campaign_item_categories,
      event_types: s.event_sponsorship_categories,
      volunteer_categories: s.volunteer_categories,
      rsvp_event_types: s.rsvp_event_types
    };
  }
  window.APSGSettings = { DEFAULTS, SENSITIVE_CATEGORIES, isSensitiveEntry, loadPublic, loadAdmin, saveSettings, applyPublicSettings, financeBundle, parseValue, stringifyValue, normalizeSettings };
  document.addEventListener('DOMContentLoaded', function () {
    if (!/\/admin\//.test(location.pathname)) loadPublic().then(applyPublicSettings).catch(() => {});
  });
})();
