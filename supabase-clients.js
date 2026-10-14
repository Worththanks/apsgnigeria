// Legacy compatibility shim. Use /assets/js/supabase-clients.js as the single global client.
(function(){
  if (!document.querySelector('script[src="/assets/js/supabase-clients.js"]')) {
    var s=document.createElement('script');
    s.src='/assets/js/supabase-clients.js';
    document.head.appendChild(s);
  }
})();
