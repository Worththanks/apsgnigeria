---
parent: high-level-design
prefix: REG-FORM
---

# Public Registration Field Requirements

## Scope

Define the capture, review, and requiredness of personal, residence, phone, and verification details on `/pages/register.html`. Middle Name and Gender appear in Personal Information for all four membership choices. PVC/VIN and APC card numbers remain available for applicants who have the information. Add explicit current residence and international phone capture, plus an optional Nigerian contact number for diaspora applicants, while retaining the four single-select choices and one-organization-per-submission journey. Lookup, persistence, member-profile, and database behavior are specified in their own linked-intent segments.

## Residence and Phone Capture

- Require a valid Country of Residence value and default the editable selector to Nigeria. The choice is independent from the phone calling code. Never derive residence from a phone number, browser location, locale, IP address, or existing record.
- Bundle a versioned local country metadata asset for both selectors (ISO alpha-2 and alpha-3, English country name, and calling code); do not depend on a runtime geolocation or external directory service. Show the phone calling code first in each option label so it remains visible in narrow mobile controls. Residence values use ISO-3166-1 alpha-3 codes. The browser may send the selected code as residence input, but the selected organization's registration RPC validates it against server-owned country data and derives the chapter and registration-number country segment.
- The phone control is a labeled national-number input paired with an accessible calling-code selector. The selector defaults to Nigeria (`NG`, `+234`) but does not change or preselect Country of Residence. Users may choose a different calling country, including when their residence country and phone country differ.
- Parse and validate the phone with the locally bundled `libphonenumber-js` max metadata; require both a possible length and a valid country-specific digit pattern, then convert valid input to canonical E.164 before review, lookup, or submission. Parse strictly without extracting a phone number from surrounding text. Accept a complete `+` number (or `00` international prefix) through the same parser, and require its calling code to match the selected calling-code control. Reject malformed, invalid, or mismatched numbers with an inline message; never make a match decision from only the final 10 digits. The bundle is pinned in the local project and runs without a runtime network request.
- Treat the required primary phone as the identity phone already used by the registration lookup. Its value may use any valid calling code independently of residence.
- When Country of Residence is outside Nigeria, show a separate optional Nigerian phone input labeled with the `+234` country code and helper text that says it is for applicants with a separate Nigerian number. Accept a Nigerian national number or complete `+234` number, validate it strictly as a Nigerian number with the same bundled metadata, and expose only its canonical E.164 value to the registration submission flow. Do not add a second country selector for this fixed-country field. A non-Nigerian international calling code in this input is invalid.
- Nigerian residents use the existing single-primary-phone path; do not show the separate Nigerian phone or preferred-contact controls for them.
- When a diaspora applicant supplies a valid Nigerian phone, require an explicit preferred-contact choice between the primary phone and Nigerian phone. If the Nigerian phone is blank, omit the choice and treat the primary phone as the only contact number. The choice is contact preference only and must not affect the primary-phone lookup, member identity, sign-in, recovery, residence, organization, or registration number.
- Show the required primary E.164 number in the review. When a valid Nigerian number is supplied, also show that canonical number and the preferred-contact selection. Omit the Nigerian number and preference entirely when the optional value is blank.
- For Country of Residence Nigeria, retain the existing Nigerian State, LGA/LCDA, and Ward controls, requiredness, cascading options, and Nigerian registration-number path.
- For a country other than Nigeria, require current city and state/province. Keep the existing Nigerian State/LGA/Ward controls in a separately labeled “Nigerian home location” group, optional for this path. These values are not the member's current foreign residence and do not supply a Nigeria chapter or number prefix.
- On any residence-country change, clear current city and state/province and ask the applicant to enter the current foreign location again. When a change crosses the Nigeria boundary, also clear State/LGA/Ward because their meaning changes between current location and Nigerian home location. When the applicant changes from one non-Nigeria country to another, retain Nigerian home-location values.
- When residence changes to Nigeria, hide the optional Nigerian phone and preferred-contact controls and exclude their values from review and registration submission. Keep those values in the unsent form state so a temporary change back to diaspora does not discard them; never submit them while the controls are hidden. When a diaspora applicant clears or edits the Nigerian number so it is blank or invalid, clear the prior preference; a valid number entered again requires a new choice.
- Compare primary and Nigerian phone values after E.164 normalization. If both resolve to the same number, block review and submission with an accessible field-specific message that the Nigerian number must differ from the primary number.
- When a valid optional Nigerian number is supplied, present preferred contact as an accessible required choice between Primary phone and Nigerian phone. If neither is selected, block review and submission and associate a visible correction message with the choice group.
- Do not mark the Nigerian phone or preferred-contact controls as unconditionally `required` in HTML. Apply conditional validation only for a diaspora residence with a nonblank, valid Nigerian phone.
- In review, show a Nigerian home-location subsection only when at least one home-location value is supplied. Within a shown subsection, render missing optional values as “Not provided.” Keep the current Nigerian location visible for Nigeria residents under its current-location label.
- Show residence and the E.164 primary phone in the review. For Nigeria, show Country of Residence plus the existing State/LGA/Ward. For other countries, show current Country/City/State-Province and, if supplied, Nigerian home State/LGA/Ward separately. The success receipt continues to use the registration number returned by the selected organization's database operation.
- Country-specific location inputs and the residence country are part of a new member's registration payload. Existing-member Youth Wing enrollment remains a classification-only update: it preserves the existing member profile, residence, phone, and registration ID. Residence fields do not overwrite an existing row through the registration form.
- An existing row whose current residence has not been verified stays unknown. Do not populate residence from its legacy State/LGA/Ward, phone, or registration number.

