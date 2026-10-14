/* APSG public leadership helper
   Optional: include on leadership/BOT/NATEXCO/state pages and create containers with
   data-apsg-officials="national_executive" or "bot" or "matron,patron,adviser".
   It always uses image_url from Supabase, so one uploaded image follows the person everywhere.
*/
(function () {
  "use strict";
  const DEFAULT_IMAGE = window.APSG_DEFAULT_OFFICIAL_IMAGE || "/assets/images/logo/apsg.png";
  const TABLES = Array.isArray(window.APSG_OFFICIALS_TABLES) ? window.APSG_OFFICIALS_TABLES : ["apsg_officials", "officials", "leadership_officials"];
  const $all = (selector) => Array.from(document.querySelectorAll(selector));
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const containers = $all("[data-apsg-officials]");
    if (!containers.length) return;
    const supabase = resolveSupabaseClient();
    if (!supabase) return;
    const result = await firstSuccessfulRead(supabase);
    const officials = (result.data || []).filter((item) => item.full_name || item.name || item.display_name);
    containers.forEach((container) => render(container, officials));
  }

  function render(container, officials) {
    const categories = String(container.dataset.apsgOfficials || "").split(",").map((x) => x.trim()).filter(Boolean);
    const max = Number(container.dataset.limit || 0);
    const list = officials
      .filter((item) => (item.status || "published") === "published")
      .filter((item) => !categories.length || categories.includes(item.category))
      .sort((a, b) => Number(a.display_order || 999) - Number(b.display_order || 999));
    const finalList = max > 0 ? list.slice(0, max) : list;
    container.innerHTML = finalList.map(card).join("");
  }

  function card(item) {
    const name = item.full_name || item.name || item.display_name || "APSG Official";
    const image = item.image_url || DEFAULT_IMAGE;
    const url = `/pages/official-details.html?slug=${encodeURIComponent(item.slug || slugify(name))}`;
    return `<article class="apsg-official-card">
      <a href="${url}" class="apsg-official-card-link">
        <img src="${escapeAttr(image)}" alt="${escapeAttr(name)}" onerror="this.src='${escapeAttr(DEFAULT_IMAGE)}'" />
        <div>
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml(item.position || item.short_info || "APSG Official")}</p>
        </div>
      </a>
    </article>`;
  }

  async function firstSuccessfulRead(supabase) {
    let lastError = null;
    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select("*").eq("status", "published").limit(1000);
      if (!error) return { table, data };
      lastError = error;
    }
    console.warn("Could not load APSG officials", lastError);
    return { table: null, data: [] };
  }

  function resolveSupabaseClient() {
    const keys = ["apsgSupabase", "APSG_SUPABASE", "SUPABASE_CLIENT", "supabaseClient", "sb", "db"];
    for (const key of keys) if (window[key] && typeof window[key].from === "function") return window[key];
    if (window.supabase && typeof window.supabase.from === "function") return window.supabase;
    const url = window.APSG_SUPABASE_URL || window.SUPABASE_URL || window.supabaseUrl;
    const key = window.APSG_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || window.supabaseAnonKey;
    if (url && key && window.supabase?.createClient) return window.supabase.createClient(url, key);
    return null;
  }
  function slugify(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function escapeHtml(value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;"); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#096;"); }
})();
