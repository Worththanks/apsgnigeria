// supabase-client.js - APSG Registration with Supabase
const SUPABASE_URL = 'https://hamjvcaacrctnmbkwlag.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJiskipped...your-anon-key';

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
            const { data: inserted, error: insertError } = await supabase
                .from('members')
                .insert([memberData])
                .select();

            if (insertError) throw insertError;

            const memberId = inserted[0].id;

            // Upload PVC
            let pvcPath = null;
            const pvcFile = formData.get('pvcUpload');
            if (pvcFile && pvcFile.size > 0) {
                const path = `pvc/${memberId}_${pvcFile.name}`;
                const { error } = await supabase.storage.from('uploads').upload(path, pvcFile, { upsert: false });
                if (error) throw error;
                pvcPath = path;
            }

            // Upload APC
            let apcPath = null;
            const apcFile = formData.get('apcUpload');
            if (apcFile && apcFile.size > 0) {
                const path = `apc/${memberId}_${apcFile.name}`;
                const { error } = await supabase.storage.from('uploads').upload(path, apcFile, { upsert: false });
                if (error) throw error;
                apcPath = path;
            }

            // Update row with file paths
            if (pvcPath || apcPath) {
                const update = {};
                if (pvcPath) update.pvc_upload_path = pvcPath;
                if (apcPath) update.apc_upload_path = apcPath;
                const { error } = await supabase.from('members').update(update).eq('id', memberId);
                if (error) throw error;
            }

            messageDiv.innerHTML = '<div class="alert alert-success">Registration successful! Welcome to APSG ✊</div>';
            form.reset();
            document.getElementById('lga').disabled = document.getElementById('ward').disabled = true;

        } catch (err) {
            console.error(err);
            messageDiv.innerHTML = `<div class="alert alert-danger">Error: ${err.message || 'Submission failed'}. Try again or contact support.</div>`;
        } finally {
            submitBtn.disabled = false;
            spinner.style.display = 'none';
        }
    });
});