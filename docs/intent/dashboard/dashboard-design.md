---
parent: high-level-design
prefix: DASH
---

# Low-Level Design: APSG Command Center

## Scope

This design covers the APSG membership command center at `/admin/dashboard.html`, including its page-specific presentation, membership data selection, calculations, and dashboard exports. APSG membership data is read from `public.members` only. The page does not read or combine rows from `public.cwdi_members`.

The component keeps the existing Supabase client, offset pagination approach, authentication, role checks, registry schema, and non-membership site reports. The dashboard uses the shared admin sidebar without page-specific sizing, spacing, or typography overrides; the shared shell remains the source of its presentation. Sidebar implementation and the CWDI navigation destination belong to the separate admin-sidebar segment. The dashboard has no Print action and retains the existing browser-print behavior: More reports content is included when its disclosure is closed, and interactive controls are hidden. It does not change the CWDI dashboard, the Members Control Room, either registry's schema or row-level security, or the public registration flows.

## Current Structure

The page currently presents a compact APSG header, a Members link and Actions disclosure, four primary indicators, data health and pending actions, a seven-day trend, and the latest-members table. A closed “More reports” disclosure contains secondary membership, publishing, website-analytics, activity, and geographic reports.

The live page's data script targets existing IDs including `totalMembers`, `weekRegistrations`, `dataQualityRate`, `pendingActionsCount`, `dataHealthList`, `pendingActionsList`, the chart/table body IDs, role labels, and publishing and analytics IDs. These hooks must remain unique and in the document so script lookups and role-driven content continue to work when report panels are collapsed.

The current dashboard loader reads APSG rows from `public.members`, attempts to read CWDI rows from `public.cwdi_members`, and combines both lists before calculating membership metrics and rendering member views. Dashboard member exports use the same combined in-memory collection. This behavior crosses the organization boundary and must be removed from the APSG command center.

## Membership Data Contract

- Fetch APSG dashboard member rows from `public.members` only. Do not query `public.cwdi_members` from the APSG dashboard.
- Derive APSG membership counts, date trends, completeness, pending data gaps, latest members, recent member activity, incomplete-record rows, geography summaries, and state/LGA rankings from the same APSG-only collection.
- Keep account, all-member, missing-document, and incomplete-record exports on the APSG dashboard scoped to that same APSG-only collection.
- Keep the existing content publishing and public-site analytics modules as site-level reports. They do not contribute to APSG membership totals or member lists.
- Retain the current page-level IDs and role hooks unless the presentation design explicitly removes a hook after confirming it is not read by the script.

The APSG page distinguishes initial loading, successful empty results, successful data, and failed or incomplete loads. It presents loading status while the member query is pending, the no-registration state only after a successful query returns no rows, and a visible error with a retry action when the query fails. A later page failure must not render metrics from a partial set of fetched pages. On refresh failure after a previous successful load, the last successful view may remain visible only with a clear stale-data state; dashboard member exports stay unavailable until a fresh load succeeds. A successful load updates the data-freshness label.

All membership figures describe rows returned by `public.members` under the current session's Supabase row-level-security policy. “Total Members” therefore means all rows visible to that session; it does not claim to be a global registry count if the current role's policy returns a subset.

The current Data Quality formula is the rounded, equal-weight average of six rounded coverage rates: PVC, APC card, bank account, phone, email, and complete state/LGA/ward. A PVC or APC upload counts as coverage even when its corresponding card number is blank. A location is complete only when all three location fields have a nonblank trimmed value. Each rate is the rounded percentage of visible member rows with the field/category present; an empty registry yields 0%.

The Open Data Gaps KPI is the sum of missing PVC, missing APC card, missing account, missing phone, incomplete state/LGA/ward tuple, and duplicate-phone records. It does not include missing name or email. Duplicate-phone records count every member in an exact trimmed phone-value group with more than one row; blank phone values are excluded. One member may contribute multiple gaps, so the total can exceed the member total. Its label and supporting text identify it as a count of gaps. The action center continues to show category counts and links used to resolve those gaps.

