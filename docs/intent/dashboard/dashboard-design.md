---
parent: high-level-design
prefix: DASH
---

# Low-Level Design: Focused APSG Dashboard

## Scope

Reorganize `/admin/dashboard.html` for a focused membership command center. This design is limited to the dashboard's markup and page-specific presentation. It does not change Supabase queries or schema, authentication, role checks, dashboard calculations, member data, other pages, or the deployed Netlify site.

## Current Structure

The page currently presents the command header and six mini tiles, publishing controls, three consecutive metric grids, two charts, data health and pending actions, publishing status, website analytics, recent activity and latest members, then incomplete records and geographic rankings. Most of this content is visible at once. Similar signals such as weekly registrations, data completeness, coverage, and pending work appear in more than one place.

The live page's data script targets existing IDs including `totalMembers`, `weekRegistrations`, `dataQualityRate`, `pendingActionsCount`, `dataHealthList`, `pendingActionsList`, the chart/table body IDs, role labels, and publishing and analytics IDs. These hooks must remain unique and in the document so script lookups and role-driven content continue to work when report panels are collapsed.

## Proposed Structure

1. **Compact dashboard header**
   - Keep the APSG Command Center title and a short membership-focused explanation.
   - Keep the Members link immediately available.
   - Move lower-frequency actions (account details, account export, CSV export, missing-doc export, print) into a compact native disclosure labeled “Actions.” Preserve their current destinations and handlers.
   - Remove the six redundant mini tiles from the header; their underlying details remain represented by focused indicators or reports.

2. **Four primary indicators**
   - Total Members (`totalMembers`).
   - Registrations in the last seven days (`weekRegistrations`).
   - Data Quality (`dataQualityRate`).
   - Pending Actions (`pendingActionsCount`).
   - Keep each live ID exactly once. Remove duplicate visual instances of these measures rather than duplicate IDs.

3. **Membership work area**
   - Place Data Health Overview (`dataHealthList`) and Pending Action Center (`pendingActionsList`) directly after the indicators. Show the aggregate pending count only in its primary indicator; keep individual follow-up items, category counts, and links in the action center.
   - Show the existing Recent Registrations seven-day chart as the one visible trend.
   - Show Latest Members (`latestMembersTable`) beside or immediately after the trend. Preserve the Members destination.
   - Keep the existing no-registration empty state (`noDataMessage`).

4. **More reports disclosure**
   - Place the secondary dashboard panels inside one native `<details>` element, closed initially at desktop and mobile widths, with a visible, keyboard-operable “More reports” summary.
   - Include current-month and today counts, growth, top-state summary, field coverage, active-state and bank-account summaries, state distribution chart, publishing shortcuts and counts, public-site links, website intelligence and top-page table, recent activity, incomplete-record table and export, top states, and top LGAs.
   - Keep Last Record, Updated status, document coverage, and account coverage available in the reports area after removing the six header mini tiles. Keep `weekMiniLabel` and `pendingMiniLabel` as nonvisual, screen-reader-hidden script targets so the existing dashboard script continues to run without showing duplicate values.
   - Keep Recent Activity focused on member-record events; remove its duplicate Data Quality and aggregate Pending Actions summary rows.
   - Group report content under clear headings without removing or renaming any existing data hook or action handler.
   - Opening or closing the disclosure only affects presentation; data rendering continues to target the same document elements.

## Layout and Interaction Details

- Use a single page and native disclosure markup rather than custom tab state. This supports keyboard use and avoids adding another JavaScript interaction layer.
- Keep existing style classes on reused cards/tables where practical. Introduce dashboard-specific classes only for the compact header, action disclosure, four-card grid, work area, and report disclosure.
- At narrow widths, stack the four indicators, health/actions, trend, and members list in a single column. Use existing table overflow containers for wide tables and prevent horizontal page overflow.
- Keep primary navigation, sidebar role labels, theme control, user identity, logout, and top-level member navigation outside the report disclosure.
- Preserve role-based hiding/visibility, existing export/print click handlers, and public/admin destinations.
- For printing, include More reports data and tables even when the on-screen `<details>` disclosure is closed, while hiding interactive buttons and shortcuts. Update existing `no-print` wrappers so they hide controls rather than hiding the report data itself.
- Do not add data, simulate metrics, or substitute static values for script-populated values.

## Decisions and Alternatives

| Decision | Proposed choice | Alternative | Rationale |
|---|---|---|---|
| Primary indicators | Total Members, Last 7 Days, Data Quality, Pending Actions | Promote Today, Month, Growth, or geography instead | The selected four align to membership scale, near-term activity, record health, and a next action. |
| Secondary content | One closed-by-default “More reports” disclosure | Multiple tabs or a permanently long page | A single native disclosure reduces initial density and retains access to all current reports. |
| Action placement | Keep Members prominent; group less frequent exports and account/print links under Actions | Leave all toolbar buttons across the header | This shortens the most prominent header while preserving functionality. |
| Pending action display | Show the aggregate total in the primary indicator; show only item-level counts and links in the action center | Repeat the aggregate in activity and action summaries | The total remains easy to scan without presenting the same number in multiple places. |
| Print behavior | Print report data and tables even when More reports is closed, and suppress interactive controls | Print the collapsed overview only | Printed reports stay useful while on-screen actions remain out of the paper copy. |
| Data integration | Preserve current IDs, scripts, calculations, role behavior, and handlers | Rewrite dashboard logic | The requested change is visual and structural; retaining existing behavior narrows operational risk. |

## LLD Edge-Case Probe (“What happens when…?”)

| Probe | Proposed handling / open point |
|---|---|
| Dashboard data arrives after the report disclosure is closed | The elements stay in the DOM and retain their IDs; current script updates can proceed. Verify against the exact production JavaScript before implementation. |
| A dashboard metric or report has no data | Keep the existing script-provided empty/loading behavior; do not invent values. Confirm after downloading the exact script. |
| The user prints while “More reports” is closed | Include report contents in print output even while the on-screen disclosure is closed; verify and update the print styles. |
| The viewport changes while “More reports” is open | Preserve the native disclosure state; only responsive layout changes. |
| A read-only role or editor role opens “More reports” | Existing role controls and server/query permissions remain authoritative; restructuring must not add privileged controls or bypass them. |
| A table is wider than the phone viewport | Keep the current table-scroll wrappers and ensure page-level width stays within the viewport. |
| A repeated metric currently uses multiple DOM targets | Retain only the existing target actually read by script; verify every removed duplicate is not queried by ID/class before implementation. |

## Deferred Verification Questions

The dashboard script caches its target elements at page load, so all targets needed by the existing logic must remain present. It currently renders the aggregate Pending Actions count again as a Recent Activity system row; the redesigned activity list will omit duplicate aggregate summaries. The stylesheet currently suppresses several entire dashboard sections with `.no-print`; implementation must limit that class to interactive controls when those report sections move under More reports. Preserve role-related visibility and existing loading/error behavior while making these presentation changes.
