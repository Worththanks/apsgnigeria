---
parent: high-level-design
prefix: REG-SUBMIT
---

# Organization Registration Submission

## Context and Design Philosophy

The public registration flow creates or updates one full membership in APSG or CWDI per submission. APSG and CWDI keep separate registries and organization-specific registration numbers. A Youth Wing choice is a classification of full membership in the selected organization, not a separate membership record or registration number. New members explicitly select current residence; a Nigerian residence follows the existing Nigerian location and number path, while a residence outside Nigeria is assigned to the Diaspora chapter and receives an organization-specific country-coded number. A Diaspora member may store a distinct Nigerian contact number and the applicant's preferred contact number separately from the primary identity phone.

The flow reuses a matching organization record, preserves its registration number and established profile, and adds the Youth Wing classification when requested. A person may register with another organization through a separate submission after the current registration is complete.

## Scope

This component owns the four-option membership choice, the public registration submission after existing-member lookup, membership creation or Youth Wing update, server-side registration-number allocation, persistence of new-member contact fields, the success receipt, and the action that returns to a fresh registration choice. It ensures one selected membership and one organization registry per submission. Residence and phone-field capture are defined by the registration-fields segment; this component validates and persists the supplied fields for new rows.

The existing-member lookup component owns phone and name lookup, candidate ordering, registration-number-and-phone candidate verification, and conflict handoff. The branding component owns organization logos and membership labels on details, review, and confirmation views. The member portal owns authentication after a verified-conflict handoff. Administrator registration is outside this component.

## Membership Choice and Registry Contract

The page presents four mutually exclusive choices:

| Membership choice | Organization | Registry | New registration-number prefix |
|---|---|---|---|
| APSG | APSG | `public.members` | `APSG/` |
| APSG Youth Wing | APSG | `public.members` | `APSG/` |
| CWDI | CWDI | `public.cwdi_members` | `CWDI/` |
| CWDI Youth Wing | CWDI | `public.cwdi_members` | `CWDI/` |

The selection resolves through a fixed organization map. Never derive a registry, endpoint, or route from applicant-provided text. The form, review, and submission snapshot carry exactly one membership choice. Missing or multiple choices block lookup, review, and submission. One organization’s record or match never establishes membership in the other organization.

## Submission Flow

### Precheck and final check

Before review or submission, require a successful existing-member lookup for the current identity and single selected membership. At submission, repeat the selected registry’s phone-and-name check to cover changes since the precheck. New phone values arrive in canonical E.164 form. The final server-side check compares full canonical E.164 values and recognizes equivalent legacy Nigerian national and `+234` forms; it never matches an international number by its final 10 digits. If the selected registry is unavailable, do not create or update a row and do not query the other organization. If a phone match has a different name and the lookup component has not supplied a verified candidate outcome, stop submission and return the applicant to its conflict flow.

The existing-member lookup is advisory; the final check is authoritative. A record created between precheck and submission must be reused or reported as a conflict rather than duplicated.

### Existing full member

When the selected organization has one or more records with the submitted canonical primary phone, first name, and last name, reuse the newest matching row as defined by the lookup component and preserve its registration number and established profile fields, including residence, primary phone, Nigerian phone, and preferred contact. The submitted Nigerian phone and preference never update an existing row during registration. The existing row must have a valid registration number for that organization. If it does not, stop the Youth Wing update and request coordinator correction; do not issue a second number as part of the upgrade.

- If a general membership is selected, keep the existing Youth Wing flag unchanged.
- If the corresponding Youth Wing is selected and the flag is false, set only that organization record’s Youth Wing flag to true. Do not issue another membership number or replace the existing profile. The success receipt states that the member has joined the selected Youth Wing and displays the existing organization registration number.
- If the Youth Wing flag is already true, make no database change. Show a successful, already-enrolled outcome and the same organization registration number.