Registration periods use the browser's local timezone and half-open calendar intervals. “Last 7 Days” covers `[local midnight six days ago, local midnight tomorrow)`; today is `[local midnight today, local midnight tomorrow)`; current month is `[local midnight on the first, local midnight tomorrow)`. Growth compares the seven-day count with the preceding seven-day interval. Invalid and future timestamps are excluded from period counts. When the preceding period is zero, growth is 100% if the current period is nonzero and otherwise 0%.

## Proposed Structure

1. **Compact dashboard header**
   - Keep the APSG Command Center title and a short membership-focused explanation.
   - Keep the Members link immediately available.
   - Move lower-frequency actions (account details, account export, CSV export, missing-doc export) into a compact native disclosure labeled “Actions.” Preserve their current destinations and handlers; export handlers must not emit partial or stale member rows.
   - Remove the six redundant mini tiles from the header; their underlying details remain represented by focused indicators or reports.

2. **Four primary indicators**
   - Visible APSG Members (`totalMembers`), with the current session/RLS scope disclosed in supporting text.
   - Registrations in the last seven days (`weekRegistrations`).
   - Data Quality (`dataQualityRate`) using the formula defined above.
   - Open Data Gaps (`pendingActionsCount`) using the categories defined above.
   - Keep each live ID exactly once. Remove duplicate visual instances of these measures rather than duplicate IDs.

3. **Membership work area**
   - Place Data Health Overview (`dataHealthList`) and Pending Action Center (`pendingActionsList`) directly after the indicators. Show the aggregate data-gap count only in its primary indicator; keep individual follow-up items, category counts, and links in the action center.
   - Show the existing Recent Registrations seven-day chart as the one visible trend.
   - Show Latest Members (`latestMembersTable`) beside or immediately after the trend. Preserve the Members destination.
   - Keep the existing no-registration empty state (`noDataMessage`) and add distinct loading, stale-data, and failed-load states with an actionable retry.

4. **More reports disclosure**
   - Place the secondary dashboard panels inside one native `<details>` element, closed initially at desktop and mobile widths, with a visible, keyboard-operable “More reports” summary.
   - Include current-month and today counts, growth, top-state summary, field coverage, active-state and bank-account summaries, state distribution chart, publishing shortcuts and counts, public-site links, website intelligence and top-page table, recent activity, incomplete-record table and export, top states, and top LGAs. The latest-members preview shows at most 8 rows; the incomplete-record preview shows at most 10, while its export includes all matching rows.
   - Keep Last Record, Updated status, document coverage, and account coverage available in the reports area after removing the six header mini tiles. Keep `weekMiniLabel` and `pendingMiniLabel` as nonvisual, screen-reader-hidden script targets so the existing dashboard script continues to run without showing duplicate values.
   - Keep Recent Activity focused on member-record events; remove its duplicate Data Quality and aggregate Pending Actions summary rows.
   - Group report content under clear headings without removing or renaming any existing data hook or action handler.
   - Opening or closing the disclosure only affects presentation; data rendering continues to target the same document elements.

## Layout and Interaction Details

- Use a single page and native disclosure markup rather than custom tab state. This supports keyboard use and avoids adding another JavaScript interaction layer.
- Keep existing style classes on reused cards/tables where practical. Introduce dashboard-specific classes only for the compact header, action disclosure, four-card grid, work area, and report disclosure.
- At narrow widths, stack the four indicators, health/actions, trend, and members list in a single column. Use existing table overflow containers for wide tables and prevent horizontal page overflow.
- Keep primary navigation, sidebar role labels, theme control, user identity, logout, and top-level member navigation outside the report disclosure.
- Remove dashboard-local styles that override the shared sidebar's width, navigation spacing, role chips, session card, or content offset. Keep the shared shell files unchanged.
- Preserve role-based hiding/visibility, existing export click handlers, and public/admin destinations.
- Start the APSG member load independently of publishing and website-analytics modules. A slow or unresolved site-report request must not delay membership indicators; each site-report module retains its own loading, success, empty, or unavailable state.
- Omit the dashboard Print action and retain the existing browser-print rules that expose closed More reports content and hide interactive controls. Do not add a new print-only layout.
- Do not add data, simulate metrics, or substitute static values for script-populated values.

