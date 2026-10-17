---
parent: admin-sidebar-design
prefix: ADMIN-NAV
---

# APSG Admin Sidebar Requirements

## Navigation

- [ ] **ADMIN-NAV-UI-001**: On an APSG admin page that loads `admin-unified.js`, the sidebar shall show Dashboard and Members as direct links and place the other existing admin destinations in the Member Operations, Get Involved, Publishing Desk, Settings & Access, and Public Site disclosure groups.
- [ ] **ADMIN-NAV-UI-002**: On an APSG admin page that loads `admin-unified.js`, the sidebar shall show each exact destination once, preserve every distinct path and hash destination, and preserve the existing new-tab behavior for Public Site links.
- [ ] **ADMIN-NAV-UI-003**: On an APSG admin page that loads `admin-unified.js`, the Get Involved section shortcuts shall appear in a nested native disclosure within the Get Involved group.
- [ ] **ADMIN-NAV-UI-004**: On an APSG admin page that loads `admin-unified.js`, each navigation disclosure shall use native `<details>` and `<summary>` elements that support keyboard operation and expose their expanded state to assistive technology.
- [ ] **ADMIN-NAV-UI-005**: When an APSG admin page that loads `admin-unified.js` opens at a configured destination, the shell shall open the containing group, open the nested Get Involved shortcuts for a matching section hash, and set `aria-current="page"` only on the exact path-and-hash link; a base-page link shall be current only when the URL has no hash.
- [ ] **ADMIN-NAV-UI-006**: When `hashchange` or `popstate` changes the URL on an APSG admin page that loads `admin-unified.js`, the shell shall recalculate the exact current link and disclosure state and run the existing `hashRoute()` behavior so the Get Involved content tab matches its URL hash.
- [ ] **ADMIN-NAV-UI-007**: When no configured destination matches the URL on an APSG admin page that loads `admin-unified.js`, the shell shall leave secondary navigation groups closed and shall not mark an unrelated destination as current.
- [ ] **ADMIN-NAV-UI-008**: When an administrator navigates to another page through a sidebar link, the destination page shall derive its open group from its current route without restoring a previously opened group from stored state.

## Roles and Session

- [ ] **ADMIN-NAV-UI-009**: On an APSG admin page that loads `admin-unified.js`, each sidebar link shall retain its existing `data-access` value and page-specific authorization behavior, including visible locked links on pages using `admin-auth.js` and hidden disallowed links on the dashboard.
- [ ] **ADMIN-NAV-UI-010**: On an APSG admin page that loads `admin-unified.js`, a role chip shall appear only on a link that is locked for the current role, and the chip shall retain that link's required role label.
- [ ] **ADMIN-NAV-UI-011**: On initialization and when authorization or a page role filter changes link visibility on an APSG admin page that loads `admin-unified.js`, the shell shall hide a disclosure group only if every destination link in that group is hidden; a visible link marked locked or `aria-disabled` shall keep the group visible.
- [ ] **ADMIN-NAV-UI-012**: On an APSG admin page that loads `admin-unified.js`, the shared sidebar shall display one identity, role, and logout area and retain the `adminRoleLabel`, `adminEmailLabel`, and `data-role-level` hooks used by existing page scripts.

## Mobile Drawer and Fallback Navigation

- [ ] **ADMIN-NAV-UI-013**: On an APSG admin page that loads `admin-unified.js` at 767px viewport width or below, the closed sidebar shall be visually hidden, inert, and have `aria-hidden="true"` even when reduced motion is enabled; its actual opener shall identify the sidebar with `aria-controls` and report `aria-expanded="false"`.
- [ ] **ADMIN-NAV-UI-014**: When an APSG admin user opens the mobile sidebar, the shell shall expose the sidebar to keyboard and assistive-technology navigation, set the actual opener's `aria-expanded` to `true`, and move focus to the first usable navigation control.
- [ ] **ADMIN-NAV-UI-015**: When an APSG admin user closes the mobile sidebar with Escape or the overlay, the shell shall hide and inert the sidebar, set the actual opener's `aria-expanded` to `false`, and return focus to that opener when it remains available.
- [ ] **ADMIN-NAV-UI-016**: When an APSG admin page viewport changes from 767px or below to a width above 767px, the shell shall clear mobile drawer and overlay state, expose the visible sidebar to assistive technology, and hide the mobile opener.
- [ ] **ADMIN-NAV-UI-017**: On an APSG admin page that loads `admin-unified.js`, the shell shall reuse an existing mobile sidebar opener and overlay where present, create a fallback only for a missing control, and own each opener click once even when the page has a legacy inline toggle handler; the page shall not display duplicate sidebar openers or overlays.
- [ ] **ADMIN-NAV-UI-018**: On an APSG admin page without a sidebar, except `/admin/login.html`, the fallback quicknav shall expose its panel through a toggle with `aria-controls` and synchronized `aria-expanded` state, move focus into the panel when opened, close on Escape, outside dismissal, or destination activation, and return focus to its toggle when available.

## Dashboard Compatibility

- [ ] **ADMIN-NAV-UI-019**: On `/admin/dashboard.html`, the shared sidebar change shall preserve the existing role-based visibility, administrative and public-site destinations, header, theme and identity controls, report content, data queries, and page-level actions.
- [ ] **ADMIN-NAV-UI-020**: On `/admin/login.html`, the shared admin shell shall not display fallback quicknav before authentication.

## Visual Design

- [ ] **ADMIN-NAV-UI-021**: On APSG admin pages that load `admin-unified.js`, the sidebar shall use a consistent APSG visual hierarchy with a brand masthead, a distinct primary-navigation area, grouped secondary destinations, and one signed-in session panel, using the existing evergreen and gold identity colors with clear readable text.
- [ ] **ADMIN-NAV-UI-022**: On APSG admin pages that load `admin-unified.js`, the exact current destination shall have a persistent visual marker and surface treatment beyond color alone, and keyboard focus shall remain clearly visible on links and disclosure summaries.
- [ ] **ADMIN-NAV-UI-023**: At desktop and mobile widths, sidebar labels and controls shall remain readable and operable without clipping; visual transitions shall respect reduced-motion preferences.
