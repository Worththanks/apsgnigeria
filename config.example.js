/*
  Copy this file to /config.js for local/deployment configuration.
  Frontend code may use ONLY the public anon key.
  Never place service-role, admin, private, database passwords, or privileged keys here.
  IMPORTANT: Rotate the previously exposed Supabase keys before production deployment.
*/
window.APSG_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_PUBLIC_SUPABASE_ANON_KEY'
};