## Field Behavior

- Middle Name is an optional text input with `additional-name` autocomplete. Gender is an optional select offering Male, Female, and Prefer not to say, with an empty initial choice.
- Show both personal fields in registration review, using “Not provided” for an empty value. Include Middle Name between first and last name on the registration receipt.
- Pass trimmed Middle Name and the selected Gender to submission for a new member record. Empty personal details are stored as `null` in the selected organization's registry.
- Do not mark either field `required` in HTML or custom form validation. Keep the field labels concise without a required marker or an “Optional” suffix.
- A blank value must not prevent preview or submission when all other required fields are valid.
- Include a provided value in the registration payload. Send an empty string when an optional value is omitted so the existing registry columns continue to accept the row.
- Display “Not provided” for a blank PVC/VIN or APC card number in the registration review.
- Keep PVC and APC document uploads optional and retain their existing “Recommended” labels.
- Use the native file input with an explicit green Choose file button, white text, a visible keyboard focus ring and at least a 44 px target. Render registration at natural scale so shared body zoom cannot reduce touch targets or mobile text sizes. Keep the filename and format/size status legible within narrow layouts. Validate JPG/PNG/PDF and 5 MB before preview or submission; selection, reselection and reset update the accessible status.
- When an existing member record is reused, omitting either value must not clear the stored value. The existing-member path only changes Youth Wing classification and does not overwrite the member's verification numbers.

## Validation and Data Flow

The user-facing label is Gender; its value continues to use the existing `sex` payload property and database column for compatibility.

The page's custom validator checks controls marked `required`. Middle Name, Gender, PVC/VIN, and APC card number omit that marker. Country of Residence and a valid E.164 phone are required. Nigeria uses the existing required State/LGA/Ward controls. A non-Nigeria residence requires city and state/province; Nigerian home location is separate and optional. New registration payloads include the residence code, foreign city/state-province when applicable, Nigerian location fields, and canonical E.164 phone. Database operations validate residence-country codes and derive chapter/registration values; the browser does not submit a registration number or Diaspora chapter. Existing-member updates preserve all profile and residence values and only apply the selected Youth Wing classification.