For a phone match with a different name, do not create another member row. If the applicant selects the same organization’s Youth Wing and verifies the candidate with that organization’s registration number and phone, pass the verified candidate to this submission component. Update only that candidate’s Youth Wing flag, keep the stored profile, residence, and registration number unchanged, and show the existing organization ID on the success receipt. The existing-member path does not require a new residence selection. If the verified candidate is already in the Youth Wing, make no database change and show the same existing ID. A general-membership selection keeps the lookup component’s organization-specific member-portal handoff after verification.

### New full member

When the selected registry has no phone match, create one full member row in that registry using the submitted details. The selected organization's database operation validates the explicit residence country and required location fields before choosing the registration-number path:

- For `NGA`, preserve the existing Nigerian State/LGA/Ward and registration-number flow. The submitted Nigerian state and LGA codes continue to identify the Nigerian number prefix.
- For any other valid ISO-3166-1 alpha-3 country code, require current residence city and state/province, persist them separately from the optional Nigerian home State/LGA/Ward, and assign the member to the Diaspora chapter. Generate `APSG/DIA/<ISO3>/<year>/<serial>` or `CWDI/DIA/<ISO3>/<year>/<serial>` inside the selected organization's registration transaction.

The RPC validates the country code against server-owned country data, derives the Diaspora chapter and ID, and ignores any browser-supplied chapter, registration number, country segment, or year for this Diaspora path. New E.164 phone, residence country, and applicable residence location are stored on the new row. Nigerian home State/LGA/Ward are stored only in the established Nigerian location columns; they are never used as current foreign residence or as the Diaspora prefix.

For a new non-Nigeria row, store the optional `nigerian_phone_e164` and selected `preferred_contact_type` alongside the primary `phone`. The form's bundled phone utility validates the Nigerian number's country-specific digit pattern and sends its canonical E.164 value. The RPC treats omitted, empty, or whitespace-only secondary and preference values as `null`; it rejects a partial pair. The RPC also enforces E.164 syntax, the `+234` calling code, difference from the primary phone, and a preference value of `primary` or `nigerian` when the secondary number is present. With no secondary number, both fields are `null` and the primary phone is the effective contact. A new Nigeria resident must submit `null` for both diaspora-only fields. The RPC does not use the secondary value for lookup, conflict detection, authentication, recovery, idempotency, or registration-number generation.

For a Youth Wing choice, set the Youth Wing flag to true on the new full-member row. The receipt identifies the person as a full member of the selected organization and a member of its Youth Wing, and displays the newly issued organization registration number. A general membership creates the row with the Youth Wing flag false. Existing-row paths in this registration operation never recalculate or rewrite an issued registration number; an authorized residence update in another component must preserve the same invariant.

New member rows store the submitted Middle Name in `middle_name` and Gender in `sex`; both are nullable text fields in APSG and CWDI. Blank values are stored as `null`. These fields do not alter the phone, first-name, and last-name matching rules, and reusing an existing record preserves its stored personal details.

If a phone match appears under a different normalized name at the final check, do not insert or update. Return the applicant to the lookup component’s conflict-resolution flow.

When a primary-phone match routes to an existing-member path, ignore any new Nigerian phone or preferred-contact values in the submission snapshot. A Youth Wing update changes only the selected organization's classification flag; an already-enrolled outcome makes no database change. The receipt uses the stored member profile and states that the existing profile and contact details were not changed by this enrollment.

## Registry Write Paths

APSG uses `apsg_register_member` for its final check, Youth Wing update, and new membership creation in `public.members`. CWDI uses `cwdi_register_member` in its independent registry. Each operation validates the canonical E.164 input, serializes the selected organization's full-phone match for the transaction, normalizes names before comparison, and returns the registration number from the saved row. It does not derive international identity from the final 10 digits.

The registration RPC response is limited to `status` and `reg_number`. Successful statuses are `registered`, `youth-wing-added`, `already-youth-member`, and `already-member`; the phone-match/different-name outcome is `conflict` without a registration number. Invalid fields, invalid organization data, and unavailable registry operations return an RPC error rather than a success-shaped result. The client uses the returned registration number and submitted primary phone with the existing phone-and-registration-number-verified member read when it needs stored profile details for an existing-member receipt or upload reconciliation. The registration RPC never returns a raw member row, and the client does not read the saved row through a broad table query to build the receipt.

