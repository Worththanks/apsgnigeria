// supabase-clients.js - Fixed & Working (2026)

const SUPABASE_URL = 'https://hamjvcaacrctnmbkwlag.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbWp2Y2FhY3JjdG5tYmt3bGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2ODk4MzUsImV4cCI6MjA4NDI2NTgzNX0.xvShOYZcSmLoneev4Su8ATzNpGo3sJgC62DrcBpmLw0'; // ← Replace with your FULL anon key

const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('regForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const spinner = submitBtn.querySelector('.spinner-border');
    const messageDiv = document.getElementById('formMessage');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        spinner.style.display = 'inline-block';
        messageDiv.innerHTML = '';

        const formData = new FormData(form);

        const memberData = {
            full_name: formData.get('fullName')?.trim(),
            phone: formData.get('phone')?.trim(),
            email: formData.get('email')?.trim() || null,
            state: formData.get('state'),
            lga: formData.get('lga'),
            ward: formData.get('ward'),
            pvc_number: formData.get('pvc')?.trim(),
            apc_card_number: formData.get('apcCard')?.trim(),
        };

        try {
            // Insert member
            const { data: inserted, error: insertError } = await client
                .from('members')
                .insert([memberData])
                .select();

            if (insertError) throw insertError;

            const memberId = inserted[0].id;

            // Upload files with unique names
            const uploadFile = async (file, folder) => {
                if (!file || file.size === 0) return null;
                const path = `${folder}/${memberId}_${Date.now()}_${file.name}`;
                const { error } = await client.storage.from('uploads').upload(path, file, { upsert: false });
                if (error) throw error;
                return path;
            };

            const pvcPath = await uploadFile(formData.get('pvcUpload'), 'pvc');
            const apcPath = await uploadFile(formData.get('apcUpload'), 'apc');

            // Update paths
            if (pvcPath || apcPath) {
                const updates = {};
                if (pvcPath) updates.pvc_upload_path = pvcPath;
                if (apcPath) updates.apc_upload_path = apcPath;
                const { error } = await client.from('members').update(updates).eq('id', memberId);
                if (error) throw error;
            }

            messageDiv.innerHTML = '<div class="alert alert-success">Registration successful! Welcome to APSG ✊</div>';
            form.reset();
            document.getElementById('lga').disabled = document.getElementById('ward').disabled = true;

        } catch (err) {
            console.error('Error:', err);
            messageDiv.innerHTML = `<div class="alert alert-danger">Error: ${err.message || 'Failed. Check console or contact support.'}</div>`;
        } finally {
            submitBtn.disabled = false;
            spinner.style.display = 'none';
        }
    });
});

