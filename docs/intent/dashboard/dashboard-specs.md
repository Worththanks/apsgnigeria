---
parent: dashboard-design
prefix: DASH
---

# APSG Dashboard Requirements

## Command Center

- [ ] **DASH-UI-001**: On the APSG admin dashboard, the page shall show the Command Center title and keep the Members destination immediately available.
- [ ] **DASH-UI-002**: On the APSG admin dashboard, the page shall group account details, account export, CSV export, and missing-document export actions in a compact, keyboard-operable native “Actions” disclosure, preserve their existing destinations and handlers, omit a dashboard Print action, and prevent member-export handlers from emitting partial or stale rows.
- [ ] **DASH-UI-003**: On the APSG admin dashboard, the primary metric area shall contain exactly four indicators: Visible APSG Members, registrations in the last seven days, Data Quality, and Open Data Gaps, using the existing script-populated values.
- [ ] **DASH-UI-004**: On the APSG admin dashboard, the Data Health Overview and Pending Action Center shall appear after the four primary indicators and before secondary reports; the Pending Action Center shall show individual follow-up items, category counts, and links without repeating the aggregate count shown by the Open Data Gaps indicator.
- [ ] **DASH-UI-005**: On the APSG admin dashboard, the seven-day Recent Registrations trend shall be the only membership trend visible in the primary view, and the Registrations by State chart shall be available only in the More reports disclosure.
- [ ] **DASH-UI-006**: On the APSG admin dashboard, the Latest Members list shall be visible in the primary view and retain its existing Members destination.

## Progressive Disclosure and Reports

- [ ] **DASH-UI-007**: On the APSG admin dashboard, More reports shall use a native disclosure that is closed initially on desktop and mobile.
- [ ] **DASH-UI-008**: While the APSG admin dashboard's More reports disclosure is closed, all existing report elements shall remain in the document with their existing unique IDs so the current dashboard script can populate them.
- [ ] **DASH-UI-009**: When an administrator or staff user opens the APSG admin dashboard's More reports disclosure, the page shall expose Last Record and Updated status, current-day and current-month counts, growth, geographic and field-coverage summaries, account and publishing summaries and shortcuts, public-site links, website analytics and the top-page table, recent activity, incomplete-record reporting and export, state rankings, and top-LGA reporting; site-report panels shall show their data or their module-specific loading, empty, or unavailable state.
- [ ] **DASH-UI-011**: When the APSG member query succeeds and returns no rows, the page shall display its no-registration empty state and zero-valued summaries; a failed query shall not be presented as a successful empty result.

## Access and Responsive Layout

- [ ] **DASH-UI-012**: On the APSG admin dashboard, the existing shared sidebar shall remain visually and functionally uniform with other admin pages, with no dashboard-specific sidebar variant; existing role-based visibility, navigation, theme control, identity controls, export handlers, administrative destinations, and public-site destinations shall remain in effect.
- [ ] **DASH-UI-013**: At narrow viewport widths on the APSG admin dashboard, the four indicators and primary work panels shall stack in one column, wide tables shall remain horizontally scrollable within their table containers, and the page shall not require horizontal scrolling.
- [ ] **DASH-UI-014**: When a user resizes the APSG admin dashboard viewport while the More reports disclosure is open, the native disclosure shall retain its open state while the content reflows to fit the viewport.
- [ ] **DASH-UI-015**: On the APSG admin dashboard, the six current header mini tiles shall not remain as a second summary row; their Last Record and Updated details shall remain in More reports, while their other measures are represented by primary indicators or secondary reports.
- [ ] **DASH-UI-016**: On the APSG admin dashboard, Recent Activity shall list member-record events without repeating the Data Quality or aggregate Open Data Gaps values shown elsewhere on the dashboard.
- [ ] **DASH-UI-017**: When a user prints the APSG admin dashboard, the browser print output shall include More reports data and tables even when the disclosure is closed, and shall hide interactive controls using the existing print styling.

## APSG Registry Data and Dashboard State

- [ ] **DASH-DATA-001**: When the APSG dashboard loads membership data, it shall query `public.members` only and shall not query or combine rows from `public.cwdi_members`.
- [ ] **DASH-DATA-002**: On the APSG dashboard, every membership count, trend, completeness measure, gap count, member list, geographic summary, and dashboard member export shall be derived from the same APSG-only row set returned under the current session's row-level-security policy; displayed totals shall describe rows visible to that session.
- [ ] **DASH-DATA-003**: When a CWDI row is added, changed, or removed, APSG dashboard membership figures, lists, and exports shall remain unchanged unless APSG rows or the current session's row-level-security result changes.
- [ ] **DASH-DATA-004**: While an APSG membership load is pending, the dashboard shall show a loading state; after a successful response it shall show either the populated view or the successful-empty state; after an initial failure it shall show an error and retry action without presenting zero values as a successful empty registry.
- [ ] **DASH-DATA-005**: When an APSG refresh fails after a previous successful load, the dashboard shall mark the retained view as stale, disable member exports until a fresh successful load completes, and provide a retry action.
- [ ] **DASH-DATA-006**: When any page of the APSG offset-paginated query fails, returns duplicate record IDs, or yields a unique-row count different from the initial exact count, the dashboard shall discard that load and shall not render its partial rows as complete membership data.
- [ ] **DASH-DATA-007**: While the APSG dashboard reads offset-paginated rows, it shall treat each successful load as a best-effort read and shall not claim a transactionally consistent snapshot when records change during pagination.
- [ ] **DASH-DATA-008**: On the APSG dashboard, the Data Quality value shall equal the rounded arithmetic mean of six rounded coverage percentages for PVC, APC card, account, phone, email, and complete state/LGA/ward; PVC and APC uploads shall count as coverage, all three location values shall be required for location coverage, and an empty visible row set shall yield 0%.
- [ ] **DASH-DATA-009**: On the APSG dashboard, Open Data Gaps shall sum missing PVC, APC card, account, phone, incomplete state/LGA/ward tuple, and duplicate-phone records; missing name and email shall not contribute, blank phone values shall not form duplicate groups, and every row in an exact trimmed duplicate-phone group shall count.
- [ ] **DASH-DATA-010**: On the APSG dashboard, today, last-seven-days, current-month, and prior-seven-days membership periods shall use half-open local-calendar intervals in the browser's timezone; invalid and future timestamps shall not contribute to period counts; when the prior seven-day count is zero, growth shall be 100% if the current count is positive and 0% otherwise.
- [ ] **DASH-DATA-011**: On the APSG dashboard, membership loading shall proceed independently of publishing and website-analytics loading; a slow, failed, or unresolved site-report module shall not delay or replace the APSG membership view.
- [ ] **DASH-DATA-012**: On the APSG dashboard, the Latest Members table shall be labeled as a preview of at most 8 rows and the incomplete-record table as a preview of at most 10 rows; the incomplete-record export shall include all matching rows.
- [ ] **DASH-DATA-013**: Before the first successful APSG load, and after a failed refresh, dashboard member exports shall not emit partial or stale rows; after a successful empty load, exports shall report that there are no matching records.