For a Diaspora member, validate the selected ISO-3166-1 alpha-3 country against a server-owned country-code table. Add nullable `residence_country_code char(3)`, `residence_city text`, and `residence_state_province text` columns to both registries. Add nullable `nigerian_phone_e164 text` and `preferred_contact_type text` columns to both registries. A stored secondary phone uses canonical E.164 syntax with the Nigeria `+234` calling code, differs from the primary `phone`, and requires a `preferred_contact_type` of `primary` or `nigerian`; if the secondary phone is absent, its preference is `null`. Add table checks for E.164 syntax, the `+234` prefix, distinction from the primary phone, and the pairing of the optional value with its preference. The registration RPC also validates the new-member values before allocating a registration number. For a new `NGA` residence, the RPC requires both diaspora-only fields to be `null`. These constraints do not rewrite existing rows or block later authorized residence changes; the member portal and admin registry own their behavior for saved contact data when residence changes.

Do not backfill new contact fields or residence fields from legacy data; a legacy row without verified current residence or a verified secondary number remains unknown. Keep the existing State/LGA/Ward columns for Nigerian geography. The migration seeds the server-owned country-code table from the same versioned country data used by the local form metadata. It creates separate `apsg_diaspora_registration_counters` and `cwdi_diaspora_registration_counters` tables keyed by residence ISO3 and server-selected year, with a last-allocated serial. Each counter is private to its organization's SECURITY DEFINER registration operation; the country directory and counter tables grant no direct access to `anon` or `authenticated`. The counter increment and member insert run in the same transaction. APSG and CWDI can issue the same numeric serial independently because their prefixes and counters are separate.

For Diaspora IDs, use the database's Africa/Lagos calendar year and preserve the existing six-digit minimum serial width, allowing the serial to grow beyond six digits without truncation. Do not take chapter, ISO3, year, or registration number from the browser for this path. The existing Nigerian registration-number flow and prefix remain unchanged.

CWDI uses a CWDI-specific server-side submission operation for its final check, registration-number allocation, existing-row Youth Wing update, and new-row creation in `public.cwdi_members`. The operation accepts the one selected CWDI membership and submitted fields, enforces the same residence, primary-phone identity, Nigerian-contact, and Youth Wing rules as APSG, and returns only the outcome and CWDI registration number needed for the receipt. Do not grant public browser access to broad CWDI member-table reads or writes to support registration. The CWDI table and operation must be provisioned and available before CWDI submissions can succeed; a missing table or operation is an error, not a no-match result.

Keep the migration sequence explicit: `phase2_registration_reliability.sql`, `cwdi_membership_schema.sql`, and `registration_personal_details.sql` provide the base registry and legacy write operations; apply `diaspora_membership_flow.sql` after them to add residence and Nigerian-contact columns and replace the public registration operations with their final definitions. Before promoting these candidates, verify each prerequisite against the reviewed production baseline and replay the ordered chain in an isolated Supabase environment. Apply `member_portal_self_service.sql` before `member_residence_update.sql` only when the member self-service feature is in the release scope. The migrations run in transactions, so missing base tables or operations abort without partial changes. Do not apply an earlier Nigeria-only RPC source after the active Diaspora migration. Production application remains a separate, explicit release step gated by baseline, recovery, security and compatibility review. Changes to read-only lookup and sign-in phone matching are owned by their linked segments; the new secondary number does not become a lookup or sign-in key.

Both write paths must be idempotent for retries: repeat submission must find the existing organization row and must not issue a duplicate registration number or second membership row. Registration numbers belong to the organization record and do not change when Youth Wing status changes.

