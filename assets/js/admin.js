// APSG Admin Dashboard helpers. Uses the single anon-only Supabase browser client.
(function () {
  'use strict';
  const sb = () => window.apsgSupabase || window.supabaseClient || window.supabaseClientPublic || null;
  let membersTable;

  document.addEventListener('DOMContentLoaded', async () => {
    const table = document.getElementById('membersTable');
    if (!table) return;
    await loadMembers();
    document.getElementById('exportCsv')?.addEventListener('click', exportToCSV);
  });

  async function loadMembers() {
    const supabase = sb();
    if (!supabase) {
      alert('Supabase client is unavailable. Check /assets/js/supabase-clients.js.');
      return;
    }
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      alert('Error loading members: ' + friendlySupabaseError(error));
      console.error(error);
      return;
    }
    const rows = Array.isArray(data) ? data : [];
    const total = document.getElementById('totalCount');
    if (total) total.textContent = rows.length;

    if (!window.jQuery || !jQuery.fn?.DataTable) return;
    membersTable = jQuery('#membersTable').DataTable({
      data: rows,
      columns: [
        { data: 'full_name' },
        { data: 'phone' },
        { data: 'state' },
        { data: 'lga' },
        { data: 'ward' },
        { data: 'pvc_number' },
        { data: 'apc_card_number' },
        { data: 'pvc_upload_path', render: data => data ? `<button class="btn btn-sm btn-outline-success img-preview" data-path="${escapeAttr(data)}">View PVC</button>` : '-' },
        { data: 'apc_upload_path', render: data => data ? `<button class="btn btn-sm btn-outline-success img-preview" data-path="${escapeAttr(data)}">View APC</button>` : '-' },
        { data: 'created_at', render: data => data ? new Date(data).toLocaleDateString('en-NG') : '-' },
        { data: 'id', render: data => `<button class="btn btn-sm btn-danger delete-btn" data-id="${escapeAttr(data)}" aria-label="Delete member"><i class="fas fa-trash"></i></button>` }
      ],
      pageLength: 25,
      order: [[9, 'desc']]
    });

    jQuery('#membersTable').on('click', '.img-preview', async function () {
      const path = jQuery(this).data('path');
      const { data, error } = await supabase.storage.from('uploads').createSignedUrl(path, 600);
      if (error) { alert('Could not open file: ' + friendlySupabaseError(error)); return; }
      const img = document.getElementById('modalImage');
      const title = document.getElementById('modalTitle');
      if (img) img.src = data.signedUrl;
      if (title) title.textContent = String(path).includes('/pvc/') ? 'PVC Image' : 'APC Membership Card';
      if (window.bootstrap) new bootstrap.Modal(document.getElementById('imageModal')).show();
    });

    jQuery('#membersTable').on('click', '.delete-btn', async function () {
      if (!confirm('Are you sure you want to delete this member?')) return;
      const id = jQuery(this).data('id');
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) alert('Delete failed: ' + friendlySupabaseError(error));
      else { alert('Member deleted successfully'); membersTable.row(jQuery(this).parents('tr')).remove().draw(); }
    });
  }

  function friendlySupabaseError(error) {
    const msg = error?.message || String(error || 'Unknown Supabase error');
    if (/relation .* does not exist|not found/i.test(msg)) return 'Missing table. Confirm Supabase schema and RLS policies are deployed.';
    if (/bucket|storage/i.test(msg)) return 'Missing or restricted storage bucket. Confirm the uploads bucket and policies.';
    if (/row-level security|rls|permission denied|not authorized/i.test(msg)) return 'RLS denied this operation. Confirm admin_profiles role and table policies.';
    if (/failed to fetch|network|offline/i.test(msg)) return 'Network/offline issue. Check connection and Supabase URL.';
    return msg;
  }
  function escapeAttr(value) { return String(value ?? '').replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m])); }
  function exportToCSV() { if (membersTable?.button) membersTable.button('.buttons-csv').trigger(); }
})();
