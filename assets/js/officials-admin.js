/* APSG Leadership Desk - Supabase powered admin with member auto-fill and image upload
   Put this file at: /assets/js/officials-admin.js
   Required: /assets/js/supabase-clients.js should expose a Supabase client on window.
*/
(function () {
  "use strict";

  const OFFICIAL_TABLES = normalizeTableList(window.APSG_OFFICIALS_TABLES || window.APSG_OFFICIALS_TABLE || [
    "apsg_officials",
    "officials",
    "leadership_officials"
  ]);

  const MEMBER_TABLES = normalizeTableList(window.APSG_MEMBER_TABLES || window.APSG_MEMBER_TABLE || [
    "members",
    "apsg_members",
    "registrations",
    "member_registrations",
    "profiles"
  ]);

  const STORAGE_BUCKET = window.APSG_STORAGE_BUCKET || "officials";
  const IMAGE_FOLDER = window.APSG_IMAGE_FOLDER || "officials";
  const DEFAULT_IMAGE = window.APSG_DEFAULT_OFFICIAL_IMAGE || "/assets/images/logo/apsg.png";

  const DESIGNATIONS = {
    bot: [
      "Director-General",
      "Board Chairperson",
      "Board Secretary",
      "Board Member",
      "Grand Patron / Board Member",
      "National Grand Patron and Adviser",
      "BOT Member"
    ],
    patronage: [
      "Global Grand Matron",
      "National Grand Patron",
      "National Patron",
      "Grand Patron",
      "State Grand Matron",
      "Matron",
      "Patron",
      "Adviser"
    ],
    national: [
      "National President",
      "National Chairman",
      "National Coordinator",
      "National Secretary",
      "National Treasurer",
      "National Publicity Secretary",
      "National Organising Secretary",
      "National Women Leader",
      "National Youth Leader",
      "National Executive Member"
    ],
    state: [
      "State Coordinator",
      "State Chairman",
      "State Secretary",
      "State Treasurer",
      "State Publicity Secretary",
      "State Women Leader",
      "State Youth Leader",
      "State Executive Member"
    ],
    lga: [
      "LGA Coordinator",
      "LGA Chairman",
      "LGA Secretary",
      "LGA Women Leader",
      "LGA Youth Leader",
      "LGA Executive Member"
    ],
    ward: [
      "Ward Coordinator",
      "Ward Chairman",
      "Ward Secretary",
      "Ward Women Leader",
      "Ward Youth Leader",
      "Ward Executive Member"
    ],
    pu: ["Polling Unit Coordinator", "Polling Unit Canvasser", "Polling Unit Mobilizer"],
    volunteer: ["Volunteer", "Field Mobilizer", "Digital Volunteer", "Community Volunteer"]
  };

  const NIGERIA_STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
  ];

  const STATE_ZONES = {
    Abia: "South East", Anambra: "South East", Ebonyi: "South East", Enugu: "South East", Imo: "South East",
    "Akwa Ibom": "South South", AkwaIbom: "South South", Bayelsa: "South South", "Cross River": "South South", CrossRiver: "South South", Delta: "South South", Edo: "South South", Rivers: "South South",
    Ekiti: "South West", Lagos: "South West", Ogun: "South West", Ondo: "South West", Osun: "South West", Oyo: "South West",
    Adamawa: "North East", Bauchi: "North East", Borno: "North East", Gombe: "North East", Taraba: "North East", Yobe: "North East",
    Benue: "North Central", FCT: "North Central", Kogi: "North Central", Kwara: "North Central", Nasarawa: "North Central", Niger: "North Central", Plateau: "North Central",
    Jigawa: "North West", Kaduna: "North West", Kano: "North West", Katsina: "North West", Kebbi: "North West", Sokoto: "North West", Zamfara: "North West"
  };

  const state = {
    supabase: null,
    officialTable: null,
    memberTable: null,
    officials: [],
    members: [],
    selectedMember: null,
    uploadingImage: false
  };

  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    state.supabase = resolveSupabaseClient();
    injectMemberPickerIfMissing();
    injectImageUploaderIfMissing();
    bindEvents();
    populateStateOptions();
    populateDesignationOptions();
    updateShortCount();
    syncImagePreview();

    if (!state.supabase) {
      setStatus("Supabase client not found. Confirm /assets/js/supabase-clients.js creates a client, for example window.apsgSupabase = supabase.createClient(url, key).", "error");
      renderOfficials();
      return;
    }

    setStatus("Connecting to Supabase and loading members plus officials...", "info");
    await Promise.allSettled([loadMembers(), loadOfficials()]);
    renderOfficials();

    const memberNote = state.memberTable ? `${state.members.length} member names loaded from ${state.memberTable}` : "no member table found";
    const officialNote = state.officialTable ? `${state.officials.length} officials loaded from ${state.officialTable}` : "no officials table found yet";
    setStatus(`Connected: ${memberNote}; ${officialNote}.`, state.officialTable ? "success" : "info");
  }

  function bindEvents() {
    $("officialForm")?.addEventListener("submit", saveOfficial);
    $("resetOfficialBtn")?.addEventListener("click", resetForm);
    $("loadSampleBtn")?.addEventListener("click", loadSample);
    $("officialSearch")?.addEventListener("input", renderOfficials);
    $("officialFilter")?.addEventListener("change", renderOfficials);
    $("short_info")?.addEventListener("input", updateShortCount);
    $("image_url")?.addEventListener("input", syncImagePreview);
    $("official_image_file")?.addEventListener("change", previewSelectedImageFile);
    $("uploadImageBtn")?.addEventListener("click", uploadOfficialImage);
    $("clearImageBtn")?.addEventListener("click", clearImageFields);
    $("full_name")?.addEventListener("input", () => {
      if (!$("slug")?.value.trim()) setValue("slug", slugify($("full_name").value));
    });
    $("level")?.addEventListener("change", () => {
      populateDesignationOptions();
      suggestCategory();
    });
    $("position")?.addEventListener("change", suggestCategory);
    $("state")?.addEventListener("change", () => {
      autoFillZone();
      populateLocationSelects();
    });
    $("lga")?.addEventListener("change", populateWardOptions);
    $("memberPicker")?.addEventListener("input", applySelectedMemberFromInput);
    $("memberPicker")?.addEventListener("change", applySelectedMemberFromInput);
  }

  function injectMemberPickerIfMissing() {
    const form = $("officialForm");
    if (!form || $("memberPicker")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "md:col-span-2";
    wrapper.innerHTML = `
      <label class="admin-label">Auto-fill Official Name from Supabase Members</label>
      <input id="memberPicker" class="admin-input" list="memberOptions" placeholder="Type or select a registered member name from Supabase" autocomplete="off" />
      <datalist id="memberOptions"></datalist>
      <p class="admin-help" id="memberPickerHelp">Names will load from your members/registration table. Selecting a member fills name, state, LGA, ward, zone and image where available.</p>
    `;
    const firstInputBlock = form.querySelector("div");
    form.insertBefore(wrapper, firstInputBlock);
  }

  function injectImageUploaderIfMissing() {
    const imageUrl = $("image_url");
    const form = $("officialForm");
    if (!form || !imageUrl || $("official_image_file")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "md:col-span-2 official-image-uploader";
    wrapper.innerHTML = `
      <div class="image-uploader-head">
        <div>
          <label class="admin-label">Upload Official Image to Supabase</label>
          <p class="admin-help">Upload once and the saved image URL can be reused anywhere this person appears on the website.</p>
        </div>
        <span class="storage-badge"><i class="fa-solid fa-cloud-arrow-up"></i> Storage bucket: ${escapeHtml(STORAGE_BUCKET)}</span>
      </div>
      <div class="image-uploader-grid">
        <div class="image-preview-shell"><img id="officialImagePreview" src="${escapeAttr(DEFAULT_IMAGE)}" alt="Official image preview" /></div>
        <div class="image-upload-controls">
          <input id="official_image_file" type="file" accept="image/*" class="admin-input" />
          <div class="flex flex-wrap gap-2 mt-3">
            <button id="uploadImageBtn" type="button" class="admin-btn green"><i class="fa-solid fa-cloud-arrow-up"></i> Upload Image</button>
            <button id="clearImageBtn" type="button" class="admin-btn white"><i class="fa-solid fa-image-circle-xmark"></i> Clear Image</button>
          </div>
          <p id="imageUploadHelp" class="admin-help mt-3">After upload, the public Supabase image URL will be inserted into the Image URL field above.</p>
        </div>
      </div>
    `;
    const parent = imageUrl.closest("div");
    parent.insertAdjacentElement("afterend", wrapper);
  }

  function normalizeTableList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string") return [value].filter(Boolean);
    return [];
  }

  function resolveSupabaseClient() {
    const clientKeys = ["apsgSupabase", "APSG_SUPABASE", "SUPABASE_CLIENT", "supabaseClient", "supabaseClientAdmin", "sb", "db"];
    for (const key of clientKeys) {
      const candidate = window[key];
      if (candidate && typeof candidate.from === "function") return candidate;
    }
    if (window.supabase && typeof window.supabase.from === "function") return window.supabase;
    const url = window.APSG_SUPABASE_URL || window.SUPABASE_URL || window.supabaseUrl;
    const key = window.APSG_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || window.supabaseAnonKey;
    if (url && key && window.supabase && typeof window.supabase.createClient === "function") {
      window.apsgSupabase = window.supabase.createClient(url, key);
      return window.apsgSupabase;
    }
    try {
      for (const value of Object.values(window)) {
        if (value && typeof value === "object" && typeof value.from === "function" && typeof value.auth === "object") return value;
      }
    } catch (error) {
      console.warn("Could not scan window for Supabase client", error);
    }
    return null;
  }

  async function loadOfficials() {
    const result = await firstSuccessfulTableRead(OFFICIAL_TABLES, 1000);
    state.officialTable = result.table || state.officialTable || OFFICIAL_TABLES[0];
    state.officials = (result.data || []).filter((item) => getName(item)).sort(sortOfficials);
    if (!result.table && result.error) setStatus(`Could not load officials: ${result.error.message || result.error}`, "error");
  }

  async function loadMembers() {
    const result = await firstSuccessfulTableRead(MEMBER_TABLES, 2000);
    state.memberTable = result.table;
    state.members = (result.data || []).filter((item) => getName(item)).sort((a, b) => getName(a).localeCompare(getName(b)));
    fillMemberDatalist();
    populateStateOptions();
    populateLocationSelects();
  }

  async function firstSuccessfulTableRead(tableNames, limit) {
    let lastError = null;
    for (const table of tableNames) {
      try {
        const { data, error } = await state.supabase.from(table).select("*").limit(limit);
        if (error) { lastError = error; continue; }
        return { table, data: data || [], error: null };
      } catch (error) {
        lastError = error;
      }
    }
    return { table: null, data: [], error: lastError };
  }

  function fillMemberDatalist() {
    const list = $("memberOptions");
    if (!list) return;
    list.innerHTML = "";
    const frag = document.createDocumentFragment();
    state.members.forEach((member) => {
      const option = document.createElement("option");
      const name = getName(member);
      const location = [
        getField(member, ["state", "state_name", "member_state"]),
        getField(member, ["lga", "lcda", "local_government", "local_government_area", "member_lga"]),
        getField(member, ["ward", "ward_name", "member_ward"])
      ].filter(Boolean).join(" / ");
      option.value = location ? `${name} - ${location}` : name;
      option.dataset.id = member.id || member.member_id || member.user_id || "";
      frag.appendChild(option);
    });
    list.appendChild(frag);
    const help = $("memberPickerHelp");
    if (help) {
      help.textContent = state.memberTable
        ? `${state.members.length} names loaded from Supabase table: ${state.memberTable}. Select a name to fill the official record automatically.`
        : "No member table was found yet. You can still type the official name manually or adjust APSG_MEMBER_TABLES at the bottom of this page.";
    }
  }

  function applySelectedMemberFromInput() {
    const input = $("memberPicker");
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) return;
    const displayNamePart = raw.split(" - ")[0].trim();
    const normalizedDisplayName = normalizeText(displayNamePart);
    const normalizedRaw = normalizeText(raw);
    const found = state.members.find((member) => normalizeText(getName(member)) === normalizedDisplayName)
      || state.members.find((member) => normalizedRaw.includes(normalizeText(getName(member))));
    if (!found) return;

    state.selectedMember = found;
    const name = getName(found);
    setValue("full_name", name);
    setValue("slug", slugify(name));
    setValue("state", getField(found, ["state", "state_name", "member_state"]));
    populateLocationSelects();
    setValue("lga", getField(found, ["lga", "lcda", "local_government", "local_government_area", "member_lga"]));
    populateWardOptions();
    setValue("ward", getField(found, ["ward", "ward_name", "member_ward"]));
    setValue("zone", getField(found, ["zone", "geo_zone", "geopolitical_zone"]) || getZone($("state")?.value));
    setValue("image_url", getField(found, ["image_url", "photo_url", "passport_url", "passport", "profile_image", "avatar_url", "picture_url"]));
    syncImagePreview();

    if (!$("short_info")?.value.trim()) {
      const role = getField(found, ["occupation", "profession", "role", "office", "designation", "position"]);
      setValue("short_info", role ? `${name} is a registered APSG member with ${role} profile information.` : `${name} is a registered APSG member selected from the membership database.`);
      updateShortCount();
    }
    setStatus(`${name} loaded from Supabase members table and filled into the official form.`, "success");
  }

  function populateStateOptions() {
    const select = $("state");
    if (!select) return;
    const current = select.value;
    const dynamicStates = state.members.map((member) => getField(member, ["state", "state_name", "member_state"])).filter(Boolean);
    const states = unique(["", ...NIGERIA_STATES, ...dynamicStates]);
    select.innerHTML = states.map((name) => name
      ? `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`
      : `<option value="">National / Not State Specific</option>`
    ).join("");
    if (current) setValue("state", current);
  }

  function populateLocationSelects() { populateLgaOptions(); populateWardOptions(); }

  function populateLgaOptions() {
    const select = $("lga");
    const selectedState = $("state")?.value || "";
    if (!select) return;
    const options = unique(state.members
      .filter((member) => !selectedState || sameText(getField(member, ["state", "state_name", "member_state"]), selectedState))
      .map((member) => getField(member, ["lga", "lcda", "local_government", "local_government_area", "member_lga"]))
      .filter(Boolean));
    const current = select.value;
    select.disabled = options.length === 0;
    select.innerHTML = `<option value="">Select LGA/LCDA</option>` + options.map((name) => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join("");
    if (current) setValue("lga", current);
  }

  function populateWardOptions() {
    const select = $("ward");
    const selectedState = $("state")?.value || "";
    const selectedLga = $("lga")?.value || "";
    if (!select) return;
    const options = unique(state.members
      .filter((member) => !selectedState || sameText(getField(member, ["state", "state_name", "member_state"]), selectedState))
      .filter((member) => !selectedLga || sameText(getField(member, ["lga", "lcda", "local_government", "local_government_area", "member_lga"]), selectedLga))
      .map((member) => getField(member, ["ward", "ward_name", "member_ward"]))
      .filter(Boolean));
    const current = select.value;
    select.disabled = options.length === 0;
    select.innerHTML = `<option value="">Select Ward</option>` + options.map((name) => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join("");
    if (current) setValue("ward", current);
  }

  function populateDesignationOptions() {
    const level = $("level")?.value || "";
    const select = $("position");
    if (!select) return;
    const current = select.value;
    const positions = DESIGNATIONS[level] || [];
    select.disabled = positions.length === 0;
    select.innerHTML = `<option value="">Select Designation</option>` + positions.map((name) => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join("");
    if (current) setValue("position", current);
  }

  function suggestCategory() {
    const level = $("level")?.value || "";
    const position = ($("position")?.value || "").toLowerCase();
    let category = "national_executive";
    if (level === "bot") category = "bot";
    else if (level === "state") category = "state_executive";
    else if (level === "patronage") {
      if (position.includes("matron")) category = "matron";
      else if (position.includes("adviser") || position.includes("advisor")) category = "adviser";
      else category = "patron";
    } else if (["lga", "ward", "pu", "volunteer"].includes(level)) category = "state_executive";
    setValue("category", category);
  }

  function autoFillZone() {
    const selectedState = $("state")?.value || "";
    setValue("zone", selectedState ? getZone(selectedState) : "National");
  }

  function syncImagePreview() {
    const preview = $("officialImagePreview");
    if (!preview) return;
    const url = ($("image_url")?.value || "").trim() || DEFAULT_IMAGE;
    preview.src = url;
    preview.onerror = function () { this.onerror = null; this.src = DEFAULT_IMAGE; };
  }

  function previewSelectedImageFile() {
    const input = $("official_image_file");
    const preview = $("officialImagePreview");
    if (!input?.files?.length || !preview) return;
    const file = input.files[0];
    if (!file.type.startsWith("image/")) {
      setImageHelp("Please select a valid image file.", "error");
      input.value = "";
      return;
    }
    preview.src = URL.createObjectURL(file);
    setImageHelp(`Ready to upload: ${file.name}. Click Upload Image to save it in Supabase Storage.`, "info");
  }

  async function uploadOfficialImage() {
    if (state.uploadingImage) return;
    if (!state.supabase) {
      setImageHelp("Cannot upload because Supabase client is not available.", "error");
      return;
    }
    const input = $("official_image_file");
    const file = input?.files?.[0];
    if (!file) {
      setImageHelp("Choose an image first before uploading.", "error");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setImageHelp("The selected file must be an image.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageHelp("Image is larger than 5MB. Please compress it before upload.", "error");
      return;
    }

    const baseName = slugify($("full_name")?.value || getName(state.selectedMember) || "official-image") || "official-image";
    if (!$("slug")?.value.trim()) setValue("slug", baseName);
    const extension = getFileExtension(file.name, file.type);
    const safePath = `${IMAGE_FOLDER}/${baseName}/${Date.now()}-${randomString(8)}.${extension}`;

    setImageButtonLoading(true);
    setImageHelp("Uploading image to Supabase Storage...", "info");
    try {
      const { error: uploadError } = await state.supabase.storage
        .from(STORAGE_BUCKET)
        .upload(safePath, file, {
          cacheControl: "3600",
          contentType: file.type || "image/jpeg",
          upsert: true
        });
      if (uploadError) throw uploadError;

      const { data } = state.supabase.storage.from(STORAGE_BUCKET).getPublicUrl(safePath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Supabase did not return a public URL. Confirm the storage bucket is public or use signed URLs.");

      setValue("image_url", publicUrl);
      syncImagePreview();
      setImageHelp("Image uploaded successfully. The URL has been inserted and will be saved with this official.", "success");
      setStatus("Image uploaded. Save the official record so this image appears across the website.", "success");
    } catch (error) {
      setImageHelp(`Image upload failed: ${error.message || error}. Confirm the 'officials' bucket exists and storage policies allow authenticated uploads.`, "error");
    } finally {
      setImageButtonLoading(false);
    }
  }

  function clearImageFields() {
    setValue("image_url", "");
    const input = $("official_image_file");
    if (input) input.value = "";
    syncImagePreview();
    setImageHelp("Image cleared from this form. Save the official record to remove it from the person record.", "info");
  }

  function renderOfficials() {
    const list = $("officialList");
    if (!list) return;
    const query = normalizeText($("officialSearch")?.value || "");
    const filter = $("officialFilter")?.value || "all";
    const filtered = state.officials.filter((official) => {
      const haystack = normalizeText([getName(official), official.position, official.category, official.level, official.state, official.lga, official.ward, official.short_info].filter(Boolean).join(" "));
      const matchesQuery = !query || haystack.includes(query);
      const matchesFilter = filter === "all" || official.status === filter || official.category === filter;
      return matchesQuery && matchesFilter;
    });
    updateStats();
    if (!state.officials.length) {
      list.innerHTML = emptyState("No official records loaded yet. Save your first official or run the SQL file to create apsg_officials.");
      return;
    }
    if (!filtered.length) {
      list.innerHTML = emptyState("No official matches your current search or filter.");
      return;
    }
    list.innerHTML = filtered.map(renderOfficialRow).join("");
    list.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => editOfficial(button.dataset.edit)));
    list.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteOfficial(button.dataset.delete)));
  }

  function renderOfficialRow(official) {
    const id = String(official.id || "");
    const name = getName(official);
    const image = official.image_url || DEFAULT_IMAGE;
    const meta = [official.position, labelForCategory(official.category), official.state, official.lga].filter(Boolean).join(" | ");
    const status = official.status || "draft";
    const statusIcon = status === "published" ? "fa-circle-check" : "fa-pen-ruler";
    return `
      <article class="official-row admin-card p-3" data-id="${escapeAttr(id)}">
        <div class="official-row-inner">
          <img src="${escapeAttr(image)}" alt="${escapeAttr(name)}" class="official-avatar" onerror="this.src='${escapeAttr(DEFAULT_IMAGE)}'" />
          <div class="official-row-content">
            <div class="official-row-top">
              <div>
                <h3 class="official-row-title">${escapeHtml(name)}</h3>
                <p class="official-row-meta">${escapeHtml(meta || "No designation yet")}</p>
              </div>
              <span class="status-pill ${escapeAttr(status)}"><i class="fa-solid ${statusIcon}"></i> ${escapeHtml(status)}</span>
            </div>
            <p class="official-row-excerpt">${escapeHtml(official.short_info || official.biography || "No short profile yet.")}</p>
            <div class="official-row-actions">
              <button type="button" class="admin-btn white" data-edit="${escapeAttr(id)}"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
              <button type="button" class="admin-btn gold" onclick="window.open('/pages/official-details.html?slug=${encodeURIComponent(official.slug || slugify(name))}', '_blank')"><i class="fa-solid fa-eye"></i> View</button>
              <button type="button" class="admin-btn white" data-delete="${escapeAttr(id)}"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  function emptyState(message) {
    return `<div class="empty-state"><i class="fa-solid fa-database text-3xl text-[#d6a92b]"></i><p class="mt-2">${escapeHtml(message)}</p></div>`;
  }

  function updateStats() {
    const published = state.officials.filter((item) => (item.status || "published") === "published" && getName(item));
    setText("statLeadership", String(published.length));
    setText("statPatronage", String(published.filter((item) => ["matron", "patron", "adviser"].includes(item.category)).length));
    setText("statNatExec", String(published.filter((item) => item.category === "national_executive").length));
    setText("statStateExec", String(published.filter((item) => item.category === "state_executive").length));
  }

  async function saveOfficial(event) {
    event.preventDefault();
    if (!state.supabase) { setStatus("Cannot save because Supabase client is not available.", "error"); return; }
    const payload = collectFormPayload();
    if (!payload.full_name || !payload.level || !payload.position || !payload.short_info) {
      setStatus("Please fill Full Name, Level, Position and Short Info before saving.", "error");
      return;
    }
    payload.slug = payload.slug || slugify(payload.full_name);
    const id = $("id")?.value || "";
    const table = state.officialTable || OFFICIAL_TABLES[0];
    setButtonLoading(true);
    setStatus("Saving official to Supabase...", "info");
    try {
      let response;
      if (id) response = await state.supabase.from(table).update(payload).eq("id", id).select("*").single();
      else response = await state.supabase.from(table).insert(payload).select("*").single();
      if (response.error) throw response.error;
      state.officialTable = table;
      await loadOfficials();
      renderOfficials();
      setStatus(`${payload.full_name} saved successfully. The saved image URL can now be used anywhere this person appears on the website.`, "success");
      if ($("open_details_after_save")?.checked) window.open(`/pages/official-details.html?slug=${encodeURIComponent(payload.slug)}`, "_blank");
      resetForm(false);
    } catch (error) {
      setStatus(`Save failed: ${error.message || error}. Confirm your officials table has the columns in the SQL file.`, "error");
    } finally {
      setButtonLoading(false);
    }
  }

  function collectFormPayload() {
    const payload = {};
    ["full_name", "slug", "level", "position", "category", "seat", "state", "zone", "lga", "ward", "image_url", "short_info", "credentials", "biography", "status"].forEach((field) => {
      payload[field] = ($(field)?.value || "").trim();
    });
    payload.display_order = Number($("display_order")?.value || 999) || 999;
    payload.is_featured = Boolean($("is_featured")?.checked);
    return payload;
  }

  function editOfficial(id) {
    const official = state.officials.find((item) => String(item.id) === String(id));
    if (!official) return;
    ["id", "full_name", "slug", "level", "category", "seat", "state", "zone", "image_url", "short_info", "credentials", "biography", "display_order", "status"].forEach((field) => setValue(field, official[field] == null ? "" : official[field]));
    populateDesignationOptions();
    setValue("position", official.position || "");
    populateLocationSelects();
    setValue("lga", official.lga || "");
    populateWardOptions();
    setValue("ward", official.ward || "");
    if ($("is_featured")) $("is_featured").checked = Boolean(official.is_featured);
    const fileInput = $("official_image_file");
    if (fileInput) fileInput.value = "";
    syncImagePreview();
    updateShortCount();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setStatus(`Editing ${getName(official)}. Update the form and save.`, "info");
  }

  async function deleteOfficial(id) {
    if (!state.supabase || !state.officialTable || !id) return;
    const official = state.officials.find((item) => String(item.id) === String(id));
    const name = official ? getName(official) : "this official";
    if (!window.confirm(`Delete ${name}? This will remove the record from Supabase.`)) return;
    try {
      const { error } = await state.supabase.from(state.officialTable).delete().eq("id", id);
      if (error) throw error;
      await loadOfficials();
      renderOfficials();
      setStatus(`${name} deleted successfully.`, "success");
    } catch (error) {
      setStatus(`Delete failed: ${error.message || error}`, "error");
    }
  }

  function resetForm(clearStatus = true) {
    $("officialForm")?.reset();
    setValue("id", "");
    setValue("display_order", "999");
    setValue("status", "published");
    state.selectedMember = null;
    populateDesignationOptions();
    populateLocationSelects();
    updateShortCount();
    syncImagePreview();
    if (clearStatus) setStatus("Form reset. Select a Supabase member or create a new official manually.", "info");
  }

  function loadSample() {
    resetForm(false);
    setValue("full_name", "Iyaafin Oluwafunmilayo Adejoke Ogunba-Koleowo");
    setValue("slug", "iyaafin-oluwafunmilayo-adejoke-ogunba-koleowo");
    setValue("level", "bot");
    populateDesignationOptions();
    setValue("position", "Director-General");
    setValue("category", "bot");
    setValue("seat", "Board Secretariat");
    setValue("state", "");
    setValue("zone", "National");
    setValue("short_info", "Director-General of APC Progressive Support Group and National Convener of Confident Women Development Initiative.");
    setValue("credentials", "APSG Director-General / CWDI National Convener.");
    setValue("biography", "Full official biography and leadership dossier can be entered here for the public details page.");
    updateShortCount();
    syncImagePreview();
    setStatus("Sample loaded. Replace the details or save as a test record.", "info");
  }

  function getName(item) {
    return getField(item, ["full_name", "name", "fullname", "display_name", "official_name", "member_name", "applicant_name"]) || [
      getField(item, ["title"]), getField(item, ["first_name", "firstname", "given_name"]), getField(item, ["middle_name", "middlename"]), getField(item, ["last_name", "lastname", "surname", "family_name"])
    ].filter(Boolean).join(" ").trim();
  }
  function getField(item, keys) {
    if (!item) return "";
    for (const key of keys) {
      if (item[key] != null && String(item[key]).trim()) return String(item[key]).trim();
    }
    return "";
  }
  function sortOfficials(a, b) {
    const orderA = Number(a.display_order ?? 999);
    const orderB = Number(b.display_order ?? 999);
    if (orderA !== orderB) return orderA - orderB;
    return getName(a).localeCompare(getName(b));
  }
  function labelForCategory(value) {
    const labels = { national_executive: "National Executive", bot: "BOT / Board Secretariat", matron: "Matron", patron: "Patron", state_executive: "State Executive", adviser: "Adviser" };
    return labels[value] || value || "Leadership";
  }
  function getZone(stateName) {
    if (!stateName) return "National";
    const compact = stateName.replace(/\s+/g, "");
    return STATE_ZONES[stateName] || STATE_ZONES[compact] || "";
  }
  function updateShortCount() { setText("shortInfoCount", String(($("short_info")?.value || "").length)); }
  function setButtonLoading(isLoading) {
    const button = $("saveOfficialBtn");
    if (!button) return;
    button.disabled = isLoading;
    button.innerHTML = isLoading ? `<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...` : `<i class="fa-solid fa-floppy-disk"></i> Save Official`;
  }
  function setImageButtonLoading(isLoading) {
    state.uploadingImage = isLoading;
    const button = $("uploadImageBtn");
    if (!button) return;
    button.disabled = isLoading;
    button.innerHTML = isLoading ? `<i class="fa-solid fa-circle-notch fa-spin"></i> Uploading...` : `<i class="fa-solid fa-cloud-arrow-up"></i> Upload Image`;
  }
  function setStatus(message, type) {
    const el = $("supabaseStatus") || $("memberPickerHelp");
    if (!el) return;
    const tone = type === "error" ? "#b91c1c" : type === "success" ? "#0f8a4b" : "#64748b";
    el.style.color = tone;
    el.textContent = message;
  }
  function setImageHelp(message, type) {
    const el = $("imageUploadHelp");
    if (!el) { setStatus(message, type); return; }
    const tone = type === "error" ? "#b91c1c" : type === "success" ? "#0f8a4b" : "#64748b";
    el.style.color = tone;
    el.textContent = message;
  }
  function setValue(id, value) {
    const el = $(id);
    if (!el) return;
    const nextValue = value == null ? "" : String(value);
    if (el.tagName === "SELECT" && nextValue && !Array.from(el.options).some((option) => option.value === nextValue)) {
      const option = document.createElement("option");
      option.value = nextValue;
      option.textContent = nextValue;
      el.appendChild(option);
      el.disabled = false;
    }
    el.value = nextValue;
  }
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
  function slugify(value) {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  }
  function normalizeText(value) { return String(value || "").toLowerCase().replace(/\s+/g, " ").trim(); }
  function sameText(a, b) { return normalizeText(a) === normalizeText(b); }
  function unique(values) {
    const seen = new Set();
    return values.filter((value) => {
      const normalized = normalizeText(value);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }
  function getFileExtension(fileName, mimeType) {
    const fromName = String(fileName || "").split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
    if (mimeType === "image/png") return "png";
    if (mimeType === "image/webp") return "webp";
    if (mimeType === "image/gif") return "gif";
    if (mimeType === "image/avif") return "avif";
    return "jpg";
  }
  function randomString(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#096;"); }

  window.APSGLeadershipAdmin = {
    reload: async function () { await Promise.allSettled([loadMembers(), loadOfficials()]); renderOfficials(); },
    getOfficials: function () { return state.officials.slice(); },
    getOfficialImageUrl: function (officialOrName) {
      const name = typeof officialOrName === "string" ? officialOrName : getName(officialOrName);
      const item = typeof officialOrName === "object" ? officialOrName : state.officials.find((official) => sameText(getName(official), name));
      return item?.image_url || DEFAULT_IMAGE;
    }
  };
})();