The browser checks the current E.164 phone and name before uploading. Existing matching members skip selected files and retain their established profile and residence. New registrations validate JPG/PNG/PDF files against a 5 MB limit, then retain the paths and signatures of files created by the current registration attempt. The upload-retry identity key uses the full canonical phone and selected organization, not the last 10 digits. Definite upload/write failures remove only unattached attempt files. An uncertain write response triggers a selected-registry lookup and credential verification before cleanup; referenced files are kept, and unresolved files remain available for reuse or cleanup on retry in the same open registration. Cleanup failures retain the attempt paths for another retry. Automatic cleanup after a browser is closed is outside this static site's capabilities.

Only one submission may run at once. The form and review controls are locked while the snapshotted membership, fields, and file objects are processed. A receipt for an existing member uses the stored profile, primary phone, Nigerian phone, and preferred contact. Closing the receipt through Done clears the next registration form.

## Success Receipt and Next Registration

After the one selected membership completes, show one organization identity, the exact selected membership label, one registration number, and a clear outcome. For an existing member newly added to the Youth Wing, say the Youth Wing was added and show the existing organization ID. For a new Youth Wing member, state that the person is a full organization member and a Youth Wing member, with the newly issued organization ID. If the person was already in the Youth Wing, report that without changing the ID.

The receipt remains visible until the applicant chooses **Done**. Done returns to a fresh membership choice with the previous form values and selection cleared. The applicant may then begin another separate registration. A successful registration does not automatically redirect to the member portal. A verified name-conflict candidate requesting the same organization’s Youth Wing completes that Youth Wing update and receives the existing ID; a verified candidate requesting general membership follows the member-portal handoff owned by the lookup flow.

## Uploads and Failure Handling

Treat PVC and APC card uploads as optional inputs for the single selected membership. Perform the final registry check before uploading files. If an existing member is reused or upgraded to the Youth Wing, skip new uploads because that operation preserves the established profile and changes only the Youth Wing flag when needed. If a new member row will be created, upload selected files before insertion and attach their paths to that row. If a selected upload fails, do not insert the new member row.

If a selected upload or registry write fails, do not show a successful registration receipt or clear the applicant’s form. Keep a retry path and rerun the selected registry’s final check before retrying. A retry must reuse a row created by an earlier attempt rather than issue another registration number. If a write succeeded but the response was lost, the next final check returns the existing result and its existing ID.

## Local Preview

Local registration preview may run the existing-member lookup and display review information. It must not upload files, allocate a registration number, insert or update a registry row, or perform a member-portal handoff as if submission had succeeded. A separately verified existing member may open the organization-specific member portal in view-only mode.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Memberships per submission | Accept exactly one of the four membership choices | Process APSG and CWDI together or allow multiple choices | One organization context keeps lookup, errors, results, and registration numbers clear; another organization can be selected after completion. |
| Youth Wing model | Store Youth Wing status on the full member row in the selected organization registry | Create a second Youth Wing row or issue a separate Youth Wing ID | A Youth Wing member is also a full APSG or CWDI member, and changing that status must preserve the organization’s existing ID. |
| Existing matching member | Reuse the exact-match row; set only its Youth Wing flag when requested | Replace its submitted profile or create a second row | Reuse preserves identity, profile continuity, and the already issued organization registration number. |
| New Youth Wing applicant | Create a full member row with Youth Wing status true and the selected organization's residence-based ID | Create a Youth Wing-only record or defer full membership | Youth Wing registration confers full membership in the selected organization. |
| Residence-to-registration path | Validate explicit residence in the selected organization's RPC; retain the Nigerian path for `NGA` and assign other valid country codes to Diaspora | Infer a chapter from phone/location data or let the browser choose a registration prefix | Current residence is user-declared, and the organization server must own Diaspora assignment and identifiers. |
| Diaspora number allocation | Use separate APSG and CWDI country/year counters inside each organization's registration transaction | Share counters or scan all member IDs by prefix | Independent counters preserve the two registries and provide atomic allocation under concurrent requests. |
| Diaspora serial convention | Use the Africa/Lagos server year and the existing six-digit minimum serial width | Accept browser year or use variable-width serials from the first number | Server time prevents client-controlled year segments; the established width keeps new IDs consistent with current IDs. |
| Legacy residence | Add nullable current-residence fields without backfilling historical rows | Guess current country from Nigerian location, phone or ID | Existing rows without verified residence remain unknown and retain their issued ID. |
| Submission phone identity | Compare canonical E.164 values, with an explicit conversion for recognized legacy Nigerian formats | Compare raw strings or their final 10 digits | Full canonical values prevent collisions between international numbers while retaining Nigerian legacy matches. |
| Secondary contact representation | Store `nigerian_phone_e164` and `preferred_contact_type` as separate nullable columns in each organization registry | Overload the primary `phone` field or store an unstructured contact JSON object | A separate E.164 value preserves the primary phone's existing identity role and supports direct profile display; a constrained preference value has stable meaning if a phone is later edited. |
| Missing secondary contact | Store `null` for both secondary phone and preference; the primary is the only available contact | Store an empty string or a default preference for an absent number | `null` distinguishes the absence of a second contact from an explicit preference choice and avoids an invalid preference without a second number. |
| Secondary contact uniqueness | Do not make the secondary number globally unique or searchable for identity; require only that it differ from the same member's primary phone | Add a unique constraint or use the secondary number as another match key | A contact number may be shared across members and must not alter the established primary-phone identity model. |
| Existing-member contact update | Preserve the existing primary phone, Nigerian phone, and preferred contact during enrollment; only change Youth Wing classification when applicable | Apply submitted phone details to an existing member during Youth Wing enrollment | Registration's existing-member path is classification-only and must not silently edit a member profile. |
| CWDI mutation access | Use a narrow CWDI-specific server-side submission operation | Grant broad public browser table access | The CWDI schema requires secure server-side access; organization-specific writes preserve the registry boundary. |
| Post-success continuation | Show a success receipt; Done clears the form and returns to membership choice | Automatically redirect to a member portal | The applicant should see and retain the issued or existing ID, then can start a separate registration explicitly. |