## Decisions and Alternatives

| Decision | Proposed choice | Alternative | Rationale |
|---|---|---|---|
| Primary indicators | Visible APSG Members, Last 7 Days, Data Quality, Open Data Gaps | Promote Today, Month, Growth, or geography instead | The selected four align to the current session's APSG registry scope, near-term activity, record health, and a next action. |
| Secondary content | One closed-by-default “More reports” disclosure | Multiple tabs or a permanently long page | A single native disclosure reduces initial density and retains access to all current reports. |
| Action placement | Keep Members prominent; group account and member-export actions under Actions | Leave all toolbar buttons across the header | This shortens the most prominent header while preserving the existing account and data-export paths. |
| Gap count display | Label the aggregate as Open Data Gaps; show only category counts and links in the action center | Present the aggregate as a count of affected members | A member may contribute multiple gaps, so the total can exceed the member count. |
| Dashboard print action | Omit the Print button while retaining existing browser-print rules | Keep a Print button or remove all print support | Users retain browser printing without a separate dashboard print workflow or a change to existing output. |
| APSG registry boundary | Read `public.members` only for APSG membership views and dashboard exports | Continue merging APSG and CWDI registries | Each organization's metrics and exports must describe the APSG registry alone. |
| Query status | Distinguish loading, successful empty results, successful data, and failed or incomplete fetches | Use zero values and one generic empty state | Clear status prevents a missing or failed query from appearing to be a valid empty registry. |
| Session-visible totals | Define totals as rows returned under the current user's RLS policy and disclose that scope | Imply each role sees the full global registry | The browser can count only rows its current policy permits it to read. |
| Refresh failure | Keep the last successful view marked stale and disable member exports until a fresh successful load | Clear all values, or leave stale values looking current | Preserves useful context without allowing an old snapshot to be mistaken for fresh export data. |
| Report-module sequencing | Load APSG members independently; site-report modules resolve and render independently | Await every site-report request before starting member loading | A slow or stuck report module must not block APSG membership metrics. |
| Period definitions | Use local calendar-day boundaries for seven-day and month calculations and document growth behavior when the prior period is zero | Use rolling 168-hour windows or an unspecified timezone | Makes the same visible records produce understandable, repeatable date metrics. |
| Preview and export scope | Label latest-members (8) and incomplete-record (10) tables as previews; incomplete export includes all matching rows | Let preview row limits appear to cap the report | Makes visible sample size distinct from the full export result. |
| Existing export visibility | Preserve the current dashboard role and RLS behavior in this presentation change; use only successfully loaded APSG rows | Add an admin-only export policy in this LLD | A role/access redesign is outside the approved dashboard presentation and registry-boundary scope. |
| Pending count meaning | Label the sum of missing-field and duplicate-phone counts as data gaps | Present the sum as a count of affected members | A record may have several gaps, so the number measures issues and can exceed the member count. |
| Existing presentation hooks | Preserve IDs, role behavior, and handlers needed by the redesigned dashboard | Rename or remove hooks during the layout change | The page script and authorized role behavior continue to work while presentation changes. |

## LLD Edge-Case Probe (“What happens when…?”)

