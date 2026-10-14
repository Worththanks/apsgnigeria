/*
  APSG/CWDI Supabase browser client (anon-only).
  SECURITY: Never place a service-role, admin, private, or privileged key in frontend code.
  Rotate the previously exposed Supabase keys in the Supabase dashboard before deployment,
  then update the public anon key below or provide window.APSG_SUPABASE_CONFIG from /config.js.
*/
(function () {
  'use strict';

  const cfg = window.APSG_SUPABASE_CONFIG || {};
  const SUPABASE_URL = cfg.url || 'https://hamjvcaacrctnmbkwlag.supabase.co';
  const SUPABASE_ANON_KEY = cfg.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbWp2Y2FhY3JjdG5tYmt3bGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODk4MzUsImV4cCI6MjA4NDI2NTgzNX0.xvShOYZcSmLoneev4Su8ATzNpGo3sJgC62DrcBpmLw0';

  function expose(client) {
    window.apsgSupabase = client;
    window.supabaseClient = client;
    window.supabaseClientPublic = client;
    window.APSG_SUPABASE = client;
    window.sb = client;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[APSG Supabase] Supabase JS CDN is not loaded. Add @supabase/supabase-js before this file.');
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || /YOUR_|PASTE_|REPLACE_/i.test(SUPABASE_ANON_KEY)) {
    console.warn('[APSG Supabase] Missing public anon configuration. Copy config.example.js to config.js and add your anon key.');
    return;
  }

  try {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
    expose(client);
    window.APSG_OFFICIALS_TABLES = window.APSG_OFFICIALS_TABLES || ['apsg_officials', 'officials', 'leadership_officials'];
    window.APSG_SUPABASE_READY = true;
  } catch (error) {
    console.error('[APSG Supabase] Could not initialise browser client:', error);
  }
})();