## Edge-Case Probe

| Condition | Required handling |
|---|---|
| No membership choice or multiple choices are present | Block lookup, review, and submission until exactly one choice is selected. |
| An existing exact-match member selects their organization’s Youth Wing and is not yet classified | Set only the Youth Wing flag, keep all existing profile values and registration number, and show success with that ID. |
| An existing exact-match member already has the Youth Wing flag | Make no update and show an already-enrolled outcome with the existing ID. |
| An existing member submits Youth Wing enrollment without selecting residence or enters different location values | Ignore submitted location values; update only the selected organization's Youth Wing classification and preserve the stored residence and registration number. |
| The newest exact-match member record has no valid organization registration number | Do not issue a second number or complete the Youth Wing update; show a retryable data-correction error for coordinator assistance. |
| A new applicant selects APSG Youth Wing or CWDI Youth Wing | Create one full member row in the selected organization with Youth Wing status true and the registration number determined by the explicitly selected residence. |
| A new applicant selects `NGA` residence | Preserve the Nigerian State/LGA/Ward controls and existing organization-specific registration-number format. |
| A new applicant selects a supported non-Nigeria residence | Require current city and state/province, keep Nigerian home geography separate and optional, and generate the selected organization's `/DIA/<ISO3>/<year>/<serial>` ID server-side. |
| A new Diaspora applicant supplies a Nigerian phone and preferred-contact choice | Persist the canonical secondary E.164 number and the selected `primary` or `nigerian` preference on the new row in the selected organization registry. |
| A new Diaspora applicant omits the optional Nigerian phone | Store `null` for `nigerian_phone_e164` and `preferred_contact_type`; the primary phone is the only available contact. |
| A new, unmatched Nigerian resident supplies diaspora-only contact fields directly to the registration RPC | Reject the request before allocation or insertion; Nigerian residents use only the primary phone field. If the final check finds an existing member, ignore submitted diaspora-only values and preserve the stored profile under the existing-member rule. |
| A new-member request supplies a secondary number without a valid preference, an unsupported preference, or a preference without a secondary number | Reject the request before insertion and do not allocate a registration number. |
| A secondary Nigerian number is malformed, lacks the `+234` calling code, or equals the primary phone | Reject the request before insertion and do not allocate a registration number. |
| An existing-member or Youth Wing request contains a different Nigerian phone or preferred-contact value | Ignore the submitted contact values and preserve the stored profile; update only Youth Wing classification when applicable. |
| Two concurrent requests use the same selected organization, primary phone, and names but different secondary-contact values | Reuse the one member row created by the winning transaction; do not create a second row or overwrite its stored contact values on retry. |
| The optional Nigerian number changes while registration files are pending retry | Keep the existing retry identity based on selected organization and primary E.164 phone; the secondary number does not create a separate upload batch or identity. |
| A new applicant omits residence country, submits an unsupported country code, or omits required foreign city/state-province | Reject the registration before insert or number allocation; do not infer a country or fall back to Nigeria. |
| A caller supplies a forged Diaspora chapter, year, ISO3 prefix or registration number | Ignore/reject those values and derive the identifier from validated residence and server time. |
| An existing row has no verified current residence | Leave its residence country and chapter unknown; do not backfill from Nigerian location, phone or ID. |
| Two new registrations for the same organization, country and year allocate simultaneously | Serialize through that organization's country/year counter and return distinct IDs; the other organization uses its own counter. |
| A Diaspora member's insert fails after a counter increment | Roll back the counter increment and member insert in the same transaction. |
| A Diaspora serial reaches six digits and exceeds `999999` | Preserve the full serial without truncation; do not issue a duplicate or malformed ID. |
| Two international numbers share the same final 10 digits | Treat them as distinct E.164 identities in the final check and upload-retry key. |
| A new member registers with a valid E.164 phone equivalent to a legacy Nigerian national or `+234` value | Reuse/conflict-check the existing Nigerian row through its canonical Nigeria equivalent; do not create a duplicate. |
| A new residence or chapter is later saved for an existing member | Preserve the existing registration number; do not recalculate the ID from the updated residence. |
| The applicant has a record in the other organization but none in the selected registry | Process only the selected organization; a later registration can create the other organization’s independent record. |
| The final check finds a different-name phone match without a verified candidate | Do not insert or update; return to the organization-specific candidate-confirmation flow. |
| The candidate is verified with a registration-number-and-phone check and the applicant selected the same organization’s Youth Wing | Update only the verified row’s Youth Wing flag, preserve the stored profile and organization ID, and show that ID on the success receipt. |
| The verified candidate already has the Youth Wing flag | Make no database change and show successful Youth Wing membership with the existing organization ID. |
| The candidate is verified with a registration-number-and-phone check and the applicant selected general membership | Follow the selected organization’s member-portal handoff; do not create or alter a membership row. |
| The selected registry or CWDI write operation is unavailable | Keep the current registration pending with a retryable error; do not report no match, submit elsewhere, or show success. |
| The applicant changes membership while lookup is pending | Discard stale lookup and verification state; require a new lookup for the one current selection. |
| The form is reset after successful submission | Preserve the completed result and ID on the receipt; only clear the next registration form after Done. |
| The applicant selects Done after success | Return to the choice screen with a fresh form so another membership can be registered separately. |
| Local preview is used | Keep lookup read-only and disable upload, number allocation, writes, and successful-submission portal handoff; allow a verified existing-member login to the view-only portal. |

## Open Questions & Future Decisions

### Deferred

1. A background service can reconcile temporary uploads after an applicant closes the browser during an unresolved network failure. The browser keeps uncertain files and never deletes documents that may be attached to a saved member.

## References

- `../../high-level-design.md`
- `../registration-form-fields/registration-form-fields-design.md`
- `../registration-member-lookup/registration-member-lookup-design.md`
- `../registration-organization-branding/registration-organization-branding-design.md`
- `../registration/member-portal-design.md`
- `../../../sql/cwdi_membership_schema.sql`
- `../../../sql/phase2_registration_reliability.sql`
- `../../../sql/registration_personal_details.sql`
- `../../../pages/register.html`
