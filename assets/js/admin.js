// admin.js - APSG Admin Dashboard
const SUPABASE_URL = 'https://hamjvcaacrctnmbkwlag.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbWp2Y2FhY3JjdG5tYmt3bGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODk4MzUsImV4cCI6MjA4NDI2NTgzNX0.xvShOYZcSmLoneev4Su8ATzNpGo3sJgC62DrcBpmLw0';


const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let membersTable;

document.addEventListener('DOMContentLoaded', async () => {
    await loadMembers();

    // Export CSV
    document.getElementById('exportCsv').addEventListener('click', exportToCSV);
});

async function loadMembers() {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        alert('Error loading members: ' + error.message);
        console.error(error);
        return;
    }

    document.getElementById('totalCount').textContent = data.length;

    // Initialize DataTable
    membersTable = $('#membersTable').DataTable({
        data: data,
        columns: [
            { data: 'full_name' },
            { data: 'phone' },
            { data: 'state' },
            { data: 'lga' },
            { data: 'ward' },
            { data: 'pvc_number' },
            { data: 'apc_card_number' },
            { 
                data: 'pvc_upload_path',
                render: function(data) {
                    return data ? `<img src="#" class="img-preview" data-path="${data}" title="Click to view PVC">` : '-';
                }
            },
            { 
                data: 'apc_upload_path',
                render: function(data) {
                    return data ? `<img src="#" class="img-preview" data-path="${data}" title="Click to view APC">` : '-';
                }
            },
            { 
                data: 'created_at',
                render: data => new Date(data).toLocaleDateString('en-NG')
            },
            { 
                data: 'id',
                render: function(data) {
                    return `<button class="btn btn-sm btn-danger delete-btn" data-id="${data}">
                              <i class="fas fa-trash"></i>
                            </button>`;
                }
            }
        ],
        pageLength: 25,
        order: [[9, 'desc']]
    });

    // Image Preview Click
    $('#membersTable').on('click', '.img-preview', async function () {
        const path = $(this).data('path');
        const { data: { signedUrl } } = await supabase.storage
            .from('uploads')
            .createSignedUrl(path, 600);

        document.getElementById('modalImage').src = signedUrl;
        document.getElementById('modalTitle').textContent = path.includes('/pvc/') ? 'PVC Image' : 'APC Membership Card';
        new bootstrap.Modal(document.getElementById('imageModal')).show();
    });

    // Delete Member
    $('#membersTable').on('click', '.delete-btn', async function () {
        if (!confirm('Are you sure you want to delete this member?')) return;

        const id = $(this).data('id');
        const { error } = await supabase.from('members').delete().eq('id', id);
        
        if (error) alert('Delete failed: ' + error.message);
        else {
            alert('Member deleted successfully');
            membersTable.row($(this).parents('tr')).remove().draw();
        }
    });
}

// Export to CSV
function exportToCSV() {
    membersTable.button('.buttons-csv').trigger();
}