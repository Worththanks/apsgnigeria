---
parent: access-pages-design
prefix: ACCESS
---

# APSG Access Pages Requirements

## Shared Presentation

- [ ] **ACCESS-UI-001**: On `/admin/login.html` and `/pages/member-login.html`, the access interface shall use the shared APSG evergreen, emerald, warm-ivory, and gold visual palette with Inter body text, Playfair Display headings, and the existing system-font fallbacks.
- [ ] **ACCESS-UI-002**: At viewport widths of at least 1024px, `/admin/login.html` shall use its two-column access-context and form-panel hierarchy, with the three descriptive access cards visually quieter than the form panel while retaining their content.
- [ ] **ACCESS-UI-003**: On `/pages/member-login.html`, the credential panel shall remain the primary access surface and the APSG ID recovery panel shall remain visually subordinate until the recovery flow is opened.
- [ ] **ACCESS-UI-004**: At viewport widths from 320px through 1023px, `/admin/login.html` shall stack the access context and form panel; below 768px, `/pages/member-login.html` shall present recovery details in one column. Neither page shall have horizontal overflow at supported viewport widths of 320px or wider.
- [ ] **ACCESS-UI-005**: On `/admin/login.html` and `/pages/member-login.html`, keyboard focus shall remain visibly indicated on every existing interactive control, and normal, hover, focus-visible, disabled, loading, error, and success states shall remain legible in both snow and carbon themes.
- [ ] **ACCESS-UI-006**: When `prefers-reduced-motion` is enabled on `/admin/login.html` or `/pages/member-login.html`, decorative transitions shall be suppressed or reduced.
- [ ] **ACCESS-UI-007**: On `/admin/login.html` and `/pages/member-login.html`, the password-visibility control shall show a CSS-generated visible “Show / hide” text affordance alongside its icon while retaining its existing button and accessible name.
- [ ] **ACCESS-UI-008**: On `/pages/member-login.html`, unusually long registration numbers, recovery names, state/LGA/ward values, and recovered APSG IDs shall wrap or remain contained within their controls and cards without widening or clipping the page.
- [ ] **ACCESS-UI-009**: On `/admin/login.html` and `/pages/member-login.html`, elements marked `.hidden` shall remain visually hidden, including inactive forms, notices, and recovery steps.
- [ ] **ACCESS-UI-010**: On `/admin/login.html`, access-specific presentation rules shall be scoped through `body:has(#memberForm)`; on `/pages/member-login.html`, they shall be scoped through `body:has(#singleLoginForm)`. These rules shall not restyle dashboard or unrelated public-site pages and shall not require new HTML hooks.
- [ ] **ACCESS-UI-011**: On `/admin/login.html` and `/pages/member-login.html`, existing fields, field labels, recovery steps, and navigation links shall remain present and unchanged; helper, status, and error wording may change only to remove implementation details and raw service errors.
- [ ] **ACCESS-UI-012**: On `/admin/login.html` and `/pages/member-login.html`, user-facing guidance, success, and error messages shall describe destinations in member or administrator terms and shall not display authentication-provider names, internal filenames or source paths, or query-parameter instructions.
- [ ] **ACCESS-UI-013**: When the sign-in client is unavailable on `/admin/login.html`, the page shall show “Sign-in is temporarily unavailable. Please try again shortly.” When administrator sign-in returns a technical error, it shall show “We couldn't sign you in. Check your details and try again.” When APSG ID recovery returns a technical error on `/pages/member-login.html`, it shall show “We couldn't look up your APSG ID right now. Please try again shortly.” These messages shall not display raw provider text or script paths.

## Preserved Access Behavior

- [ ] **ACCESS-BEH-001**: On `/admin/login.html`, selecting Member or Admin shall continue to show the corresponding existing form, and `?portal=admin` shall continue to select the Admin form on initial load.
- [ ] **ACCESS-BEH-002**: On `/admin/login.html`, member verification shall continue to use the registration-number and phone fields with `/admin/member-details.html?mode=member` as its fallback destination; administrator sign-in shall continue to use the email and password fields with `/admin/dashboard.html` as its fallback destination.
- [ ] **ACCESS-BEH-003**: On `/admin/login.html`, a same-origin `redirect` or `next` return path shall continue to be honored after successful member verification or administrator sign-in, and an off-origin return path shall continue to use the corresponding fallback destination.
- [ ] **ACCESS-BEH-004**: On `/pages/member-login.html`, the existing single credential form shall continue to route email-shaped credentials through administrator authentication and other credentials through member verification, preserving the current session and success destinations.
- [ ] **ACCESS-BEH-005**: On `/pages/member-login.html`, APSG ID recovery shall retain its phone-and-local-area lookup, candidate confirmation, ID reveal, phone re-verification, and contact states; an unregistered phone shall continue to redirect to `/pages/register.html`, and successful re-verification shall continue to open `/admin/member-details.html?mode=member`.
- [ ] **ACCESS-BEH-006**: On `/admin/login.html`, submitting the member form without a registration number or phone number, or submitting the admin form without an email or password, shall continue to display the existing validation error before an authentication request is made.
- [ ] **ACCESS-BEH-007**: On `/pages/member-login.html`, submitting the login form without an identity or secret, starting APSG ID recovery without a registered phone number or local-area value, or verifying a recovered ID without a phone number shall continue to display the existing validation error before a lookup or sign-in request is made.
- [ ] **ACCESS-BEH-008**: On `/admin/login.html`, the existing Member/Admin tabs, credential inputs, password-visibility button, status targets, and helper notice shall retain their unique script-target IDs.
- [ ] **ACCESS-BEH-009**: On `/pages/member-login.html`, the existing login controls, password-visibility button, recovery-step controls, recovery data targets, and status targets shall retain their unique script-target IDs.
- [ ] **ACCESS-BEH-010**: On `/admin/login.html`, the existing theme buttons shall continue to persist the selected `daynight-theme`; on `/pages/member-login.html`, the initial theme shall continue to load from `daynight-theme` without adding a visible theme control.
