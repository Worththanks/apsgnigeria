(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.APSGRegistrationSubmission = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
    'use strict';
    const registryRpc = Object.freeze({ APSG: 'apsg_register_member', CWDI: 'cwdi_register_member' });
    const normalizeName = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const uploadFields = Object.freeze({ pvc: 'pvc_upload_path', apc: 'apc_upload_path' });

    // @spec REG-SUBMIT-033, REG-SUBMIT-034, REG-SUBMIT-035, REG-SUBMIT-036, REG-SUBMIT-037
    function normalizeContactPair(fields) {
        const phone = String(fields.phone || '').trim();
        const secondary = String(fields.nigerian_phone_e164 || '').trim() || null;
        const preference = String(fields.preferred_contact_type || '').trim() || null;
        const residence = String(fields.residence_country_code || '').trim().toUpperCase();
        if (!secondary && !preference) return { ...fields, nigerian_phone_e164: null, preferred_contact_type: null };
        if (!secondary || !preference) throw new Error('Provide both a Nigerian contact number and a contact preference.');
        if (residence === 'NGA') throw new Error('Nigerian contact details are only available for members living outside Nigeria.');
        if (!/^\+[1-9]\d{6,14}$/.test(secondary) || !/^\+234\d{7,13}$/.test(secondary)) throw new Error('Enter a valid Nigerian contact number in E.164 format.');
        if (secondary === phone) throw new Error('The Nigerian contact number must differ from your primary phone.');
        if (!['primary', 'nigerian'].includes(preference)) throw new Error('Choose a valid preferred contact number.');
        return { ...fields, nigerian_phone_e164: secondary, preferred_contact_type: preference };
    }

    // @spec REG-FORM-007
    function validateFiles(files = {}) {
        for (const [type, file] of Object.entries(files)) {
            if (!file) continue;
            if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) throw new Error(`${type.toUpperCase()} upload must be a JPG, PNG or PDF file.`);
            if (file.size > 5 * 1024 * 1024) throw new Error(`${type.toUpperCase()} upload must be 5 MB or smaller.`);
        }
    }

    // @spec REG-SUBMIT-002, REG-SUBMIT-003, REG-SUBMIT-005, REG-SUBMIT-006, REG-SUBMIT-007, REG-SUBMIT-010, REG-SUBMIT-014, REG-SUBMIT-015, REG-SUBMIT-016, REG-SUBMIT-017
    function createSubmissionService({ getClient, findMembers, verifyMember, makePath }) {
        const pendingUploads = new Map();
        let flight = null;
        const signature = file => [file.name, file.type, file.size, file.lastModified].join('|');
        const identityKey = (membership, data) => JSON.stringify([membership.organization, String(data.fields.phone || '').replace(/[^+0-9]/g, ''), normalizeName(data.fields.first_name), normalizeName(data.fields.last_name)]);
        const matchingMember = (rows, fields) => (rows || []).filter(row => normalizeName(row.first_name) === normalizeName(fields.first_name) && normalizeName(row.last_name) === normalizeName(fields.last_name)).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
        const conflict = () => Object.assign(new Error('A record with this phone number needs identity confirmation before registration can continue.'), { code: 'REGISTRATION_CONFLICT' });

        async function cleanup(client, key, batch, savedMember = {}) {
            const referenced = new Set(Object.values(uploadFields).map(field => savedMember[field]).filter(Boolean));
            const unused = batch.filter(asset => !referenced.has(asset.url));
            if (unused.length) {
                try {
                    const { error } = await client.storage.from('uploads').remove(unused.map(asset => asset.path));
                    if (error) throw error;
                    batch = [];
                } catch (error) {
                    console.warn('Temporary registration uploads will be retried for cleanup.', error);
                    batch = unused;
                }
            } else batch = [];
            if (batch.length) pendingUploads.set(key, batch);
            else pendingUploads.delete(key);
        }

        async function perform(membership, data, files) {
            const rpc = registryRpc[membership?.organization];
            if (!rpc) throw new Error('Choose exactly one valid membership.');
            const client = getClient();
            if (!client?.rpc) throw new Error('Registration service is unavailable.');
            const key = identityKey(membership, data);
            const batch = pendingUploads.get(key) || [];
            let requestStarted = false;
            let priorMember = null;
            let absenceConfirmed = false;
            let submittedFields = { ...data.fields, pvc_upload_path: null, apc_upload_path: null };
            let currentUploads = [];
            try {
                const rows = await findMembers(membership, data.fields.phone);
                priorMember = matchingMember(rows, data.fields);
                if (rows.length && !priorMember) throw conflict();
                absenceConfirmed = !rows.length;
                if (priorMember) {
                    priorMember = await verifyMember(priorMember.reg_number, data.fields.phone, membership.organization);
                } else {
                    validateFiles(files);
                    for (const [type, field] of Object.entries(uploadFields)) {
                        const file = files[type];
                        if (!file) continue;
                        let asset = batch.find(item => item.field === field && item.signature === signature(file));
                        if (!asset) {
                            const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' }[file.type];
                            const path = makePath ? makePath(type, file) : `${type}/${Date.now()}_${crypto.randomUUID()}.${extension}`;
                            const { error } = await client.storage.from('uploads').upload(path, file);
                            if (error) throw error;
                            const { data: urlData } = client.storage.from('uploads').getPublicUrl(path);
                            asset = { field, path, url: urlData.publicUrl, signature: signature(file) };
                            batch.push(asset);
                            pendingUploads.set(key, batch);
                        }
                        submittedFields[field] = asset.url;
                        currentUploads.push({ ...asset, type });
                    }
                }
                requestStarted = true;
                const { data: response, error } = await client.rpc(rpc, {
                    p_member: submittedFields, p_state_code: data.stateCode, p_lga_code: data.lgaCode,
                    p_year: data.year, p_youth_wing: Boolean(membership.youthWing)
                });
                if (error) throw error;
                const result = Array.isArray(response) ? response[0] : response;
                if (result?.status === 'conflict') throw conflict();
                if (!String(result?.reg_number || '').toUpperCase().startsWith(`${membership.organization}/`)) throw new Error('The database did not confirm a valid registration ID. Please retry.');
                let member = priorMember;
                if (result.status === 'registered') await cleanup(client, key, batch, submittedFields);
                else {
                    member = await verifyMember(result.reg_number, data.fields.phone, membership.organization);
                    await cleanup(client, key, batch, member);
                    currentUploads = [];
                }
                return { regNumber: result.reg_number, status: result.status, member, uploads: currentUploads };
            } catch (error) {
                if (!requestStarted || error.code === 'REGISTRATION_CONFLICT') {
                    // No membership write was attempted, or the RPC explicitly refused it.
                    // A pre-existing uncertain batch is reconciled before any deletion below.
                    if (absenceConfirmed && !requestStarted) await cleanup(client, key, batch);
                    else if (error.code === 'REGISTRATION_CONFLICT') await cleanup(client, key, batch);
                } else {
                    // A lost response may follow a committed write. Confirm the row before
                    // deleting any files; retain uncertain uploads so a retry can reuse them.
                    try {
                        const rows = await findMembers(membership, data.fields.phone);
                        const match = matchingMember(rows, data.fields);
                        if (match) {
                            const member = await verifyMember(match.reg_number, data.fields.phone, membership.organization);
                            await cleanup(client, key, batch, member);
                            if (!membership.youthWing || member.is_youth_wing_member) return { regNumber: member.reg_number, status: membership.youthWing ? 'already-youth-member' : 'already-member', member, uploads: [] };
                        } else if (!rows.length) await cleanup(client, key, batch);
                    } catch (recoveryError) { console.warn('Registration result is unconfirmed; uploads retained for retry.', recoveryError); }
                }
                throw error;
            }
        }

        // @spec REG-SUBMIT-033, REG-SUBMIT-034, REG-SUBMIT-035, REG-SUBMIT-036, REG-SUBMIT-037
        async function submit(membership, data, files = {}) {
            if (flight) return flight;
            const snapshot = { ...data, fields: normalizeContactPair({ ...data.fields }) };
            const operation = perform({ ...membership }, snapshot, { ...files });
            flight = operation.finally(() => { flight = null; });
            return flight;
        }
        return Object.freeze({ submit });
    }
    return Object.freeze({ createSubmissionService, validateFiles });
});
