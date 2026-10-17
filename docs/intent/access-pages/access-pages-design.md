---
parent: high-level-design
prefix: ACCESS
---

# APSG Access Pages

## Context and Design Philosophy

The access pages are the entry points for APSG member verification and administrator sign-in. A polished shared visual language should make them feel like parts of the same service while preserving the cues and steps that distinguish their existing tasks. Presentation changes must remain separate from authentication and recovery behavior.

## Scope

This design covers the presentation of:

- `/admin/login.html`, the unified member and administrator portal with separate forms and a member/admin mode switch.
- `/pages/member-login.html`, the member login page that also routes administrator credentials and contains a multi-step APSG ID recovery flow.

The change updates CSS and selected user-facing copy. It may edit existing text nodes and message strings to remove backend-provider names, internal filenames, source paths, and query-parameter details from guidance and status messages. It does not change form structure or IDs, validation rules, script control flow, data access, authentication, session storage, recovery matching, redirects, or actual destinations. CSS supplies the visible “Show / hide” affordance for password controls that currently rely on icons alone.

## Current Structure

`/admin/login.html` uses a two-column hero layout with APSG access context and a panel containing separate member and administrator forms. The `portal` query parameter can select the initial form. The page supports the persisted snow/carbon theme, a visible theme control, field-specific focus handling, loading and status messages, and same-origin `redirect` or `next` return paths. Member verification opens member details; administrator authentication opens the dashboard.

`/pages/member-login.html` uses a centered access panel. Its single credential form distinguishes administrator email from a member registration number. The page includes password visibility, success/error messaging, and a recovery panel with lookup, candidate confirmation, ID reveal, phone re-verification, and contact states. It honors the persisted snow/carbon theme but has no visible theme switch. Both pages use shared site styles and utility classes; the member page also contains page-local recovery styles.

## Visual System and Layout

- Use the APSG evergreen, emerald, warm-ivory, and gold palette already present in the site. Use gold for selected emphasis, borders, and focus indication rather than as a large text or surface color.
- Give both pages a shared typography scale, spacing rhythm, surface treatment, control height, corner style, and focus treatment. Reuse the existing APSG logo, Inter body font, Playfair Display headings, and icon set, with their existing system-font fallbacks.
- Keep the admin portal's access-context and form-panel hierarchy, making the panel the primary interaction area. On wide screens, retain the three descriptive access cards as quieter supporting context. Keep the member login centered on the credential task, with the recovery panel visually subordinate until opened.
- Support viewport widths from 320px upward. Keep the admin context and form panel stacked from 320px through 1023px, then use the existing two-column composition from 1024px upward. On `/pages/member-login.html`, keep the outer credential panel centered and use a single-column recovery grid below 768px. Prevent horizontal overflow throughout the supported range.
- Allow long values from recovery results, including names, local-area fields, and the recovered APSG ID, to wrap within their cards and never widen or clip the panel.
- Keep all normal, hover, focus-visible, disabled, loading, error, and success states legible in both snow and carbon themes. Respect `prefers-reduced-motion` for decorative transitions.
- Retain the current content order and all form, status, recovery, and navigation elements. Styling must not hide content needed by a login or recovery state.

## Mobile Optimization Follow-up (Proposed)

On narrow screens, reduce visual height before the primary sign-in action while keeping every current field, explanation, recovery step, and navigation link available. Keep the existing hero background image and use an evergreen overlay as needed for text contrast. Keep the admin context cards legible in a compact arrangement, reduce oversized heading and panel spacing on phones, and give small utility links and controls comfortable touch areas. Keep the member recovery details readable in one column and allow long values to wrap inside their cards. Support widths from 320px upward without horizontal scrolling. Implement these refinements in the existing scoped CSS; do not change markup, form behavior, routes, or authentication.

## User-Facing Copy

- Do not show authentication-provider names, internal source filenames or paths, internal destination filenames, or query-parameter instructions in access-page guidance, status messages, or errors.
- Describe destinations in member or administrator terms, such as a member profile or dashboard. Preserve the actual navigation URLs and redirects.
- Replace raw provider or service error text with concise, user-facing guidance that tells the user to check their details or try again. Keep the existing error and status targets and do not change when they are shown.

## Presentation Boundary

Add the access-page presentation rules to `/assets/css/deployment-polish.css`, which is already loaded by both pages after their existing page styles. Scope admin-page rules through `body:has(#memberForm)` and member-page rules through `body:has(#singleLoginForm)` so the shared stylesheet cannot restyle dashboard or unrelated public-site components. Use the existing markup and IDs; do not add HTML attributes, classes, stylesheet links, or other markup. Any page or script edits are limited to the approved user-facing copy changes; the existing authentication and recovery logic remains untouched.