The diaspora-only Nigerian phone is optional, but any nonblank value must parse as a valid Nigerian number and normalize to E.164 before review or submission. When supplied, the applicant selects whether the primary or Nigerian number is preferred for contact. For a new-member submission, pass the secondary E.164 value and contact preference only when the secondary value is valid and residence is outside Nigeria. Omit both values when the optional number is blank or the residence is Nigeria. The existing primary phone remains the only value used by the established lookup. The submission LLD owns persistence, Youth Wing update behavior, and the exact database representation.

## Decisions and Alternatives

| Decision | Chosen | Alternative | Rationale |
|---|---|---|---|
| Personal optional field representation | Keep Middle Name and Gender visible without required markers or “Optional” suffixes | Remove the inputs from registration or keep them required | Applicants can provide the information without being blocked when it is unavailable. |
| Gender input | Use a select with Male, Female, Prefer not to say, and an empty initial choice | Use free text or require a selection | A bounded choice keeps entries consistent while allowing applicants to leave the field unfilled. |
| Blank verification-number value | Submit an empty string for an omitted PVC/VIN or APC card number | Submit `null` | Empty strings remain compatible with existing text columns even if a deployed column has a non-null constraint; dashboards already treat blank values as missing. |
| Review presentation | Show “Not provided” for an empty PVC/VIN or APC card number; omit the absent Nigerian phone and preference | Render visually empty verification numbers or an absent Nigerian number as “Not provided” | Explicit text clarifies verification-number omissions without implying the optional Nigerian phone is required. |
| Residence selector | Default the editable residence-country selector to Nigeria | Start blank or infer residence from phone/browser data | Nigeria is the common path; a visible, editable value keeps country choice independent from phone details and does not rely on inferred location. |
| Country representation | Use ISO-3166-1 alpha-3 for registration residence values and IDs, validated against the shared country directory | Store free-text country names or trust browser-supplied ISO values | A stable code supports accurate country filters and secure server-side chapter/ID derivation. |
| Residence and Nigerian location | Use current Country/City/State-Province for foreign residence; retain Nigerian State/LGA/Ward separately as home location | Reuse the Nigerian State field for a foreign state/province | Separate fields prevent a foreign location from being misreported as a Nigerian state or used in Nigeria numbering. |
| Phone entry | Independent country calling-code selector, defaults to Nigeria; validate with locally bundled max metadata and submit E.164 | Infer residence from calling code, accept raw digits, length-check only, or rely on an external runtime CDN | Independent controls support Nigerian numbers abroad, and full local metadata validates country-specific digit patterns without a runtime network request. |
| Diaspora Nigerian phone | Show one optional fixed-`+234` Nigerian input only for non-Nigeria residence; when valid and supplied, require a preferred-contact choice | Add a second unrestricted international phone selector or make a second number mandatory for diaspora applicants | The field captures the distinct Nigeria contact use case without confusing it with residence or the primary identity phone, and applicants without a second number can still register. |
| Preferred contact | Ask which supplied number is preferred only after a valid Nigerian number is entered; primary remains the sole lookup number | Infer preference from the last field edited or use the secondary number for lookup | An explicit choice is reviewable and cannot silently change the established identity/lookup path. |
| Residence change behavior | Clear current foreign city/state on any country change; clear State/LGA/Ward when crossing the Nigeria boundary; hide but retain the unsent Nigerian phone and preference while residence is Nigeria | Keep all hidden location and phone values active or erase every value on every country change | Clearing location fields prevents stale values from changing meaning, while temporarily retaining the hidden optional contact values avoids unnecessary re-entry; hidden values are excluded from all downstream actions. |
| Duplicate contact number | Reject a Nigerian phone that canonicalizes to the primary phone | Allow a redundant second field and preference choice | Distinct fields represent distinct contact numbers; equal canonical values make the preference meaningless and can create duplicate contact data. |
| Empty Nigerian home location in review | Omit the diaspora home-location subsection when all three fields are blank; show missing values as “Not provided” if any value is present | Always render an empty subsection or label the entire location “Not provided” | Review remains concise while any partial optional home-location information stays explicit. |
| Existing-member residence | Preserve the matched member's existing profile and residence during Youth Wing enrollment | Overwrite residence with the values entered in the current form | Enrollment is a Youth Wing classification update and must not silently change a member's stored profile. |

