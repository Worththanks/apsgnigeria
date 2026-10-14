// Legacy APSG Supabase compatibility shim. The production client lives in /assets/js/supabase-clients.js.
(function(){
  'use strict';
  function expose(){
    const client=window.supabaseClient||window.apsgSupabase||window.APSG_SUPABASE||null;
    if(client && !window.supabaseClientLegacy) window.supabaseClientLegacy=client;
  }
  if(!document.querySelector('script[src="/assets/js/supabase-clients.js"]')){
    const s=document.createElement('script');s.src='/assets/js/supabase-clients.js';s.onload=expose;document.head.appendChild(s);
  } else {
    expose();
  }
})();
