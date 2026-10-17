---
parent: high-level-design
prefix: REG-MATCH
---

# Registration Existing-Member Lookup

## Context and Design Philosophy

The public registration page offers APSG, APSG Youth Wing, CWDI, and CWDI Youth Wing as single-select options. A submission belongs to exactly one organization. If an applicant wants to join another organization, they start a separate registration after the current registration is complete. Before review or submission, the page checks whether the entered identity already has a record in the selected organization's registry. The lookup is advisory for exact matches and prevents a phone number linked to a different name from being used to create or update that organization's record.

APSG records are stored in `public.members`; CWDI records are stored in `public.cwdi_members`. One organization's record does not establish membership in the other organization. A matching record is reused by the existing submission path, which also adds Youth Wing status when requested and not already present.

## Registry Lookup

- Resolve the one selected membership through a fixed organization map: APSG maps to `members`; CWDI maps to `cwdi_members`. Never derive a table, RPC, or route from form text, and reject a missing or multiple-organization selection before querying.
- Query only the selected organization's registry. APSG uses `apsg_find_members_by_phone`; CWDI uses `cwdi_find_members_by_phone`. Each RPC accepts one validated E.164 phone value and returns only the selected registry's identity, registration, Youth Wing, and location fields needed for matching and candidate confirmation. The RPC performs phone normalization and comparison on the server. If either lookup RPC is unavailable, fail the lookup and offer retry; do not use a browser table query as a substitute for server-side normalization.
- For candidate verification, use the registry-specific registration-number-and-phone RPC (`apsg_member_login_by_reg_phone` or `cwdi_member_login_by_reg_phone`). Each accepts the verified candidate's registration number and the applicant's validated E.164 phone value, then applies the same server-side phone comparison as its lookup RPC. If either verification RPC is unavailable, fail verification and offer retry. Never call an APSG RPC or query APSG records to resolve a CWDI candidate.
- Send one canonical E.164 phone value to lookup and verification operations, not a browser-generated list of phone candidates. The server validates that value before querying. Normalize stored phone formatting by removing presentation separators while retaining the full country calling code and national number. Match an explicitly international stored number only when its complete E.164 digits equal the submitted value. For a submitted Nigerian `+234` number, also recognize the complete equivalent legacy Nigerian national forms: the same national significant number with its domestic leading `0`, or without that trunk prefix. Do not compare suffixes, truncate to a fixed number of digits, or interpret an unprefixed non-Nigerian number using residence, browser locale, or an assumed country. Apply identical semantics to same-name matching, conflict candidate selection, and registration-number-and-phone verification.
- The CWDI lookup depends on `public.cwdi_members`, `cwdi_find_members_by_phone`, and `cwdi_member_login_by_reg_phone` being provisioned and available through the Supabase API. A missing table or stale API schema cache (including `PGRST205`) is a lookup failure, never a no-match result. The local `sql/cwdi_membership_schema.sql` draft defines the table and organization-specific RPCs but has not been applied; the table and RPCs must be provisioned and visible to the API before CWDI lookup can proceed. Never fall back to APSG's `members` table or RPCs for a CWDI request.
- Compare normalized first and last names using the registration page's existing `textKey` behavior. If any phone match has the same normalized first and last name, treat the newest matching candidate as that organization's existing member. If phone matches exist but none has the same name, report a conflict for that organization.
- Do not query when first name, last name, or a valid phone number is missing. Prompt for the missing name fields when a valid phone is present.
- Never query the other organization's registry during this registration. A prior membership in the other organization does not affect the selected organization's lookup or submission.
- Keep the final submission's selected-registry lookup and duplicate handling as the authoritative last check before insert or Youth Wing update.

## Registration Page Feedback

Show a status message below the phone field for the current identity and single selected membership:

- Checking: identify the selected organization being checked.
- Existing member: identify the organization and explain that the existing record will be reused. If Youth Wing is newly selected, explain that the existing record will receive the Youth Wing classification on submission.
- No match: state that no matching registration was found in the selected organization's registry.
- Name conflict: show a non-identifying status below the phone field and open the candidate-confirmation dialog as soon as the lookup finds the conflict, including when lookup runs on phone-field blur. Show up to three location-ranked matches from the selected registry only. If the applicant confirms a candidate, require registration-number-and-phone verification against that same registry. If the applicant rejects all candidates, show that organization's coordinator-contact step and keep the current registration blocked. After successful verification, pass the verified candidate to the submission flow when the selected membership is that organization's Youth Wing; submission may change only the Youth Wing flag and must preserve the verified member's profile and registration number. For a general-membership selection, production shall exchange the verified candidate with the member session endpoint, which re-verifies registration number and phone and issues the scoped portal credential before navigation; open the portal without prompting for the same details again. If credential issuance fails, keep the candidate and show a retryable portal-entry error. In local preview, preserve the verified read-only portal handoff without a write-capable credential. Never continue as a new membership for the same conflicting phone/name record.
- Lookup failure: explain that the selected registry needs attention and keep the current registration unavailable until lookup succeeds. A CWDI `PGRST205` error must identify the CWDI registry as unavailable; it must not suggest that no matching member exists. A registration for another organization is a separate later journey and is not used to bypass the error.

