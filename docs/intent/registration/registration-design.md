---
parent: high-level-design
prefix: REG
---

# Membership Registration Presentation

## Context and Design Philosophy

Registration presents one organization membership at a time through Membership, Your details and Review & submit. Phone users need readable choices, a clear current step, visible validation and an action they can reach without losing their place. The details stage holds several kinds of information, so its layout must make the personal, residence and contact sections easy to scan without adding more stages.

## Scope and Ownership

This leaf owns the focused page frame, progress indicator, responsive form presentation, action placement, validation feedback, and registration dialogs' presentation/focus lifecycle. It owns the visual grouping of form sections and review content, but not which fields appear, their values, requiredness, validation rules or payload. REG-UI-001 through REG-UI-005 retain their existing progress-indicator behavior.

The field component owns captured values, requiredness and payload representation. Lookup owns matching, candidates and verification. Branding owns organization and selected membership identity. Submission owns registry checks, uploads, writes, identifiers, outcomes and Done/reset semantics. Member login and recovery belong to the portal.

Use shared public tokens without mounting the browsing dock. Keep existing field IDs/names, choices, status regions and functional handlers. A presentation adapter reflects registration state rather than creating another registration state machine.

## Page Layout

The focused masthead contains an APSG home link, Help/Contact and Member login. It uses the public brand proportions and stays compact. Registration has no public navbar, browsing dock or footer. Selected-organization branding appears in details, review and confirmation through its existing owner.

Use a 960px maximum frame, 16px phone side gutters and 24px on larger screens. Keep the title and short instruction above progress. Details use one column on phones; related short inputs may use two columns on wider screens while paragraphs, status, uploads and consent retain sufficient width.

### Membership Choice Screen

The first stage is the welcome and choice screen within the existing registration page. It introduces the journey in plain language, tells applicants to choose one organization and membership type, and explains that a separate registration can be completed for the other organization. It does not add a landing route, collect personal data, or select a residence on the applicant's behalf. No choice is selected on first entry or after the completed-registration reset. Returning from details to change the choice keeps the prior choice selected so it can be retained or replaced.

Retain APSG, APSG Youth Wing, CWDI and CWDI Youth Wing as one named radiogroup using a shared radio name, grouped visually under the APSG and CWDI identities. Use organization text headings as the group labels, with logos decorative because the text already identifies each organization. A missing logo must not remove that identity or collapse the option layout. Each whole card label activates its native radio; native arrow-key behavior traverses the one shared choice group. Selection updates synchronously without navigation or a lookup request. Checked styling and keyboard focus are distinct and each remains identifiable without color alone.

Place the four choices in two parent-organization groups. Each group presents its organization identity and full name, then its general and Youth Wing options as selectable cards. On narrow phones, stack options within each group so their labels remain readable; at 40rem and wider, show options side by side. The organization groups may stack or reflow at all intermediate widths and enlarged text sizes without changing choice order or causing horizontal overflow. Continue remains the single primary action and is disabled until one radio option is selected.

Keep a short returning-member note immediately after the organization groups and before Continue: members can sign in from the masthead, while an existing member choosing that organization's Youth Wing option follows the existing verification path. The note remains reachable above the action area on small viewports. It explains these paths without introducing another registration state or changing lookup behavior.

~~~
[APSG home]                              [Help] [Member login]
[Membership registration / Choose your membership]
[Choose one organization and membership type; register separately for the other]
[01 Membership] -- [02 Your details] -- [03 Review & submit]
[APSG: General | Youth Wing] [CWDI: General | Youth Wing]
[Returning-member guidance; one primary Continue action]
[choice OR selected organization summary]
[form groups and lookup/error feedback]
[secondary direct-submit action]
[current primary action on eligible phone viewports]
~~~

### Your Details and Review

Keep the details form within the existing second stage. Group its primary information in this order: Personal details, Residence, and Contact. Personal details contains identity and membership-role fields. Residence groups the selected current country with the applicable current location fields; when residence is outside Nigeria, any Nigerian home location remains a separately labeled subsection. Contact presents the required primary phone and email together, followed by any diaspora-only Nigerian number and preferred-contact control supplied by the field component. The presentation adapts to those fields' visibility state and does not infer residence from either phone's calling code.