| Probe | Proposed handling / open point |
|---|---|
| CWDI rows are added, changed, or removed while the APSG dashboard is open | APSG totals, trends, rankings, lists, and exports remain unchanged because the page reads `public.members` only. |
| A member's role or RLS policy exposes only a subset of `public.members` | Metrics and exports describe only rows returned to that session; supporting text identifies the values as session-visible APSG records. |
| The APSG registry query succeeds with zero rows | Show the no-registration state and zero summary values as a successful empty result. |
| The APSG registry query fails or one page of a paginated query fails | Show an error and retry action; discard partial rows and do not report partial totals as complete. A successful retry clears the error and updates freshness. |
| A refresh fails after a previous successful load | Keep the previous values visibly marked stale, disable exports until a fresh load succeeds, and offer retry. |
| Rows are inserted or deleted while offset pages are being fetched | Keep the current offset pagination for this scope. Treat each load as a best-effort read rather than a transactionally consistent snapshot; disclose this limitation, and defer snapshot/cursor consistency guarantees to a data-access design. |
| A page response overlaps rows or returns fewer unique IDs than the initial exact count | Reject the load as incomplete instead of calculating totals from a likely shifted offset result; offer retry. Equal counts still do not establish a transactional snapshot. |
| Publishing or website analytics is slow, hangs, or fails while members are available | Start membership loading without waiting for site modules. Show a separate loading or unavailable state for each site module; its pending promise cannot block membership results. |
| A member has multiple missing fields or belongs to a duplicate-phone group | Count each outstanding data gap according to its category, label the aggregate as gaps, and keep category links available. |
| A user activates a dashboard export before the first successful load or after a failed refresh | Do not export partial or stale rows; report that fresh dashboard data is unavailable. After a successful empty load, report that there are no matching rows. |
| Dashboard data arrives after the report disclosure is closed | The elements stay in the DOM and retain their IDs; current script updates can proceed. Verify against the exact production JavaScript before implementation. |
| A user prints the dashboard while “More reports” is closed | Keep the current print rules: include report data and tables, hide interactive controls, and retain the existing card presentation. The dashboard has no dedicated Print button. |
| A publishing or website-analytics module has no data | Show a module-specific empty state while leaving the successful APSG membership view available. |
| The viewport changes while “More reports” is open | Preserve the native disclosure state; only responsive layout changes. |
| A viewer/editor role opens “More reports” or activates an export | Preserve currently available dashboard controls and current RLS behavior; all displayed/exported member rows come from the current session's authorized query. Review export authorization separately if the access policy is to change. |
| A table is wider than the phone viewport | Keep the current table-scroll wrappers and ensure page-level width stays within the viewport. |
| A repeated metric currently uses multiple DOM targets | Retain only the existing target actually read by script; verify every removed duplicate is not queried by ID/class before implementation. |
| Data quality is calculated for a visible row set | Use the six-category equal-weight formula and presence rules in this design; return 0% when the visible row set is empty. |
| A phone value appears more than once after trimming | Count all rows in each duplicate group; do not normalize punctuation or country codes in this presentation-only segment. |
| The latest-members and incomplete-record previews are shorter than the matching data set | Label them as previews of at most 8 and 10 rows respectively; keep incomplete-record export untruncated. |
| A registration timestamp is invalid, future-dated, or falls near a local date boundary | Calculate date buckets in the browser's local timezone using the half-open intervals above; exclude invalid and future values from completed-period counts and show this timezone in the dashboard's metric help text. |

## Open Questions & Future Decisions

### Deferred

1. Database-side aggregate queries could reduce the number of full member rows sent to the browser, but that would require a separate data-access design and may involve database changes outside this component's current scope.
2. The dashboard script caches target elements at page load; implementation must retain each target it still reads.
3. Transactional snapshot consistency for a registry changing during pagination requires a separate data-access decision; this LLD keeps offset pagination and treats each successful load as a best-effort read.
4. Changing which roles can use dashboard exports requires a separate authorization review. This LLD preserves current role and row-level-security behavior.

## References

- High-level design: `docs/high-level-design.md`
- Dashboard requirements: `docs/intent/dashboard/dashboard-specs.md`
- Shared navigation runtime: `assets/js/admin-unified.js` and `assets/css/admin-unified.css`
- Runtime dashboard page: `/admin/dashboard.html`
- Dashboard data and export handlers: `assets/js/dashboard.js`