Use an accessible live status region and text-only rendering. Do not show a matching person's record details or registration number in the status message. Clear or replace the result when the phone, name, or selected membership changes. If the selected membership changes while the candidate dialog is open, close the dialog and discard its candidate and verification state. Reuse an in-flight or completed lookup only while all those inputs remain unchanged.

Run the lookup when a valid phone value leaves the field after first and last name are available, and again before either review or direct submission if the current inputs have not already been checked successfully. The submission handler continues its selected-registry lookup to cover changes made after the precheck.

## Local Preview and Data Access

The local registration preview may perform the same read-only Supabase lookup so the applicant can see the matching status. After registration-number-and-phone verification, a general-membership selection may open that organization's local member portal using the verified candidate session; this is member login, not a completed registration. Local preview continues to block registration inserts, Youth Wing updates, file uploads and issuance of a write-capable portal credential. The local member portal is view-only. A failed read must be shown as a lookup error, never described as “no matching registration.”

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Lookup scope | Query only the one organization selected for the current registration | Search both registries or submit multiple organizations together | One organization context keeps the lookup, conflict path, and result clear; another membership can be requested through a separate registration. |
| Phone identity matching | Send one canonical E.164 value and have the selected registry's RPC compare the complete phone identity, with explicit conversion for legacy Nigerian national formats | Send browser-generated candidate lists, query a public table, or compare the final digits | Full server-side comparison keeps lookup, verification, and registration identity consistent, avoids false matches between international numbers, and prevents a lookup from treating an incomplete fallback read as “no match.” |
| Lookup RPC availability | Require the selected organization's lookup RPC and return a retryable error if it is unavailable | Fall back to a direct browser table query | Direct table filters cannot normalize arbitrary stored formatting consistently or guarantee complete E.164 matching; RPC failure cannot safely establish that no record exists. |
| Duplicate identity feedback | Use the same candidate-confirmation and phone-verification steps for APSG and CWDI, scoped to the selected registry | Give CWDI a generic conflict message without candidate resolution | Matching the established journey keeps both organization flows consistent while keeping candidate records and verification within the selected registry. |
| Name mismatch | Require resolution before new registration; show candidates, verify registration number plus phone against the matched organization's registry, and offer coordinator contact if no candidate is confirmed | Treat the phone alone as a match or create another record | A phone-only match risks attaching an applicant to another person's record; identity verification provides a safe route to the existing account. |
| CWDI registry access | Use CWDI-specific lookup and verification RPCs exclusively; provision the table and RPCs before CWDI lookup | Fall back to direct browser reads of `cwdi_members` or reuse APSG RPCs | Narrow server-side operations preserve record separation and avoid public access to the full CWDI table. |
| CWDI registry availability | Treat `PGRST205` as a CWDI registry failure and block the current CWDI registration until retry succeeds | Treat it as no match or fall back to APSG | An unavailable registry cannot establish that an applicant is new; organization-specific routing keeps the record boundary intact. |
| Lookup failure | Keep the selected registration blocked and show a retryable, organization-specific error | Continue as if the failed registry were empty | A failed check cannot establish that the applicant is unregistered in the selected organization. |
| Registration for another organization | Start a separate journey after the current registration completes | Resolve both organizations in one flow | Separate journeys avoid combining unrelated lookup failures, conflicts, outcomes, and registration numbers on one form. |
| Local behavior | Permit read-only lookup and verified general-member portal access while keeping membership changes and uploads disabled | Skip database access or block all portal access on localhost | Local review needs the actual verified member view; portal access does not create a membership change, and the portal remains view-only in local preview. |
| Production portal handoff | After candidate verification for general membership, exchange the submitted registration number and phone with the member session endpoint, which re-verifies them and issues a scoped credential before opening the portal; do not ask the applicant to re-enter them | Trust browser-side candidate state as write authority or require the same sign-in a second time | Server-side re-verification preserves the existing handoff without relying on browser-controlled flags or adding a duplicate prompt. |

## Edge-Case Probe