Use consistent section headings, spacing, and light reading surfaces with evergreen headings and restrained gold accents. Keep each section visually distinct without surrounding every individual control with another nested card. Below 48rem, stack fields in one column. At 48rem and wider, use two columns for First/Middle Name, Last Name/Gender, Level/Designation, primary phone/email, and current city/state-province; keep the residence-country selector full width. In the Nigerian location group, use two columns from 48rem to 64rem with Ward spanning the row, and three columns from 64rem. Preserve sufficient width for labels, errors, helper text, selectors, and phone numbers; enlarged text and narrow effective viewports must reflow without horizontal scrolling. The Contact group uses the fields currently exposed by the field component and must not reserve a blank grid cell when an optional control is absent; REG-FORM defines its visibility and empty-state rules. Optional verification numbers, uploads, and consent retain their existing order and owners below the personal, residence, and contact groups.

The review dialog mirrors the Personal details, Residence, and Contact grouping so applicants can scan the values they entered. Show current residence separately from Nigerian home location, and show the primary number separately from any Nigerian contact number and the applicant's preferred-contact choice. Omit an unsupplied optional number. Keep the existing single Edit details action and Confirm & submit action; the presentation does not introduce another registration stage or a new review state.

Section content remains in the normal page flow. When added fields increase the content height or open the phone keyboard, the existing action-placement rules choose between the reachable bottom action area and in-flow actions. Review content remains scrollable inside the existing dialog frame. If a visibility update hides the focused control, move focus to the current-residence selector after the update and keep the viewport at the Residence section; do not change stages or clear remaining values. Field-owned state determines whether a hidden value is retained.

## Progress Indicator

Present three equal-width columns in a restrained panel. Place each numbered circle above its label. Draw connectors only in the horizontal gap between markers. Distinguish current, completed and upcoming stages with numbering, text and styling.

Keep the ordered list named Registration progress. The existing stage controller owns .is-active, .is-complete and exactly one aria-current="step". At narrow widths, labels wrap within their own columns while connectors remain centered on markers and outside labels. Do not shrink labels to force one line. Reduced motion removes marker transitions.

## Primary and Secondary Actions

Use original action controls rather than sticky clones. Stage one exposes Continue, disabled until exactly one membership is chosen. Stage two makes Review details primary and retains Submit directly as a secondary in-flow action. Review contains Edit details and Confirm & submit. The success receipt contains Done.

Below 48rem, place the current primary action in a bottom area when no dialog or keyboard is active and at least 480px of visual viewport height is available. Measure its rendered height and reserve that space plus safe-area clearance at the form end; apply matching scroll padding.

If the action area exceeds one quarter of the visual viewport, the viewport is short, or a keyboard is likely open, use an ordinary in-flow action area. Recalculate on resize, orientation, visualViewport and content-size changes. Without visualViewport, editable focus selects in-flow mode. At 48rem and above, actions stay in flow.

The busy controller remains authoritative: disable review/direct-submit, expose aria-busy on the active action, and prevent another action or membership change while it is busy. The visual adapter does not issue an independent lookup or submission.

During pre-review lookup, personal fields remain editable. An identity or membership edit invalidates the pending presentation through the existing lookup owner. A stale completion cannot change a stage, open review or replace newer feedback. After a current lookup succeeds, capture the latest remaining form values for review. During actual submission, the submission owner's snapshotted-operation lock applies to form and review controls.

Use the unobstructed visual viewport height for the current orientation as the keyboard reference. Record it only without editable focus and at scale from 0.9 through 1.1, refresh it after blur/viewport stabilization, and rebuild it after orientation changes. With editable focus, a reduction greater than 140px indicates keyboard mode. Pinch zoom alone does not select keyboard mode or overwrite the reference.

Submitting the form with Enter follows the Review details path and its validation/lookup gate. It does not navigate the page or issue a direct registry write. Textarea editing and native select interaction retain normal keyboard behavior.

## Validation and Lookup Feedback

Retain existing validity/requiredness decisions. On failed action validation, keep entered values, mark affected controls with aria-invalid, associate concise inline messages, and show an error summary with links to affected controls. Focus the summary so the correction path is apparent.

Keep formMessage and registrationLookupStatus as distinct outcome/lookup regions. Async lookup remains a live region owned by the lookup component. Presentation does not reveal extra candidate identity or turn unavailable data into a no-match result. Messages wrap and remain visible above the action area.

Keep the validation summary before the details sections and spanning the form width. Keep each inline message adjacent to its control and allow it to wrap without clipping. A correction link retains its existing focus and scroll behavior, with enough scroll margin for the compact masthead and any active bottom action. If summary or inline-message height makes the bottom action area compete with the visible viewport, use the existing in-flow action rule.

Autocomplete, input types and phone keyboard hints suit the existing data fields. Requiredness, optional verification numbers and recommended uploads follow their field/submission designs.

