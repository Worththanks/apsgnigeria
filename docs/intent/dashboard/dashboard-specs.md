---
parent: dashboard-design
prefix: DASH
---

# APSG Dashboard Requirements

## Command Center

- [ ] **DASH-UI-001**: On the APSG admin dashboard, the page shall show the Command Center title and keep the Members destination immediately available.
- [ ] **DASH-UI-002**: On the APSG admin dashboard, the page shall group account details, account export, CSV export, missing-document export, and print actions in a compact, keyboard-operable native “Actions” disclosure while preserving their existing destinations and handlers.
- [ ] **DASH-UI-003**: On the APSG admin dashboard, the primary metric area shall contain exactly four indicators: Total Members, registrations in the last seven days, Data Quality, and Pending Actions, using the existing script-populated values.
- [ ] **DASH-UI-004**: On the APSG admin dashboard, the Data Health Overview and Pending Action Center shall appear after the four primary indicators and before secondary reports; the Pending Action Center shall show individual follow-up items, category counts, and links without repeating the aggregate count shown by the Pending Actions indicator.
- [ ] **DASH-UI-005**: On the APSG admin dashboard, the seven-day Recent Registrations trend shall be the only membership trend visible in the primary view, and the Registrations by State chart shall be available only in the More reports disclosure.
- [ ] **DASH-UI-006**: On the APSG admin dashboard, the Latest Members list shall be visible in the primary view and retain its existing Members destination.

## Progressive Disclosure and Reports

- [ ] **DASH-UI-007**: On the APSG admin dashboard, More reports shall use a native disclosure that is closed initially on desktop and mobile.
- [ ] **DASH-UI-008**: While the APSG admin dashboard's More reports disclosure is closed, all existing report elements shall remain in the document with their existing unique IDs so the current dashboard script can populate them.
- [ ] **DASH-UI-009**: When an administrator or staff user opens the APSG admin dashboard's More reports disclosure, the page shall expose Last Record and Updated status, current-day and current-month counts, growth, geographic and field-coverage summaries, account and publishing summaries and shortcuts, public-site links, website analytics and the top-page table, recent activity, incomplete-record reporting and export, state rankings, and top-LGA reporting.
- [ ] **DASH-UI-010**: When a user prints the APSG admin dashboard, the print output shall include More reports data and tables even when the disclosure is closed on screen, while excluding interactive buttons and shortcuts.
- [ ] **DASH-UI-011**: When the APSG admin dashboard has no member records, the page shall display its existing no-registration empty state.

## Access and Responsive Layout

- [ ] **DASH-UI-012**: On the APSG admin dashboard, the existing role-based visibility, sidebar navigation, theme control, identity controls, export handlers, administrative destinations, and public-site destinations shall remain in effect after the layout change.
- [ ] **DASH-UI-013**: At narrow viewport widths on the APSG admin dashboard, the four indicators and primary work panels shall stack in one column, wide tables shall remain horizontally scrollable within their table containers, and the page shall not require horizontal scrolling.
- [ ] **DASH-UI-014**: When a user resizes the APSG admin dashboard viewport while the More reports disclosure is open, the native disclosure shall retain its open state while the content reflows to fit the viewport.
- [ ] **DASH-UI-015**: On the APSG admin dashboard, the six current header mini tiles shall not remain as a second summary row; their Last Record and Updated details shall remain in More reports, while their other measures are represented by primary indicators or secondary reports.
- [ ] **DASH-UI-016**: On the APSG admin dashboard, Recent Activity shall list member-record events without repeating the Data Quality or aggregate Pending Actions values shown elsewhere on the dashboard.
