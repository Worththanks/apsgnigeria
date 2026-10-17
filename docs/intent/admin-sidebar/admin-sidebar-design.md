---
parent: high-level-design
prefix: ADMIN-NAV
---

# APSG Admin Sidebar

## Context and Design Philosophy

Admin pages use the shared shell in `assets/js/admin-unified.js` and `assets/css/admin-unified.css`. The shell provides role-aware navigation and a mobile drawer. Navigation should remain predictable across admin pages while exposing a short set of primary destinations and keeping secondary routes available on demand.

## Scope and Current Behavior

This component covers the shared sidebar and its fallback navigation panel on the admin pages that load `admin-unified.js`, except that `/admin/login.html` does not show fallback navigation before authentication. It does not change page-specific content, authentication, role policy, data queries, or route handlers. The static `admin/dashboard-preview.html` is a noninteractive visual artifact and is outside this component.

The current script replaces each page's navigation with five flat groups. All destinations appear at once, every link carries a role chip, and the publishing list contains two labels for the same `/admin/admin-blog.html` destination. The generated navigation also appends a signed-in card and logout control while some pages retain their own role card and logout control. On mobile, the script adds a floating menu button even when a page already has a sidebar toggle, and adds an overlay while legacy overlays may also exist.

Authorization presentation varies by page. `admin-auth.js` marks unavailable links disabled and locked; the dashboard's role check hides unavailable links. The sidebar must preserve each page's existing `data-access` values and authorization behavior.

## Navigation Structure

- Keep Dashboard and Members as direct links at the top. Existing role access remains attached to each link.
- Place secondary destinations in native `<details>` groups named Member Operations, Get Involved, Publishing Desk, Settings & Access, and Public Site.
- Put the Get Involved page-section shortcuts in a nested disclosure so the engagement group does not expand into a long list of in-page links.
- Keep public destinations in the Public Site group and retain their existing new-tab behavior.
- Represent an exact destination only once. Keep distinct paths and hash routes available, including the Get Involved section shortcuts.
- Keep the current user's identity, role, and logout control in one shared session area.
- Show a role chip only when a link is locked for the current role. Retain the required role label on locked links.

On initial page load, open the group that contains the exact current path and hash. A base page link is active only when the URL has no hash; a section shortcut is active only when its hash matches. If no configured destination matches the current route, leave all secondary groups closed. Native disclosure state is local to the page and is not persisted across navigation.

A group is hidden only when every destination inside it is hidden by the page's existing role filter. Locked-but-visible links continue to appear in their group. A page's direct links remain governed by the same role filter.

## Visual Direction

Use a premium, restrained APSG identity across admin pages: a deep evergreen rail with a subtle tonal gradient, a compact brand masthead, warm gold as a sparing accent, and a clear split between primary destinations, grouped navigation, and the signed-in session. Keep the visual weight calm and legible rather than decorative. Give the active route a persistent left marker and surface treatment so selection is clear beyond color alone. Use visible keyboard focus, generous link targets, readable labels, and reduced-motion-safe state changes. On narrow screens, the same visual system should carry into the drawer without obscuring its close and focus behavior.

## Shell State and Accessibility

Native disclosure summaries provide keyboard-operable expand/collapse behavior and expose their state to assistive technology. Each generated navigation link keeps its existing URL, role metadata, and external-link attributes. The current destination receives `aria-current="page"`.

At the mobile breakpoint (767px and below), the closed drawer is visually hidden and removed from keyboard and assistive-technology navigation (`inert` and `aria-hidden="true"`), including when reduced motion is enabled. Its opener identifies the sidebar with `aria-controls` and reports `aria-expanded`. Opening makes the sidebar available, updates the opener state, and moves focus to its first usable navigation control. Escape and the overlay close the drawer; focus returns to the opener if it is still available. When the viewport returns to desktop width, clear the drawer and overlay state, expose the visible sidebar to assistive technology, and hide the mobile opener. The visible desktop sidebar must never retain `aria-hidden="true"` or `inert`.

Reuse a page's existing mobile trigger and overlay when present; create a shared fallback only when one is absent. The shared shell owns each trigger click once, including pages with legacy inline `toggleSidebar()` handlers, and synchronizes state on the actual trigger. Keep its `aria-controls` target stable. Opening or closing a navigation group does not open or close the mobile drawer.

Admin pages without a sidebar use the existing fallback quicknav, except `/admin/login.html`, which has no admin navigation before authentication. Its toggle exposes `aria-controls` and `aria-expanded`; opening shows the panel and moves focus into it, while Escape, outside dismissal, or following a destination closes it and returns focus to the toggle when it remains available. The fallback is created only when no sidebar exists; it must not appear alongside the drawer.

Route state is recalculated on initial load, `hashchange`, and browser `popstate`. A route with an exact current path and hash opens its parent group; Get Involved hash links also open the nested shortcut disclosure. Only the exact path-and-hash link receives `aria-current="page"`. A base-page link is current only when the URL has no hash. Run the existing `hashRoute()` tab-jump behavior after hash/history changes so the content tab and sidebar remain aligned.

Apply disclosure visibility after existing page role filters run, and recalculate it when authorization arrives or a child link's `hidden` state changes. Hide a group only when all destination links in that group are actually hidden. A visible link marked `aria-disabled` or `.locked-by-role` still counts as visible and remains available for the existing page's lock presentation. Keep each link's current `data-access` metadata and preserve the distinct behavior where `admin-auth.js` shows locked links while the dashboard role check hides disallowed links.

The shared session area is the single source of sidebar identity and logout controls. Legacy sidebar role cards and logout controls are removed after the shared shell is mounted, while the `adminRoleLabel`, `adminEmailLabel`, and `data-role-level` hooks used by existing page scripts remain available in the sidebar.