## Dialog Presentation and States

A field correction link inside review first closes review, restores stage two, and then focuses and scrolls to the field after the details view is available. The initial review error is announced and focused inside the active dialog; no correction link focuses a field through an inert background.

Use one physical native dialog frame for review, duplicate-member confirmation and success. Retain previewModal, duplicateMemberModal and successModal as content-section IDs with their existing actions. One registration dialog presenter owns the frame, active section, opening/closing, labels, focus, background modality and action-area suppression.

The frame has a title, scrollable body and reachable action row. Its height follows the visible viewport with 12px clearance and safe-area padding. Only one content section is active. Switching review, duplicate or success content keeps the same frame modal, updates its accessible label and focuses the new heading. Explicit Edit, dismissal, Done and error rules decide when to close the frame.

| Event/state | Presentation |
|---|---|
| Choice confirmed with Continue | Show details, set stage two, focus the first field and position its heading below the masthead. |
| Membership screen is first entered or restored after successful Done | Leave all four radio choices unchecked and keep Continue disabled until the applicant chooses one. |
| Applicant returns from details to change membership | Keep the previously checked choice; the applicant can retain it or choose another before Continue. |
| Applicant selects a membership card or uses native radio-key interaction | Update the one-of-four checked state and Continue availability immediately without making a lookup or changing stage. |
| Logo asset is delayed or unavailable | Keep the organization name and option controls visible in their reserved layout. |
| Small viewport, enlarged text, or visible bottom action | Allow organization groups/options to reflow, reserve the action area and safe-area space, and keep the choice cards and returning-member note reachable. |
| Membership changed | Return through the existing choice handler and invalidate lookup through its owner; preserve/reset values according to that handler. |
| Valid review and successful lookup | Populate the existing snapshot, set stage three, open review and focus its title. |
| Confirm after membership, fields or selected files change | Block that attempt, close to details, retain values and explain that a fresh review is required through the existing validation/lookup gate. |
| Edit details | Close review, set stage two and focus the first editable detail field. |
| Escape/backdrop from review before submission | Close review, set stage two and restore Review details. |
| Candidate conflict | Show only the existing duplicate flow and keep review/submission blocked under the lookup contract. |
| Duplicate dialog dismissed | Restore focus to phone; preserve the conflict outcome and form values. |
| Submit pending | Expose busy state, prevent dismissal/competing action, and keep values and snapshot. |
| Direct submit fails or local preview blocks it | Keep details/feedback visible at stage two and re-enable eligible actions. |
| Submit from review fails or local preview blocks it | Keep review at stage three, announce its error in the active dialog and retain Edit/Retry. |
| Submission succeeds | Show the existing organization-specific receipt and focus its heading. |
| Escape/backdrop on success | Keep the receipt visible; Done explicitly continues. |
| Done | Run existing reset/choice behavior, return to stage one and focus the first choice. |

Review captures selected membership, displayed field values and selected files. Immediately before Confirm invokes submission, compare that snapshot with current form state; a mismatch takes the correction transition above. Direct submission retains its explicit current-value path and the submission owner's operation lock.

Without native dialog support, use the same single frame and content switching model with a focus trap, inert background where supported, labeled controls and the same state table. A closed fallback is hidden and inert. Restore a connected, visible owner control or the current stage heading when closing.

## Local Preview and Data Boundaries

Local preview may show existing read-only lookup and review results. Preserve guards for writes, uploads, number allocation and portal handoff as if registration submission succeeded. After separate registration-number-and-phone verification of an existing member, allow organization-specific portal login in view-only mode. A blocked local action reports preview status and preserves the form; it does not simulate membership success or invent an ID.

