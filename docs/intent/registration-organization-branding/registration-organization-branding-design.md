---
parent: high-level-design
prefix: REG-BRAND
---

# Registration Organization Branding

## Context and Design Philosophy

Applicants select exactly one membership per registration: APSG, APSG Youth Wing, CWDI, or CWDI Youth Wing. The details and review views retain the identity of that membership so applicants can verify which organization and membership type they are requesting. A person may complete another registration for a different organization after the current registration is complete. Branding is derived from the single selected membership and uses the site's local logo assets.

## Organization Identity

The registration journey maps the APSG organization key to `/assets/images/logo/apsg1.png` and the CWDI organization key to `/assets/images/logo/cwdi-registration.png`. The key-to-asset mapping is fixed in the page; membership labels or user-entered values do not supply image paths.

The details view shows one parent-organization logo and name beside the selected membership label. The review view repeats that single identity beside the membership being submitted. APSG and APSG Youth Wing use the APSG logo; CWDI and CWDI Youth Wing use the CWDI logo. The membership label distinguishes a Youth Wing choice from its parent organization.

The post-submission confirmation uses the same organization-to-logo mapping and displays the organization and membership type from the completed submission. It derives this identity from the submitted result, not a later or reset form selection.

## Responsive and Accessible Presentation

- Keep logos legible at mobile and desktop widths without making them dominate the membership labels or form details.
- Keep the single logo and membership identity legible on narrow screens without horizontal overflow.
- Provide organization-specific alternative text for each informative logo.
- Keep organization names visible as text so the selected identity is not conveyed by image alone.
- If an image cannot load, retain the organization name and accessible text.

## Data and State

The single selected membership is the source of truth for the details and review views. The confirmation derives its organization and membership type from the completed submission result. A shared presentation helper maps only recognized organization keys to local logo assets and accessible names. The helper does not change registration validation, submission, member matching, or database behavior; those behaviors remain owned by their respective registration components.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Which organization to display | Show the one selected parent organization, including for Youth Wing choices | Show multiple logos in one registration; use a generic combined mark | Each registration belongs to one organization, so one logo keeps the details, review, and confirmation aligned with the membership being requested. |
| Logo asset source | Use the existing local APSG and CWDI logo files through a fixed organization-key map | Fetch logos from remote URLs; infer a path from a label | Local allow-listed assets work in the local preview and avoid network dependency or unsafe path construction. |
| Where branding appears | Repeat the selected organization identity on the details, review, and confirmation views | Show logos only on the initial choice cards | Repeating identity helps applicants check their selection at the decision and confirmation points. |

## Edge-Case Probe

| Condition | Required handling |
|---|---|
| Any one of the four membership options is selected | Show the selected parent organization's logo and the exact membership label on details, review, and confirmation views. |
| A Youth Wing option is selected | Show the parent organization's logo and retain the Youth Wing membership label. |
| The membership changes after the details view opens | Refresh the details summary and subsequent review branding from the current single selection; do not retain the prior organization's identity. |
| The form is reset after a completed submission | Keep the confirmation branded for the organization and membership type that were submitted. |
| A logo asset fails to load | Keep the organization name visible and provide meaningful alternative text. |
| No organization is selected | Do not show a misleading organization logo; existing selection validation remains responsible for preventing progress. |

## References

- `../../high-level-design.md`
- `../registration/registration-design.md` — progress indicator
- `../../../pages/register.html` — registration page and local preview