## Edge-Case Probe

| Condition | Required handling |
|---|---|
| Middle Name or Gender is blank | Allow review and submission, show “Not provided,” and save `null` for a new record. |
| An existing member submits a different Middle Name or Gender | Preserve the existing profile and use the established phone/first-name/last-name matching rules. |
| Both the PVC/VIN number and APC card number are blank and other required fields are valid | Allow review and submission; show “Not provided” for both values. |
| Only one of the PVC/VIN number and APC card number is provided | Save the provided verification number and leave the other blank. |
| An applicant uploads a PVC or APC document but omits the corresponding number | Keep the upload optional and do not require a number because a file was selected. |
| An existing member adds a Youth Wing classification without entering either number | Preserve the stored verification numbers while applying the existing membership update. |
| Applicant clears the Nigeria default and leaves Country of Residence blank | Block review/submission for a new membership record and prompt for an explicit selection; do not infer a country. |
| Residence is Nigeria | Keep the current required State/LGA/Ward controls, cascading location data, and Nigerian registration-number behavior. |
| Residence is outside Nigeria | Require current City and State/Province; store them separately from any optional Nigerian home State/LGA/Ward. |
| Residence country and calling-code country differ | Accept the valid phone for the selected calling code without changing the residence selection. |
| Input is a valid Nigerian national number beginning with `0` | Parse using Nigeria and present/send its canonical `+234` E.164 form. |
| Input is malformed or invalid for its selected calling country | Keep review/submission blocked and announce an accessible correction message. |
| A new applicant leaves the required primary phone blank or invalid | Block review/submission; an omitted optional Nigerian number does not replace the required primary phone. |
| Diaspora applicant leaves the Nigerian phone blank | Allow review/submission without a preferred-contact choice; omit the Nigerian phone and preference from review; the primary phone is the only contact number. |
| Diaspora applicant supplies a valid Nigerian national number or `+234` number | Normalize it to `+234` E.164, show it in review, and require a preferred-contact choice. |
| Diaspora applicant enters malformed, partial, or non-Nigerian calling-code data in the Nigerian phone field | Block review/submission, keep the value available for correction, clear any prior preference, and show an accessible field-specific error. |
| Applicant supplies the same canonical number as both primary and Nigerian phone | Block review/submission with a field-specific correction message; do not run another lookup from the secondary field. |
| Applicant clears or changes the Nigerian phone after choosing a preference | Clear the previous preference; if a valid number is later entered, require a new choice. |
| Applicant supplies a valid Nigerian number without selecting preferred contact | Block review/submission and associate an accessible required message with the preference group. |
| Applicant chooses the Nigerian number as preferred contact | Show that preference in review; continue using only the primary phone for existing-member lookup. |
| Applicant changes residence from outside Nigeria to Nigeria after entering locations or a Nigerian phone | Clear State/LGA/Ward and current foreign city/state values; hide and exclude the Nigerian phone and preference while Nigeria is selected; retain those contact values only in unsent form state. |
| Applicant changes from one foreign residence country to another | Clear current city/state-province and keep Nigerian home-location values. |
| Diaspora applicant leaves all Nigerian home-location fields blank | Omit the home-location subsection from review; do not display a blank or misleading location. |
| Diaspora applicant supplies only some Nigerian home-location fields | Show the home-location subsection and label each missing value “Not provided.” |
| A verified existing member selects Youth Wing while entering another residence | Preserve the member's stored phone, residence, and ID; submit only the Youth Wing classification change. |
| Existing member has no verified residence | Leave residence country and chapter unknown; do not infer either from the old Nigerian location or ID. |