Organization, matching, upload and receipt data come from their existing owners. Layout does not add client-side persistence for identity fields.
Applicant-provided review values are rendered as text; template interpolation escapes HTML characters in names, contact fields, designation, verification numbers and filenames.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Registration entry | Present welcome copy and the existing four choices in the first Membership stage | Add a separate landing route; start with personal details | The membership choice already defines the first stage, so a focused introduction improves orientation without another navigation step or a second state owner. |
| Returning-member guidance | Explain the existing login and Youth Wing verification paths beside the choices | Show only a generic sign-in link | Members choosing Youth Wing need a clear route into the existing organization-specific verification flow; the guidance reduces confusion without changing lookup behavior. |
| Registration navigation | Compact Home, help and login links with no public navbar, browsing dock or footer | Full public shell around the form | The focused registration layout keeps navigation and the primary action easy to find on phones. |
| Phone actions | Eligible persistent primary action; secondary direct-submit in flow | Two equal sticky choices; remove direct submission | The recommended next step is clear while retaining the existing direct path. |
| Indicator | Three columns, wrapping labels and segmented connectors | Vertical stages; rule behind labels | All stages remain apparent without a rule striking the text. |
| Stage state | Preserve numbered markers and current/completed/upcoming styling | Replace completed numbers with icons | Stable numbering keeps the sequence explicit across stages. |
| Action owner | Reposition one control and reuse its controller | Clone controls with separate handlers | One owner prevents duplicate requests. |
| Modality | One native frame with content switching and a fallback | Separate dialogs; independent custom overlays | Keeping the frame open avoids native close-time focus restoration between outcome surfaces. |
| Errors | Linked summary and field-specific feedback | Generic message/color alone | Applicants can locate fields blocking progress. |
| Details grouping | Keep personal, residence, and contact information in the existing details stage and group the review by the same headings | Add more stages; leave all details in an undivided form; create a different review order | Clear groups improve scanning while keeping one progress model and allowing direct comparison between entered and reviewed information. |
| Details grid | Use one column below 48rem, related two-column pairs from 48rem, and a three-column Nigerian location row only from 64rem | Use fixed desktop grids at every width; keep the entire details form one column | Breakpoint-based related pairs reduce scanning time while preserving usable control widths on phones, short viewports and enlarged text. |
| Section surfaces | Use a quiet surface, consistent section heading, and generous spacing; keep individual controls visually simple | Add decorative gradients, heavy card borders, and a separate container around every field | Subtle grouping supports a polished APSG/CWDI presentation without competing with field labels or increasing visual density. |
| Review layout | Group supplied values by Personal details, Residence, and Contact, with one Edit details action | Repeat the form in a second interaction model or add per-field edit actions | Matching groups make the review easy to scan while retaining the current focused edit and confirmation flow. |

## Edge-Case Probe

| Condition | Required handling |
|---|---|
| A long stage label wraps | Keep it in its column, with connectors above the label row. |
| Stage changes to two or three | Update states and aria-current without shifting marker positions. |
| Text grows or the phone rotates | Recompute action space; use in-flow actions when fixed controls take too much of the viewport. |
| Diaspora contact controls appear at a narrow or zoomed viewport | Keep visible controls, preference choices, labels, and errors within the viewport width; reflow at the form breakpoints and use in-flow actions when content height is constrained. |
| Residence changes while a diaspora-only contact control is focused | After the field component updates visibility, move focus to the current-residence selector if the focused control is hidden; retain the details stage, Residence scroll position, and remaining values. |
| An error summary or inline validation message grows at a narrow viewport | Let messages wrap, keep the summary before the form groups and inline errors beside their controls; move actions in flow when the bottom action area would obstruct correction. |
| Review contains an optional Nigerian phone and contact preference | Keep primary and Nigerian numbers visibly distinct within the scrollable review body and preserve access to its action row. |
| A duplicate check opens during review preparation | Show the duplicate dialog without opening review behind it. |
| Local preview prevents submission | Preserve values and show the failure in the currently active view. |
| Reduced motion | Keep visible state and remove transitions/smooth scrolling. |

## Open Questions & Future Decisions

REG-FORM defines when the optional Nigerian phone and preferred-contact controls appear, their empty-value behavior, and how review presents Nigerian home-location fields when none are supplied. Draft persistence, resumable registration and changes to registry operations require their own data and security design.

## Requirements

The [registration presentation requirements](registration-specs.md) preserve REG-UI-001–005 for progress and cover frame/actions (REG-UI-006–016), validation/status (REG-UI-017–018), dialogs/focus (REG-UI-019–030), preview/data boundaries (REG-UI-031–032), motion (REG-UI-033), current reviewed-snapshot confirmation (REG-UI-034), applicant text rendering (REG-UI-035), the first-stage welcome and choice screen (REG-UI-036–039), and details/review grouping and focus recovery (REG-UI-040–043).

## References

- [Project high-level design](../../high-level-design.md).
- [Public Shell](../public-shell/public-shell-design.md).
- [Field Requirements](../registration-form-fields/registration-form-fields-design.md).
- [Existing-Member Lookup](../registration-member-lookup/registration-member-lookup-design.md).
- [Organization Branding](../registration-organization-branding/registration-organization-branding-design.md).
- [Organization Submission](../registration-submission/registration-submission-design.md).
- [MDN modal dialogs](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal).