| Condition | Required handling |
|---|---|
| The registration page has no selected organization or more than one selected organization | Block lookup and submission until exactly one of the four membership options is selected. |
| Two international phone numbers have the same final 10 digits but different E.164 values | Treat them as different identities; neither lookup nor candidate verification may match by suffix. |
| An existing Nigerian phone is stored as a national number with a leading `0` or as its national significant number without that prefix | Match it only to the equivalent submitted `+234` E.164 value using the explicit Nigerian legacy conversion. |
| A stored international phone includes spaces, parentheses, or hyphens | Remove presentation separators and compare the full country code and national number to the submitted E.164 value. |
| A submitted non-Nigerian E.164 number has the same final digits as a national-format or foreign number in the registry | Do not match the stored number unless its complete explicit international value normalizes to the submitted E.164 value. |
| A caller sends a malformed phone or a list of alternate phone candidates to a lookup or verification RPC | Reject the phone input; each RPC accepts only one valid E.164 value and derives supported legacy equivalences on the server. |
| The selected organization's lookup RPC is unavailable | Show a retryable lookup error and do not use a direct browser table query or report no match. |
| A candidate's registration number is correct but its stored phone does not match the submitted E.164 value under the selected registry's full-number rules | Fail candidate verification and keep the registration blocked. |
| The applicant selects CWDI while already having an APSG record | Query only `cwdi_members`; an APSG record must not affect the current lookup. |
| A valid phone is entered before first and last name | Ask for both name fields and wait to query until the full identity is available. |
| The phone matches a different name in the selected registry | Open that registry's candidate dialog; require registration-number-and-phone verification or keep the current registration blocked and show coordinator contact. |
| The lookup finds an exact name and phone match | Reuse that selected-organization member; explain that a requested Youth Wing classification is added on submit if not already present. |
| The selected registry is absent from the Supabase API schema cache | Show an organization-specific lookup error with retry; do not report no match or query the other organization. |
| The applicant changes their name, phone, or selected membership while a lookup is pending | Ignore the stale result and check the current inputs before review or submission. |
| The applicant changes the selected membership while the candidate dialog is open | Close the dialog, discard its candidate and verification state, and check only the newly selected registry. |
| A record is added after the precheck but before submission | The selected-registry submission check remains the final duplicate check. |
| The page is served from localhost with a valid Supabase client | Run the read-only lookup; keep insert, update, and upload operations blocked. |
| A candidate is verified for general membership from localhost | Open that organization's local member portal in view-only mode without creating or updating a membership row. |
| A candidate is verified for general membership in production | Exchange the registration number and phone through the member session endpoint, let it re-verify the candidate and issue the scoped credential, then open the portal without a second prompt. |
| The member session endpoint cannot issue a credential during a production handoff | Keep the candidate verified in the registration page, show a retryable portal-entry error, and do not open an unauthenticated member session. |
| A CWDI lookup returns `PGRST205` | Identify `cwdi_members` as unavailable and block this CWDI registration until the lookup succeeds. |
| The applicant completes one registration and wants to join the other organization | Start a fresh registration and perform a new lookup only against the newly selected organization's registry. |

## Open Questions & Future Decisions

### Resolved

1. Each registration selects one organization and one membership type; another organization requires a separate registration after completion.
2. CWDI uses its own `cwdi_members` registry and the same candidate-confirmation, registration-number-and-phone verification, and coordinator-contact flow as APSG.
3. `PGRST205` indicates that the CWDI registry is unavailable to the lookup; it cannot be treated as an empty result or redirected to APSG.
4. CWDI lookup and candidate verification use CWDI-specific RPCs and do not use APSG RPCs or records.
5. Successful verification for the selected organization's Youth Wing passes the verified candidate to submission for a Youth Wing-only update; successful verification for a general-membership selection routes to that selected organization's member portal. An unverified candidate cannot trigger either action.

### Deferred

1. The local SQL source files do not define the APSG lookup and candidate-verification RPCs. Before implementation, locate their authoritative migration source or add the organization-specific RPC definitions to a local migration source that follows this contract.
2. Standalone member-portal sign-in and recovery are owned by the member-portal segment and must adopt the same full E.164 and legacy Nigerian matching contract through that segment's own linked-intent review.

## References

- `../../high-level-design.md`
- `../registration/member-portal-design.md` — organization registry identity and separation
- `../registration-submission/registration-submission-design.md` — final duplicate check and canonical E.164 identity
- `../../../sql/phase2_registration_reliability.sql`
- `../../../sql/cwdi_membership_schema.sql`
- `../../../pages/register.html` — registration form, local preview, and selected-registry submission checks
