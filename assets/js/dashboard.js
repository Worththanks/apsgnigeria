let cachedMembers = [];
let hasSuccessfulMemberLoad = false;
let memberDataStatus = 'idle';

        const els = {
            sidebar: document.getElementById('sidebar'),
            overlay: document.getElementById('mobile-overlay'),
            totalMembers: document.getElementById('totalMembers'),
            todaysRegistrations: document.getElementById('todaysRegistrations'),
            activeStates: document.getElementById('activeStates'),
            accountMembers: document.getElementById('accountMembers'),
            topStatesValue: document.getElementById('topStatesValue'),
            topLgasValue: document.getElementById('topLgasValue'),
            donutValue: document.getElementById('donut-value'),
            donutSegments: document.querySelectorAll('.donut-segment'),
            donutLegend: document.getElementById('donut-legend'),
            bars: document.querySelectorAll('.bar'),
            noDataMessage: document.getElementById('noDataMessage'),
            documentCoverage: document.getElementById('documentCoverage'),
            accountCoverage: document.getElementById('accountCoverage'),
            lastRegistered: document.getElementById('lastRegistered'),
            lastUpdatedLabel: document.getElementById('lastUpdatedLabel'),
            dashboardDataStatus: document.getElementById('dashboardDataStatus'),
            dashboardRetryButton: document.getElementById('dashboardRetryButton'),
            publishingModuleStatus: document.getElementById('publishingModuleStatus'),
            websiteAnalyticsModuleStatus: document.getElementById('websiteAnalyticsModuleStatus'),
            weekMiniLabel: document.getElementById('weekMiniLabel'),
            pendingMiniLabel: document.getElementById('pendingMiniLabel'),
            weekRegistrations: document.getElementById('weekRegistrations'),
            monthRegistrations: document.getElementById('monthRegistrations'),
            growthRate: document.getElementById('growthRate'),
            dataQualityRate: document.getElementById('dataQualityRate'),
            topStateCard: document.getElementById('topStateCard'),
            topStateMeta: document.getElementById('topStateMeta'),
            pvcCoverageCard: document.getElementById('pvcCoverageCard'),
            apcCoverageCard: document.getElementById('apcCoverageCard'),
            phoneCoverageCard: document.getElementById('phoneCoverageCard'),
            emailCoverageCard: document.getElementById('emailCoverageCard'),
            pvcCoverageBar: document.getElementById('pvcCoverageBar'),
            apcCoverageBar: document.getElementById('apcCoverageBar'),
            phoneCoverageBar: document.getElementById('phoneCoverageBar'),
            emailCoverageBar: document.getElementById('emailCoverageBar'),
            pendingActionsCount: document.getElementById('pendingActionsCount'),
            dataHealthList: document.getElementById('dataHealthList'),
            pendingActionsList: document.getElementById('pendingActionsList'),
            recentActivityList: document.getElementById('recentActivityList'),
            latestMembersTable: document.getElementById('latestMembersTable'),
            incompleteRecordsTable: document.getElementById('incompleteRecordsTable'),
            topStatesTable: document.getElementById('topStatesTable'),
            newsPublishedCount: document.getElementById('newsPublishedCount'),
            newsDraftCount: document.getElementById('newsDraftCount'),
            meetingsPublishedCount: document.getElementById('meetingsPublishedCount'),
            meetingsUpcomingCount: document.getElementById('meetingsUpcomingCount'),
            eventsPublishedCount: document.getElementById('eventsPublishedCount'),
            eventsUpcomingCount: document.getElementById('eventsUpcomingCount'),
            galleryAlbumCount: document.getElementById('galleryAlbumCount'),
            visitorsTodayCount: document.getElementById('visitorsTodayCount'),
            pageViewsTodayCount: document.getElementById('pageViewsTodayCount'),
            pageViewsWeekCount: document.getElementById('pageViewsWeekCount'),
            ctaClicksWeekCount: document.getElementById('ctaClicksWeekCount'),
            topPublicPageLabel: document.getElementById('topPublicPageLabel'),
            topPublicPageMeta: document.getElementById('topPublicPageMeta'),
            topPublicPagesTable: document.getElementById('topPublicPagesTable')
        };



        function getClient() {
            return window.supabaseClient || window.apsgSupabase || window.APSG_SUPABASE || (window.APSG && window.APSG.supabase) || window.supabase || null;
        }

        async function waitForSupabaseClient() {
            for (let i = 0; i < 40; i += 1) {
                const client = getClient();
                if (client && typeof client.from === 'function' && client.auth) {
                    window.supabaseClient = client;
                    return client;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return null;
        }

        function redirectToLogin() {
            const next = encodeURIComponent(location.pathname + location.search);
            window.location.href = `/admin/login.html?next=${next}`;
        }

        async function ensureDashboardSession() {
            const client = await waitForSupabaseClient();
            if (!client || !client.auth) {
                redirectToLogin();
                return false;
            }
            try {
                const { data, error } = await client.auth.getSession();
                if (error) throw error;
                if (!data?.session) {
                    redirectToLogin();
                    return false;
                }
                return true;
            } catch (error) {
                console.warn('Dashboard session check failed:', error?.message || error);
                redirectToLogin();
                return false;
            }
        }

        function applyRoleToSidebar(role) {
            const normalized = String(role || 'viewer').toLowerCase();
            const label = document.getElementById('adminRoleLabel');
            if (label) label.textContent = normalized.charAt(0).toUpperCase() + normalized.slice(1);
            const topBadge = document.getElementById('topRoleBadge');
            if (topBadge) topBadge.innerHTML = `<i class="fas fa-user-shield"></i>${normalized}`;
            document.querySelectorAll('[data-role-level]').forEach(el => el.classList.toggle('active', el.dataset.roleLevel === normalized));
            document.querySelectorAll('[data-access]').forEach(el => {
                const allowed = String(el.dataset.access || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
                const locked = allowed.length && !allowed.includes(normalized);
                el.classList.toggle('locked-by-role', locked);
                el.hidden = locked;
                if (locked) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
            });
        }

        const ui = {
            toggleSidebar() {
                els.sidebar.classList.toggle('-translate-x-full');
                els.overlay.classList.toggle('hidden');
            },
            closeSidebar() {
                els.sidebar.classList.add('-translate-x-full');
                els.overlay.classList.add('hidden');
            },
            setTheme(mode) {
                if (mode === 'carbon') {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('daynight-theme', 'carbon');
                } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('daynight-theme', 'snow');
                }
                document.querySelectorAll('.theme-btn-snow, .theme-btn-carbon').forEach(btn => {
                    const active = btn.classList.contains(`theme-btn-${mode}`);
                    btn.classList.toggle('bg-warning', active);
                    btn.classList.toggle('text-primary-dark', active);
                    btn.classList.toggle('shadow-sm', active);
                });
            }
        };

        const auth = {
            async logout() {
                if (typeof supabaseClient !== 'undefined') {
                    await supabaseClient.auth.signOut();
                }
                window.location.href = '/admin/login.html';
            }
        };

        function toLocalDateString(dateInput) {
            const d = new Date(dateInput);
            if (Number.isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function niceDateTime(dateInput) {
            if (!dateInput) return 'No data';
            const d = new Date(dateInput);
            if (Number.isNaN(d.getTime())) return 'No data';
            return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        function escapeCsv(value) {
            const text = value == null ? '' : String(value);
            return `"${text.replace(/"/g, '""')}"`;
        }

        function hasValue(value) {
            return String(value ?? '').trim().length > 0;
        }

        function fullName(member) {
            return `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.name || 'Unnamed member';
        }

        function hasPVC(member) {
            return hasValue(member.pvc_number) || hasValue(member.pvc_upload_path);
        }

        function hasAPCCard(member) {
            return hasValue(member.apc_card_number) || hasValue(member.apc_upload_path);
        }

        function hasDocuments(member) {
            return hasPVC(member) || hasAPCCard(member);
        }

        function percent(part, total) {
            if (!total) return 0;
            return Math.round((part / total) * 100);
        }

        function setText(el, value) {
            if (el) el.textContent = value;
        }

        function setReportModuleStatus(el, message) {
            if (!el) return;
            el.textContent = message;
            el.dataset.state = /loading/i.test(message) ? 'loading' : /unavailable|failed/i.test(message) ? 'error' : 'ready';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
        }

        function setProgress(bar, value) {
            if (bar) bar.style.width = `${Math.max(0, Math.min(100, value))}%`;
        }

        function startOfToday() {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d;
        }

        function daysAgoStart(days) {
            const d = startOfToday();
            d.setDate(d.getDate() - days);
            return d;
        }

        function startOfMonth() {
            const d = new Date();
            return new Date(d.getFullYear(), d.getMonth(), 1);
        }

        function isOnOrAfter(dateInput, threshold) {
            const d = new Date(dateInput || 0);
            return !Number.isNaN(d.getTime()) && d >= threshold;
        }

        // @spec DASH-DATA-010
        function isWithinLocalPeriod(dateInput, startInclusive, endExclusive, now = new Date()) {
            const date = new Date(dateInput);
            const current = new Date(now);
            return !Number.isNaN(date.getTime())
                && !Number.isNaN(current.getTime())
                && date >= startInclusive
                && date < endExclusive
                && date <= current;
        }

        function getMissingFields(member) {
            const missing = [];
            if (!hasValue(member.first_name) && !hasValue(member.last_name) && !hasValue(member.name)) missing.push('Name');
            if (!hasValue(member.phone)) missing.push('Phone');
            if (!hasValue(member.state)) missing.push('State');
            if (!hasValue(member.lga)) missing.push('LGA');
            if (!hasValue(member.ward)) missing.push('Ward');
            if (!hasPVC(member)) missing.push('PVC');
            if (!hasAPCCard(member)) missing.push('APC Card');
            if (!hasValue(member.account_number)) missing.push('Account');
            return missing;
        }

        function buildCsv(rows, columns, filename) {
            if (!rows.length) {
                alert('No matching records available for this export.');
                return;
            }
            const csvRows = [columns.map(escapeCsv).join(',')];
            rows.forEach(member => {
                csvRows.push(columns.map(col => {
                    if (col === 'full_name') return escapeCsv(fullName(member));
                    if (col === 'missing_fields') return escapeCsv(getMissingFields(member).join(', '));
                    return escapeCsv(member[col]);
                }).join(','));
            });
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        // @spec DASH-DATA-013
        function getFreshMembersForExport() {
            if (memberDataStatus !== 'fresh' && memberDataStatus !== 'empty') {
                alert('Fresh APSG dashboard data is unavailable. Refresh successfully before exporting member records.');
                return null;
            }
            return cachedMembers;
        }

        function setDashboardDataStatus(status, message) {
            memberDataStatus = status;
            const statusElement = els.dashboardDataStatus;
            if (statusElement) {
                statusElement.dataset.state = status;
                statusElement.setAttribute('role', status === 'error' ? 'alert' : 'status');
                const messageElement = statusElement.querySelector('[data-status-message]');
                if (messageElement) messageElement.textContent = message;
            }

            const retryButton = els.dashboardRetryButton;
            if (retryButton) {
                retryButton.hidden = status !== 'error' && status !== 'stale';
                retryButton.disabled = status === 'loading';
            }

            const exportsEnabled = status === 'fresh' || status === 'empty';
            document.querySelectorAll('[data-member-export]').forEach(button => {
                button.disabled = !exportsEnabled;
                button.setAttribute('aria-disabled', String(!exportsEnabled));
            });
        }

        function exportFilteredCsvFile(type = 'all') {
            const members = getFreshMembersForExport();
            if (!members) return;
            logDashboardActivity('export_filtered_csv', 'members', `Exported ${type} member report.`, { report_type: type });
            const baseColumns = ['reg_number', 'full_name', 'phone', 'email', 'state', 'lga', 'ward', 'pvc_number', 'apc_card_number', 'account_number', 'bank_name', 'missing_fields', 'created_at'];
            let rows = members;
            let filename = `apsg-members-${type}-${toLocalDateString(new Date())}.csv`;

            if (type === 'missing-docs') rows = members.filter(member => !hasDocuments(member));
            if (type === 'missing-accounts') rows = members.filter(member => !hasValue(member.account_number));
            if (type === 'incomplete') rows = members.filter(member => getMissingFields(member).length > 0);

            buildCsv(rows, baseColumns, filename);
        }

        function exportCsvFile() {
            const members = getFreshMembersForExport();
            if (!members) return;
            logDashboardActivity('export_members_csv', 'members', 'Exported all member records from dashboard.', {});
            if (!members.length) {
                alert('No matching records available for this export.');
                return;
            }
            const columns = ['reg_number', 'first_name', 'last_name', 'account_number', 'bank_name', 'designation', 'phone', 'email', 'state', 'lga', 'ward', 'pvc_number', 'apc_card_number', 'created_at'];
            const rows = [columns.join(',')];
            members.forEach(member => {
                rows.push(columns.map(col => escapeCsv(member[col])).join(','));
            });
            const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `apsg-members-${toLocalDateString(new Date())}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        function exportAccountCsvFile() {
            const members = getFreshMembersForExport();
            if (!members) return;
            logDashboardActivity('export_account_csv', 'members', 'Exported member account details report.', {});
            const accountMembers = members.filter(member => String(member.account_number || '').trim());
            if (!accountMembers.length) {
                alert('No member account details are available yet.');
                return;
            }
            const headers = ['Reg Number', 'Full Name', 'Account Number', 'Bank', 'Phone Number', 'State', 'LGA', 'Ward'];
            const rows = [headers.map(escapeCsv).join(',')];
            accountMembers.forEach(member => {
                const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
                rows.push([
                    member.reg_number || '',
                    fullName,
                    member.account_number || '',
                    member.bank_name || '',
                    member.phone || '',
                    member.state || '',
                    member.lga || '',
                    member.ward || ''
                ].map(escapeCsv).join(','));
            });
            const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `member_account_details_${toLocalDateString(new Date())}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }


        async function getMembersExactCount() {
            const { count, error } = await supabaseClient
                .from('members')
                .select('id', { count: 'exact', head: true });

            if (error) throw error;
            if (count === null || count === undefined) throw new Error('The APSG member count could not be verified.');
            const totalCount = Number(count);
            if (!Number.isSafeInteger(totalCount) || totalCount < 0) throw new Error('The APSG member count could not be verified.');
            return totalCount;
        }

        // @spec DASH-DATA-001, DASH-DATA-002, DASH-DATA-003, DASH-DATA-006, DASH-DATA-007
        async function fetchAllMembers({ orderColumn = 'id', ascending = true, pageSize = 1000 } = {}) {
            const totalCount = await getMembersExactCount();
            const allRows = [];
            if (!totalCount) return allRows;

            for (let from = 0; from < totalCount; from += pageSize) {
                const to = Math.min(from + pageSize - 1, totalCount - 1);
                let query = supabaseClient.from('members').select('*').range(from, to);
                if (orderColumn) query = query.order(orderColumn, { ascending });

                const { data, error } = await query;
                if (error) throw error;
                if (!Array.isArray(data)) throw new Error('An APSG member page returned an invalid response.');

                const expectedPageSize = Math.min(pageSize, totalCount - from);
                if (data.length !== expectedPageSize) throw new Error('The APSG member list changed during pagination. Retry the dashboard load.');
                allRows.push(...data);
            }

            const ids = allRows.map(member => String(member?.id ?? '').trim());
            const uniqueIds = new Set(ids);
            if (allRows.length !== totalCount || ids.some(id => !id) || uniqueIds.size !== totalCount) {
                throw new Error('The APSG member list changed during pagination. Retry the dashboard load.');
            }

            // Offset pagination is a best-effort read; this detects shifts but cannot provide a snapshot.
            return allRows;
        }


        function renderEmptyOverview() {
            const zeroEls = [
                els.totalMembers, els.todaysRegistrations, els.activeStates, els.accountMembers,
                els.weekMiniLabel, els.pendingMiniLabel, els.weekRegistrations, els.monthRegistrations,
                els.pendingActionsCount
            ];
            zeroEls.forEach(el => setText(el, '0'));
            [els.growthRate, els.dataQualityRate, els.pvcCoverageCard, els.apcCoverageCard, els.phoneCoverageCard, els.emailCoverageCard, els.documentCoverage, els.accountCoverage]
                .forEach(el => setText(el, '0%'));
            [els.pvcCoverageBar, els.apcCoverageBar, els.phoneCoverageBar, els.emailCoverageBar].forEach(bar => setProgress(bar, 0));
            setText(els.topStateCard, 'No data');
            setText(els.topStateMeta, 'Highest coverage');
            setText(els.topStatesValue, 'No data');
            setText(els.topLgasValue, 'No data');
            setText(els.lastRegistered, 'No data');
            setText(els.donutValue, '0');
            if (els.donutLegend) els.donutLegend.innerHTML = '';
            els.donutSegments.forEach(segment => { segment.style.strokeDasharray = '0 100'; });
            document.querySelectorAll('.bar').forEach(bar => { bar.style.height = '4px'; bar.title = '0 registrations'; });
            document.querySelectorAll('.count-label').forEach(label => { label.textContent = '0'; });
            if (els.dataHealthList) els.dataHealthList.innerHTML = '';
            if (els.pendingActionsList) els.pendingActionsList.innerHTML = '<div class="action-row"><span class="status-pill">Clean</span><span class="font-bold text-gray-600 dark:text-gray-300">No data yet.</span></div>';
            if (els.recentActivityList) els.recentActivityList.innerHTML = '<div class="activity-row"><i class="fas fa-inbox text-warning"></i><span class="font-bold text-gray-600 dark:text-gray-300">No recent activity.</span></div>';
            [els.latestMembersTable, els.incompleteRecordsTable, els.topStatesTable].forEach(tbody => { if (tbody) tbody.innerHTML = '<tr><td colspan="7">No data available</td></tr>'; });
        }

        function countByField(rows, field) {
            const counts = {};
            rows.forEach(row => {
                const value = String(row[field] || '').trim();
                if (value) counts[value] = (counts[value] || 0) + 1;
            });
            return counts;
        }

        function renderDataHealth(metrics) {
            if (!els.dataHealthList) return;
            const items = [
                ['PVC Records', metrics.withPVC, metrics.pvcRate, 'fa-id-card'],
                ['APC Card Records', metrics.withAPC, metrics.apcRate, 'fa-address-card'],
                ['Bank Account Records', metrics.withAccounts, metrics.accountRate, 'fa-building-columns'],
                ['Phone Numbers', metrics.withPhone, metrics.phoneRate, 'fa-phone'],
                ['Email Addresses', metrics.withEmail, metrics.emailRate, 'fa-envelope'],
                ['State / LGA / Ward', metrics.withLocation, metrics.locationRate, 'fa-map-location-dot']
            ];
            els.dataHealthList.innerHTML = items.map(([label, count, rate, icon]) => `
                <div class="quality-row">
                    <span class="overview-icon shrink-0"><i class="fas ${icon}"></i></span>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between gap-2">
                            <p class="truncate text-[11px] font-black text-primary-dark dark:text-white">${label}</p>
                            <p class="text-[11px] font-black text-bronze dark:text-warning">${rate}%</p>
                        </div>
                        <div class="progress-track mt-1.5"><div class="progress-fill" style="width:${rate}%"></div></div>
                        <p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">${count.toLocaleString()} of ${metrics.total.toLocaleString()} records</p>
                    </div>
                </div>
            `).join('');
        }

        function renderPendingActions(metrics) {
            if (!els.pendingActionsList) return;
            const actions = [
                ['Missing PVC details', metrics.missingPVC, 'members.html', 'fa-id-card'],
                ['Missing APC card details', metrics.missingAPC, 'members.html', 'fa-address-card'],
                ['Missing bank account details', metrics.missingAccounts, 'account-details.html', 'fa-building-columns'],
                ['Missing phone number', metrics.missingPhone, 'members.html', 'fa-phone'],
                ['Missing state / LGA / ward', metrics.missingLocation, 'members.html', 'fa-map'],
                ['Possible duplicate phone numbers', metrics.duplicatePhones, 'members.html', 'fa-copy']
            ].filter(item => item[1] > 0);

            if (!actions.length) {
                els.pendingActionsList.innerHTML = '<div class="action-row"><span class="status-pill"><i class="fas fa-circle-check"></i> Clean</span><span class="font-bold text-gray-600 dark:text-gray-300">No critical pending action detected.</span></div>';
                return;
            }

            els.pendingActionsList.innerHTML = actions.map(([label, count, href, icon]) => `
                <a href="${href}" class="action-row hover:bg-warning/10 transition">
                    <span class="overview-icon shrink-0"><i class="fas ${icon}"></i></span>
                    <span class="min-w-0 flex-1">
                        <span class="block text-[11px] font-black text-primary-dark dark:text-white">${label}</span>
                        <span class="block text-[10px] text-gray-500 dark:text-gray-400">Requires verification or update</span>
                    </span>
                    <span class="status-pill ${count > 20 ? 'danger' : 'warn'}">${count.toLocaleString()}</span>
                </a>
            `).join('');
        }

        // @spec DASH-UI-016
        function renderRecentActivity(sortedByDate) {
            if (!els.recentActivityList) return;
            const items = sortedByDate.slice(0, 5).map(member => ({
                icon: 'fa-user-plus',
                title: `New member: ${fullName(member)}`,
                meta: `${member.state || 'No state'} • ${niceDateTime(member.created_at)}`
            }));
            if (!items.length) {
                els.recentActivityList.innerHTML = '<div class="activity-row"><i class="fas fa-inbox text-warning"></i><span class="font-bold text-gray-600 dark:text-gray-300">No recent activity.</span></div>';
                return;
            }
            els.recentActivityList.innerHTML = items.map(item => `
                <div class="activity-row">
                    <span class="overview-icon shrink-0"><i class="fas ${item.icon}"></i></span>
                    <span class="min-w-0">
                        <span class="block truncate text-[11px] font-black text-primary-dark dark:text-white">${item.title}</span>
                        <span class="block truncate text-[10px] text-gray-500 dark:text-gray-400">${item.meta}</span>
                    </span>
                </div>
            `).join('');
        }

        // @spec DASH-DATA-012
        function renderLatestMembers(sortedByDate) {
            if (!els.latestMembersTable) return;
            const rows = sortedByDate.slice(0, 8);
            if (!rows.length) {
                els.latestMembersTable.innerHTML = '<tr><td colspan="7">No members yet</td></tr>';
                return;
            }
            els.latestMembersTable.innerHTML = rows.map(member => `
                <tr>
                    <td>${member.reg_number || '-'}</td>
                    <td>${fullName(member)}</td>
                    <td>${member.state || '-'}</td>
                    <td>${member.lga || '-'}</td>
                    <td><span class="status-pill ${hasDocuments(member) ? '' : 'warn'}">${hasDocuments(member) ? 'Ready' : 'Missing'}</span></td>
                    <td><span class="status-pill ${hasValue(member.account_number) ? '' : 'warn'}">${hasValue(member.account_number) ? 'Ready' : 'Missing'}</span></td>
                    <td>${niceDateTime(member.created_at)}</td>
                </tr>
            `).join('');
        }

        // @spec DASH-DATA-012
        function renderIncompleteRecords(members) {
            if (!els.incompleteRecordsTable) return;
            const rows = members
                .map(member => ({ member, missing: getMissingFields(member) }))
                .filter(item => item.missing.length > 0)
                .sort((a, b) => b.missing.length - a.missing.length)
                .slice(0, 10);
            if (!rows.length) {
                els.incompleteRecordsTable.innerHTML = '<tr><td colspan="5">No incomplete critical records found</td></tr>';
                return;
            }
            els.incompleteRecordsTable.innerHTML = rows.map(({ member, missing }) => `
                <tr>
                    <td>${fullName(member)}</td>
                    <td>${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ' +' + (missing.length - 4) : ''}</td>
                    <td>${member.state || '-'}</td>
                    <td>${member.phone || '-'}</td>
                    <td>${niceDateTime(member.created_at)}</td>
                </tr>
            `).join('');
        }

        function renderTopStates(sortedStates, members, total) {
            if (!els.topStatesTable) return;
            const rows = sortedStates.slice(0, 8);
            if (!rows.length) {
                els.topStatesTable.innerHTML = '<tr><td colspan="5">No state data available</td></tr>';
                return;
            }
            els.topStatesTable.innerHTML = rows.map(([state, count], index) => {
                const stateMembers = members.filter(member => String(member.state || '').trim() === state);
                const lgaCounts = countByField(stateMembers, 'lga');
                const topLga = Object.entries(lgaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
                return `
                    <tr>
                        <td>#${index + 1}</td>
                        <td>${state}</td>
                        <td>${count.toLocaleString()}</td>
                        <td>${percent(count, total)}%</td>
                        <td>${topLga}</td>
                    </tr>
                `;
            }).join('');
        }

        async function getContentCount(tableName, filters = []) {
            try {
                let query = supabaseClient.from(tableName).select('id', { count: 'exact', head: true });
                filters.forEach(([column, value]) => {
                    query = query.eq(column, value);
                });
                const { count, error } = await query;
                if (error) throw error;
                return Number(count || 0);
            } catch (error) {
                return 0;
            }
        }

        async function loadPublishingOverview() {
            setReportModuleStatus(els.publishingModuleStatus, 'Loading publishing data…');
            const contentTables = ['site_content', 'content_items'];
            let loaded = false;
            let contentCount = 0;
            for (const table of contentTables) {
                try {
                    const { data, error } = await supabaseClient.from(table).select('*').limit(500);
                    if (error || !Array.isArray(data)) continue;
                    loaded = true;
                    contentCount = data.length;
                    const isPublished = item => ['published', 'publish', 'live', true].includes(item.status) || item.is_published === true || item.published === true;
                    const isDraft = item => String(item.status || '').toLowerCase() === 'draft' || item.is_published === false;
                    const typeOf = item => String(item.type || item.content_type || item.category || item.kind || '').toLowerCase();
                    const dateValue = item => item.event_date || item.meeting_date || item.date || item.start_date || item.created_at;
                    const upcoming = item => {
                        const d = new Date(dateValue(item) || 0);
                        return !Number.isNaN(d.getTime()) && d >= startOfToday();
                    };
                    const news = data.filter(item => ['blog', 'news', 'update', 'updates'].some(t => typeOf(item).includes(t)));
                    const meetings = data.filter(item => typeOf(item).includes('meeting'));
                    const events = data.filter(item => typeOf(item).includes('event'));
                    setText(els.newsPublishedCount, news.filter(isPublished).length.toLocaleString());
                    setText(els.newsDraftCount, news.filter(isDraft).length.toLocaleString());
                    setText(els.meetingsPublishedCount, meetings.filter(isPublished).length.toLocaleString());
                    setText(els.meetingsUpcomingCount, meetings.filter(upcoming).length.toLocaleString());
                    setText(els.eventsPublishedCount, events.filter(isPublished).length.toLocaleString());
                    setText(els.eventsUpcomingCount, events.filter(upcoming).length.toLocaleString());
                    break;
                } catch (error) {
                    loaded = false;
                }
            }
            if (!loaded) {
                setText(els.newsPublishedCount, '0');
                setText(els.newsDraftCount, '0');
                setText(els.meetingsPublishedCount, '0');
                setText(els.meetingsUpcomingCount, '0');
                setText(els.eventsPublishedCount, '0');
                setText(els.eventsUpcomingCount, '0');
            }
            const galleryCount = await getContentCount('gallery_albums').catch(() => 0);
            setText(els.galleryAlbumCount, galleryCount.toLocaleString());
            setReportModuleStatus(
                els.publishingModuleStatus,
                !loaded ? 'Publishing content is unavailable.' : contentCount === 0 && galleryCount === 0 ? 'No publishing content is available yet.' : 'Publishing summaries are current.'
            );
        }


function safeNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
}

function shortPageLabel(path) {
    const raw = String(path || '').trim() || '/';
    if (raw === '/') return 'Home';
    return raw
        .replace(/^\/pages\//, '')
        .replace(/^\/admin\//, '')
        .replace(/^\//, '')
        .replace(/\.html$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase()) || raw;
}

async function logDashboardActivity(action, entityType = 'dashboard', description = '', metadata = {}) {
    try {
        if (typeof supabaseClient === 'undefined') return;
        await supabaseClient.rpc('dashboard_log_activity', {
            p_action: action,
            p_entity_type: entityType,
            p_entity_id: null,
            p_description: description,
            p_metadata: metadata || {}
        });
    } catch (error) {
        console.info('Dashboard activity log skipped:', error?.message || error);
    }
}

async function loadWebsiteAnalyticsOverview() {
    setReportModuleStatus(els.websiteAnalyticsModuleStatus, 'Loading website analytics…');
    try {
        if (typeof supabaseClient === 'undefined') throw new Error('Supabase client unavailable');

        const today = toLocalDateString(new Date());
        const weekStart = toLocalDateString(daysAgoStart(6));

        let { data: dailyRows, error: dailyError } = await supabaseClient
            .from('dashboard_analytics_daily')
            .select('*')
            .gte('event_day', weekStart)
            .order('event_day', { ascending: false });

        if (dailyError) {
            const raw = await supabaseClient.from('site_analytics_events').select('event_name,page_path,visitor_id,created_at').gte('created_at', weekStart);
            if (raw.error) throw dailyError;
            const grouped = {};
            (raw.data || []).forEach(event => {
                const day = toLocalDateString(event.created_at);
                const key = day + '|' + (event.page_path || '/');
                grouped[key] = grouped[key] || { event_day: day, page_path: event.page_path || '/', page_views: 0, cta_clicks: 0, visitors: new Set() };
                if (event.event_name === 'page_view') grouped[key].page_views += 1;
                if (/click|cta/i.test(event.event_name || '')) grouped[key].cta_clicks += 1;
                if (event.visitor_id) grouped[key].visitors.add(event.visitor_id);
            });
            dailyRows = Object.values(grouped).map(row => ({...row, unique_visitors: row.visitors.size}));
        }

        const rows = Array.isArray(dailyRows) ? dailyRows : [];
        setReportModuleStatus(els.websiteAnalyticsModuleStatus, rows.length ? 'Website analytics are current.' : 'No website activity in the last seven days.');
        const todayRows = rows.filter(row => String(row.event_day) === today);
        const todayPageViews = todayRows.reduce((sum, row) => sum + safeNumber(row.page_views), 0);
        const todayVisitors = todayRows.reduce((sum, row) => sum + safeNumber(row.unique_visitors), 0);
        const weekPageViews = rows.reduce((sum, row) => sum + safeNumber(row.page_views), 0);
        const weekCtaClicks = rows.reduce((sum, row) => sum + safeNumber(row.cta_clicks), 0);

        setText(els.visitorsTodayCount, todayVisitors.toLocaleString());
        setText(els.pageViewsTodayCount, todayPageViews.toLocaleString());
        setText(els.pageViewsWeekCount, weekPageViews.toLocaleString());
        setText(els.ctaClicksWeekCount, weekCtaClicks.toLocaleString());

        let { data: topPages, error: topPagesError } = await supabaseClient
            .from('dashboard_analytics_top_pages')
            .select('*')
            .gte('period_start', weekStart)
            .limit(8);

        if (topPagesError) {
            const pageMap = {};
            rows.forEach(row => {
                const path = row.page_path || '/';
                pageMap[path] = pageMap[path] || { page_path: path, page_views: 0, unique_visitors: 0 };
                pageMap[path].page_views += safeNumber(row.page_views);
                pageMap[path].unique_visitors += safeNumber(row.unique_visitors);
            });
            topPages = Object.values(pageMap).sort((a,b)=>b.page_views-a.page_views).slice(0,8);
        }

        const pages = Array.isArray(topPages) ? topPages : [];
        if (pages.length) {
            const topPage = pages[0];
            setText(els.topPublicPageLabel, shortPageLabel(topPage.page_path));
            setText(els.topPublicPageMeta, `${safeNumber(topPage.page_views).toLocaleString()} views • ${safeNumber(topPage.unique_visitors).toLocaleString()} visitors`);
            if (els.topPublicPagesTable) {
                els.topPublicPagesTable.innerHTML = pages.map(page => `
                    <tr>
                        <td>${shortPageLabel(page.page_path)}</td>
                        <td>${safeNumber(page.page_views).toLocaleString()}</td>
                        <td>${safeNumber(page.unique_visitors).toLocaleString()}</td>
                    </tr>
                `).join('');
            }
        } else {
            setText(els.topPublicPageLabel, 'No data');
            setText(els.topPublicPageMeta, 'Waiting for visits');
            if (els.topPublicPagesTable) els.topPublicPagesTable.innerHTML = '<tr><td colspan="3">No analytics yet</td></tr>';
        }
    } catch (error) {
        console.info('Website analytics overview skipped:', error?.message || error);
        setReportModuleStatus(els.websiteAnalyticsModuleStatus, 'Website analytics are unavailable.');
        setText(els.visitorsTodayCount, '0');
        setText(els.pageViewsTodayCount, '0');
        setText(els.pageViewsWeekCount, '0');
        setText(els.ctaClicksWeekCount, '0');
        setText(els.topPublicPageLabel, 'Not connected');
        setText(els.topPublicPageMeta, 'Run analytics SQL upgrade first');
        if (els.topPublicPagesTable) els.topPublicPagesTable.innerHTML = '<tr><td colspan="3">Analytics tables not connected yet</td></tr>';
    }
}

        const data = {
            // @spec DASH-UI-011, DASH-DATA-002, DASH-DATA-004, DASH-DATA-005, DASH-DATA-008, DASH-DATA-009, DASH-DATA-011
            async loadDashboard() {
                const hadSuccessfulLoad = hasSuccessfulMemberLoad;
                setDashboardDataStatus('loading', hadSuccessfulLoad ? 'Refreshing APSG member data… exports are paused until refresh completes.' : 'Loading APSG member data…');
                const memberLoad = fetchAllMembers({ orderColumn: 'id', ascending: true });
                const moduleLoad = Promise.allSettled([loadPublishingOverview(), loadWebsiteAnalyticsOverview()]);
                moduleLoad.then(results => {
                    results.forEach((result, index) => {
                        if (result.status === 'rejected') {
                            const label = ['Publishing', 'Website analytics'][index];
                            const target = index === 0 ? els.publishingModuleStatus : els.websiteAnalyticsModuleStatus;
                            setReportModuleStatus(target, `${label} data is unavailable.`);
                            console.info(label + ' module failed independently:', result.reason?.message || result.reason);
                        }
                    });
                });
                try {
                    const members = await memberLoad;

                    if (!members || members.length === 0) {
                        els.noDataMessage.classList.remove('hidden');
                        const emptyHeading = els.noDataMessage.querySelector('p');
                        if (emptyHeading) emptyHeading.textContent = 'No registrations yet.';
                        const emptyNote = els.noDataMessage.querySelector('p.text-xs');
                        if (emptyNote) emptyNote.textContent = 'Data will appear here once APSG members start registering.';
                        renderEmptyOverview();
                        cachedMembers = [];
                        hasSuccessfulMemberLoad = true;
                        const updatedAt = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                        setText(els.lastUpdatedLabel, updatedAt);
                        setDashboardDataStatus('empty', `APSG member data loaded successfully at ${updatedAt}. No records are currently visible to this account.`);
                        return;
                    }

                    els.noDataMessage.classList.add('hidden');
                    els.donutLegend.innerHTML = '';

                    const total = members.length;
                    const now = new Date();
                    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const tomorrowStart = new Date(todayStart);
                    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
                    const weekStart = daysAgoStart(6);
                    const previousWeekStart = daysAgoStart(13);
                    const monthStart = startOfMonth();

                    const todaysCount = members.filter(m => isWithinLocalPeriod(m.created_at, todayStart, tomorrowStart, now)).length;
                    const weekCount = members.filter(m => isWithinLocalPeriod(m.created_at, weekStart, tomorrowStart, now)).length;
                    const previousWeekCount = members.filter(m => isWithinLocalPeriod(m.created_at, previousWeekStart, weekStart, now)).length;
                    const monthCount = members.filter(m => isWithinLocalPeriod(m.created_at, monthStart, tomorrowStart, now)).length;
                    const growth = previousWeekCount === 0 ? (weekCount > 0 ? 100 : 0) : Math.round(((weekCount - previousWeekCount) / previousWeekCount) * 100);

                    setText(els.totalMembers, total.toLocaleString());
                    setText(els.todaysRegistrations, todaysCount.toLocaleString());
                    setText(els.weekRegistrations, weekCount.toLocaleString());
                    setText(els.weekMiniLabel, weekCount.toLocaleString());
                    setText(els.monthRegistrations, monthCount.toLocaleString());
                    setText(els.growthRate, `${growth > 0 ? '+' : ''}${growth}%`);

                    const uniqueStates = new Set(members.map(m => m.state?.trim()).filter(Boolean));
                    setText(els.activeStates, uniqueStates.size.toLocaleString());

                    const withPVC = members.filter(hasPVC).length;
                    const withAPC = members.filter(hasAPCCard).length;
                    const withDocs = members.filter(hasDocuments).length;
                    const withAccounts = members.filter(m => hasValue(m.account_number)).length;
                    const withPhone = members.filter(m => hasValue(m.phone)).length;
                    const withEmail = members.filter(m => hasValue(m.email)).length;
                    const withLocation = members.filter(m => hasValue(m.state) && hasValue(m.lga) && hasValue(m.ward)).length;
                    const missingPVC = total - withPVC;
                    const missingAPC = total - withAPC;
                    const missingAccounts = total - withAccounts;
                    const missingPhone = total - withPhone;
                    const missingLocation = total - withLocation;
                    const phoneCounts = countByField(members, 'phone');
                    const duplicatePhones = Object.values(phoneCounts).filter(count => count > 1).reduce((sum, count) => sum + count, 0);

                    const pvcRate = percent(withPVC, total);
                    const apcRate = percent(withAPC, total);
                    const docsRate = percent(withDocs, total);
                    const accountRate = percent(withAccounts, total);
                    const phoneRate = percent(withPhone, total);
                    const emailRate = percent(withEmail, total);
                    const locationRate = percent(withLocation, total);
                    const dataQuality = Math.round((pvcRate + apcRate + accountRate + phoneRate + emailRate + locationRate) / 6);
                    const pendingTotal = missingPVC + missingAPC + missingAccounts + missingPhone + missingLocation + duplicatePhones;

                    setText(els.documentCoverage, `${docsRate}%`);
                    setText(els.accountMembers, withAccounts.toLocaleString());
                    setText(els.accountCoverage, `${accountRate}%`);
                    setText(els.pvcCoverageCard, `${pvcRate}%`);
                    setText(els.apcCoverageCard, `${apcRate}%`);
                    setText(els.phoneCoverageCard, `${phoneRate}%`);
                    setText(els.emailCoverageCard, `${emailRate}%`);
                    setText(els.dataQualityRate, `${dataQuality}%`);
                    setText(els.pendingActionsCount, pendingTotal.toLocaleString());
                    setText(els.pendingMiniLabel, pendingTotal.toLocaleString());
                    setProgress(els.pvcCoverageBar, pvcRate);
                    setProgress(els.apcCoverageBar, apcRate);
                    setProgress(els.phoneCoverageBar, phoneRate);
                    setProgress(els.emailCoverageBar, emailRate);

                    const sortedByDate = [...members].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                    setText(els.lastRegistered, niceDateTime(sortedByDate[0]?.created_at));

                    const stateCounts = countByField(members, 'state');
                    const sortedStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
                    const topThree = sortedStates.slice(0, 3);
                    setText(els.topStatesValue, topThree.map(([state, count], idx) => `${idx + 1}. ${state} (${count})`).join(' | ') || 'No data');
                    if (sortedStates[0]) {
                        setText(els.topStateCard, sortedStates[0][0]);
                        setText(els.topStateMeta, `${sortedStates[0][1].toLocaleString()} members • ${percent(sortedStates[0][1], total)}%`);
                    }

                    const lgaCounts = countByField(members, 'lga');
                    const sortedLGAs = Object.entries(lgaCounts).sort((a, b) => b[1] - a[1]);
                    const topThreeLGAs = sortedLGAs.slice(0, 3);
                    setText(els.topLgasValue, topThreeLGAs.map(([l, c], i) => `${i + 1}. ${l} (${c})`).join(' | ') || 'No data');

                    const metrics = {
                        total, withPVC, withAPC, withAccounts, withPhone, withEmail, withLocation,
                        pvcRate, apcRate, accountRate, phoneRate, emailRate, locationRate,
                        missingPVC, missingAPC, missingAccounts, missingPhone, missingLocation, duplicatePhones,
                        dataQuality, pendingTotal
                    };
                    renderDataHealth(metrics);
                    renderPendingActions(metrics);
                    renderRecentActivity(sortedByDate);
                    renderLatestMembers(sortedByDate);
                    renderIncompleteRecords(members);
                    renderTopStates(sortedStates, members, total);

                    const topFour = sortedStates.slice(0, 4);
                    const othersCount = total - topFour.reduce((sum, entry) => sum + entry[1], 0);
                    const donutData = [...topFour];
                    if (othersCount > 0) donutData.push(['Others', othersCount]);

                    const colors = ['#d6a92b', '#0f8a4b', '#10b981', '#f59e0b', '#94a3b8'];
                    let offset = 0;
                    els.donutSegments.forEach((seg, i) => {
                        if (i < donutData.length) {
                            const [name, count] = donutData[i];
                            const segmentPercent = (count / total * 100) || 0;
                            seg.style.strokeDasharray = `${segmentPercent} 100`;
                            seg.style.strokeDashoffset = -offset;
                            seg.style.stroke = colors[i % colors.length];
                            offset += segmentPercent;

                            const legendItem = document.createElement('div');
                            legendItem.className = 'flex items-center gap-2 rounded-xl bg-white/60 dark:bg-white/5 border border-green-900/10 dark:border-white/10 px-2.5 py-1.5 min-w-0';
                            legendItem.innerHTML = `
                                <div class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${colors[i % colors.length]}"></div>
                                <span class="truncate font-bold text-gray-700 dark:text-gray-200">${name}</span>
                                <span class="ml-auto font-black text-primary-dark dark:text-warning">${count}</span>
                            `;
                            els.donutLegend.appendChild(legendItem);
                        } else {
                            seg.style.strokeDasharray = '0 100';
                        }
                    });
                    setText(els.donutValue, total.toLocaleString());

                    const last7Days = [];
                    const dayNames = [];

                    for (let i = 6; i >= 0; i--) {
                        const date = new Date(todayStart);
                        date.setDate(date.getDate() - i);
                        const end = new Date(date);
                        end.setDate(end.getDate() + 1);
                        last7Days.push([date, end]);
                        dayNames.push(i === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' }));
                    }

                    const counts = last7Days.map(([start, end]) =>
                        members.filter(m => isWithinLocalPeriod(m.created_at, start, end, now)).length
                    );

                    const maxCount = Math.max(...counts, 1);
                    const maxBarHeight = 104;
                    const bars = document.querySelectorAll('.bar');

                    bars.forEach((bar, i) => {
                        const count = counts[i] || 0;
                        const height = count === 0 ? 4 : (count / maxCount) * maxBarHeight;
                        bar.style.height = height + 'px';
                        bar.title = `${dayNames[i]}: ${count} registration${count === 1 ? '' : 's'}`;
                    });

                    const dayLabels = document.querySelectorAll('.day-label');
                    dayLabels.forEach((label, i) => {
                        label.textContent = dayNames[i];
                    });

                    const countLabels = document.querySelectorAll('.count-label');
                    countLabels.forEach((label, i) => {
                        label.textContent = counts[i] || 0;
                    });

                    cachedMembers = members;
                    hasSuccessfulMemberLoad = true;
                    const updatedAt = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    setText(els.lastUpdatedLabel, updatedAt);
                    setDashboardDataStatus('fresh', `APSG member data is current as of ${updatedAt}.`);

                } catch (error) {
                    console.error('Error loading dashboard member data:', error);
                    if (hasSuccessfulMemberLoad) {
                        setDashboardDataStatus('stale', 'Refresh failed. The previous APSG data is retained as stale; member exports are disabled until a fresh load succeeds.');
                    } else {
                        els.noDataMessage?.classList.remove('hidden');
                        if (els.noDataMessage) {
                            const heading = els.noDataMessage.querySelector('p');
                            if (heading) heading.textContent = 'Member data could not be loaded.';
                            const note = els.noDataMessage.querySelector('p.text-xs');
                            if (note) note.textContent = /row-level security|permission|42501/i.test(String(error?.message || error)) ? 'Supabase blocked access to the APSG member registry. Check access and retry.' : 'The dashboard could not load the APSG registry. Check the connection and retry.';
                        }
                        setDashboardDataStatus('error', 'APSG member data failed to load. Retry to check the registry again.');
                    }
                }
            }

        };


        async function resolveAdminRole() {
            let role = 'viewer';
            try {
                const client = await waitForSupabaseClient();
                const { data: sessionData, error: sessionError } = await client.auth.getSession();
                if (sessionError) throw sessionError;
                const user = sessionData?.session?.user;
                if (!user) {
                    redirectToLogin();
                    return 'viewer';
                }

                const email = String(user.email || '').toLowerCase();
                const fields = 'id,user_id,email,role,is_active,status';
                let result = await client.from('admin_profiles').select(fields).eq('id', user.id).limit(1).maybeSingle();
                if (!result?.data) result = await client.from('admin_profiles').select(fields).eq('user_id', user.id).limit(1).maybeSingle();
                if (!result?.data && email) result = await client.from('admin_profiles').select(fields).ilike('email', email).limit(1).maybeSingle();
                if (result?.error) throw result.error;

                const profile = result?.data;
                role = String(profile?.role || user?.app_metadata?.role || user?.user_metadata?.role || 'viewer').toLowerCase();
                const active = profile ? profile.is_active !== false && String(profile.status || 'active').toLowerCase() !== 'inactive' : true;
                if (!active) {
                    applyRoleToSidebar('viewer');
                    document.body.dataset.adminAccess = 'inactive';
                    return 'viewer';
                }
            } catch (error) {
                console.info('Admin role profile lookup skipped:', error?.message || error);
                role = localStorage.getItem('apsg_admin_role') || sessionStorage.getItem('apsg_admin_role') || 'viewer';
            }
            const allowedRoles = ['viewer', 'editor', 'admin', 'superadmin'];
            if (!allowedRoles.includes(role)) role = 'viewer';
            window.APSG_ADMIN_ROLE = role;
            document.body.dataset.adminRole = role;
            applyRoleToSidebar(role);
            return role;
        }

        document.addEventListener('DOMContentLoaded', async () => {
            const hasSession = await ensureDashboardSession();
            if (!hasSession) return;
            if (typeof checkAuth === 'function') { try { await checkAuth(); } catch (error) { console.warn('checkAuth skipped:', error?.message || error); } }
            await resolveAdminRole();
            await data.loadDashboard();
            logDashboardActivity('view_dashboard', 'dashboard', 'Admin opened the APSG command center.', { page: 'dashboard.html' });
            document.querySelectorAll('#sidebar a').forEach(link => link.addEventListener('click', () => { if (window.innerWidth < 768) ui.closeSidebar(); }));
            document.addEventListener('keydown', event => { if (event.key === 'Escape') ui.closeSidebar(); });
            const isDark = document.documentElement.classList.contains('dark');
            ui.setTheme(isDark ? 'carbon' : 'snow');
        });

        window.toggleSidebar = ui.toggleSidebar;
        window.closeSidebar = ui.closeSidebar;
        window.setTheme = ui.setTheme;
        window.logout = auth.logout;
        window.exportCsv = exportCsvFile;
        window.exportAccountCsv = exportAccountCsvFile;
        window.exportFilteredCsv = exportFilteredCsvFile;
        window.APSGDashboard = { reload: () => data.loadDashboard(), exportCsv: exportCsvFile, exportAccounts: exportAccountCsvFile };