The visual layer must continue to work when remote fonts or icons are unavailable by using the current system-font fallbacks and keeping labels, controls, and actions understandable without icons. The password-visibility controls currently display only an icon, so provide a visible “Show / hide” text affordance alongside the icon with CSS-generated content while retaining each existing button and its current accessible name.

The pages use `.hidden` to switch forms, notices, and recovery steps. Access-page styling must preserve that behavior: no presentation rule may override `.hidden` and expose an inactive form, notice, or recovery step.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Shared presentation layer | Extend the existing deployment-polish stylesheet with selectors scoped through each page's existing form ID | Add a new stylesheet link or body marker; duplicate styles in inline blocks | Both pages already load the shared stylesheet after their current page styles. Existing form IDs let its rules target these pages without adding markup hooks or leaking into dashboard and public-site pages. |
| Page composition | Keep the admin context-plus-form layout and the member task-centered layout | Force both pages into identical markup and composition | The existing pages serve different entry tasks; a shared visual system can provide consistency without obscuring their distinct forms and recovery flow. |
| Admin context cards | Retain the three descriptive cards as quieter supporting context on wide screens | Keep them as equally prominent cards or remove them | The cards preserve access and security information while the form panel remains the primary task surface. |
| Typography | Keep Inter for body text and Playfair Display for headings with the current system-font fallbacks | Replace the current font pairing | Both pages already load this pairing, which supports a cohesive brand treatment without introducing another font dependency. |
| Theme behavior | Style both saved theme states while retaining each page's current controls and storage behavior | Add or remove a theme control or alter theme persistence | Theme controls and persistence are established page behavior; the visual update keeps each page's current affordances and saved preference. |
| Responsive behavior | Support widths from 320px upward; stack the admin context and form below 1024px and use one-column recovery details below 768px | Preserve desktop columns at all widths or introduce horizontal scrolling | The 1024px admin breakpoint matches the existing grid, while the 320px minimum matches the shared admin stylesheet. Stacking the recovery details below 768px keeps their values readable on compact screens. |
| User-facing implementation details | Use member/admin language in guidance and status copy without exposing provider names, internal filenames, source paths, or query parameters | Expose technical routing and authentication details in user-visible text | Members and administrators need clear next steps; implementation details do not help them complete sign-in or recovery. Actual destinations and authentication behavior stay intact. |

## LLD Edge-Case Probe

| Probe | Proposed handling / open point |
|---|---|
| The admin page opens with `?portal=admin` or a same-origin `redirect`/`next` parameter | Keep the existing state and destination logic; presentational styling must not depend on a default form being active. |
| A member or admin form is submitting, disabled, or showing an error/success notice | Preserve the current IDs and disabled state; styles must make status feedback visible without shifting controls off-screen. `.hidden` remains authoritative for inactive notices and forms. |
| A phone number, registration number, or recovery-result value is unusually long | Wrap database-provided names, state/LGA/ward values, and recovered APSG IDs within their cards; allow input values to scroll within their controls; never widen the page. |
| An authentication or recovery service is unavailable, or returns a technical error | Show concise user-facing guidance without exposing provider names, source paths, or raw provider messages; keep the current error targets and control flow. Proposed sign-in copy: “Sign-in is temporarily unavailable. Please try again shortly.” for an unavailable client and “We couldn’t sign you in. Check your details and try again.” for a sign-in error. Proposed recovery copy: “We couldn’t look up your APSG ID right now. Please try again shortly.” |
| ID recovery advances through lookup, candidate, reveal, and contact states | Keep the active state readable and the panel within the viewport; do not make the flow depend on hover or animation. |
| The saved theme is carbon on `/pages/member-login.html`, which has no visible theme switch | Apply the saved theme without adding a new control or changing storage behavior. |
| The viewport is between 320px and 1023px, or below 320px | Keep the admin layout stacked up to 1023px; 320px is the minimum supported width because the existing admin stylesheet sets that floor. |
| Remote font or icon requests fail | Use available system fonts; keep the icon-only password controls understandable through the CSS-generated visible “Show / hide” text affordance and retain their accessible names. |
| The user prefers reduced motion or navigates with a keyboard | Suppress decorative motion and retain a clear focus-visible treatment on every existing interactive control. |
| A browser does not support `:has()` | The page-scoped selectors may not match, so access-page layout rules may not apply. The supported browser baseline is not currently documented. |

## Open Questions & Future Decisions

### Resolved

1. ✅ Both access pages use the shared evergreen-and-gold system while retaining their different forms and current behavior.
2. ✅ The admin page's descriptive access cards remain as quieter supporting context on wide screens.

## References

- `docs/high-level-design.md`
- `admin/login.html`
- `pages/member-login.html`
- `assets/css/styles.css`
- `assets/css/admin-unified.css`
- `assets/css/deployment-polish.css`