The code change is limited to `assets/js/admin-unified.js` and `assets/css/admin-unified.css`. Preserve dashboard page content, report data and actions, header/theme behavior, session hooks, role values, member navigation, and all existing page-level dashboard behavior; preserve existing admin destinations and page-specific authorization. Keep the shell's current public-link new-tab behavior and do not change page handlers or data access.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Navigation density | Keep Dashboard and Members direct; use native collapsible groups for secondary destinations | Keep all links expanded; replace labels with an icon-only rail | [inferred] Native groups reduce the initial list while preserving visible labels, keyboard operation, and familiar routes. |
| Initial group state | Open the group containing the exact current route; otherwise leave secondary groups closed | Always open one default group; persist the user's last-open group | [inferred] Current-route context helps locate the current work area without making unrelated groups compete for space. |
| In-page shortcuts | Nest Get Involved section links under a second native disclosure | Show every section shortcut whenever Get Involved is open | [inferred] The nested disclosure preserves direct section destinations while avoiding another long list. |
| Role labels | Show role chips only on locked links and preserve the required role there | Repeat each link's minimum role on every row; remove all role labels | [inferred] Authorized rows do not need repeated badges; locked rows retain a visible explanation of their access requirement. |
| Duplicate routes | Keep one News & Updates link for the shared blog destination | Show both News & Updates and Blog Manager labels | [inferred] One link removes duplicate navigation while preserving the same destination and access roles. |
| Sidebar identity | Keep one shared identity and logout area; remove duplicate page-level sidebar controls | Keep both the shared and page-specific controls | [inferred] A single session area avoids repeated role, identity, and logout controls across pages. |
| Mobile controls | Reuse an existing page trigger and overlay, adding a fallback only when missing | Add a second shared trigger and overlay to every page | [inferred] Reuse avoids duplicate controls and preserves the current page's drawer integration. |
| Drawer accessibility | Keep closed mobile navigation visually hidden, inert, and hidden from assistive technology, including under reduced motion; synchronize one shared click path and the actual trigger's state | Keep legacy inline and shared handlers active together | [inferred] A single click path prevents duplicate toggles, while visual and semantic state must agree for every motion preference. |
| Route updates | Recompute exact route, disclosures, and the Get Involved tab on load, hash changes, and browser history navigation | Update sidebar only after history navigation | [inferred] The active content and navigation destination should remain aligned when users move through hash history. |
| Fallback navigation | Keep quicknav on admin utility pages without a sidebar, except the unauthenticated login page | Render quicknav on every admin page without a sidebar | [inferred] Sign-in should not display destinations before authentication; admin utilities retain a compact navigation fallback. |

Rationales marked as inferred describe existing shell behavior that informed the design.

## LLD Edge-Case Probe

| What happens when…? | Proposed handling | Decision to confirm or defer |
|---|---|---|
| A user's role filter hides every link in a secondary group? | Re-evaluate on load, authorization, and child-link `hidden` changes. Hide only when every destination link is hidden; a locked or `aria-disabled` but visible link keeps its group visible. | Resolved: preserve the dashboard's hidden-link policy and the other pages' visible locked-link policy. |
| The current URL contains a Get Involved hash route, or the user uses back/forward? | Recompute route state and run `hashRoute()` on load, `hashchange`, and `popstate`; open its group and nested shortcuts; mark only the exact hash link current and select the matching content tab. | Resolved: keep the sidebar and content tab synchronized across browser history. |
| Two labels currently use the same path? | Keep one canonical News & Updates link and preserve every distinct path and hash route. | Resolved: keep one label per exact destination. |
| A page already contains a role card, logout button, mobile trigger, or overlay? | Keep one shared session/logout area and reuse the existing trigger and overlay; update the real trigger's state and controls attributes. The shared handler owns the click once even when a legacy inline toggle exists. Create a fallback only when missing and retain role/email hooks. | Resolved: use one shared click handler to prevent a double toggle. |
| A page has no configured navigation destination? | Leave secondary groups closed; Dashboard and any role-permitted direct link remain visible. | Resolved: preserve the current destination set and do not add routes as part of the layout change. |
| A user manually opens a different group and then follows a link? | On the next page load, open the group matching the new route; do not persist the prior disclosure state. | Resolved: derive group state from the route on each page load. |
| The mobile drawer is closed, then opened or resized to desktop? | Closed: visually hide it, mark it inert/hidden from AT, and sync the trigger even when reduced motion is enabled. Open: expose it, move focus inside, support Escape/overlay, and return focus. At desktop width: clear drawer state and expose the sidebar even if the mobile drawer had been closed. | Resolved: keep visual, keyboard, and assistive-technology states aligned. No new focus trap is proposed. |
| A page has no sidebar and uses fallback quicknav? | Make its toggle control the panel with `aria-controls`/`aria-expanded`; support Escape, outside dismissal, link-follow close, and focus return. Do not create a second navigation shell when a sidebar exists; omit the fallback on `/admin/login.html`. | Resolved: keep fallback navigation on admin utility pages but hide it on the unauthenticated login page. |
| Sidebar changes are made while preserving dashboard behavior? | Limit changes to the shared JS/CSS shell and preserve dashboard content, page handlers, role/access hooks, theme/session behavior, and page-level dashboard actions. | Resolved: keep dashboard compatibility within the shared-shell change. |

## References

- High-level design: `docs/high-level-design.md`
- Shared navigation: `assets/js/admin-unified.js`
- Shared navigation styles: `assets/css/admin-unified.css`
- Role visibility: `assets/js/admin-auth.js` and the dashboard role check
- Dashboard compatibility requirements are stated in `ADMIN-NAV-UI-019`.

