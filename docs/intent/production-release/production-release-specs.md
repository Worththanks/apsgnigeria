---
parent: production-release-design
prefix: REL
---

# APSG Production Release Requirements

## Source and Review

- [ ] **REL-SRC-001**: When preparing an APSG production release, the release maintainer shall base the release branch on the existing `Worththanks/apsgnigeria` `main` history and shall not replace or force-push the repository history.
- [ ] **REL-SRC-002**: When preparing an APSG production release commit, the release maintainer shall include only reviewed website source, required assets, documentation, relevant tests, and migration files, and shall exclude local databases, member data, debug logs, generated output, and test fixtures containing member data.
- [ ] **REL-SRC-003**: When preparing to push an APSG production release commit, the release maintainer shall scan the candidate commit for private credentials without printing matched values and shall not publish any service-role key, database credential, or access token.
- [ ] **REL-SRC-004**: The APSG production release process shall merge only a reviewed pull request to `main`; if branch protection is unavailable, the release owner shall freeze other writes to `main` through the production link and deploy.

## Database Baseline and Migrations

- [ ] **REL-DB-001**: When beginning an APSG production schema baseline capture, the release maintainer shall verify the Supabase project ref and migration ledger and record the pinned CLI version, diff engine, included schemas, and documented managed-schema exclusions.
- [ ] **REL-DB-002**: When capturing an APSG production schema baseline, the release maintainer shall decline any operation that changes the remote migration ledger and shall review the candidate baseline for the live functions, grants, triggers, and policies in scope.
- [ ] **REL-DB-003**: When replaying an APSG production schema baseline in a clean isolated Supabase environment, the release maintainer shall require successful initialization and an empty canonical schema diff after documented exclusions.
- [ ] **REL-DB-004**: When recording an APSG production baseline as applied, the release maintainer shall first merge the reviewed baseline-only pull request to `main` and record its migration version and merge commit SHA, shall use migration repair only to update tracking, shall not execute baseline DDL against production, and shall verify the resulting ledger and schema.
- [ ] **REL-DB-005**: When preparing APSG production schema, function, or policy changes, the release maintainer shall derive deliberate deltas from the reviewed baseline and use only focused, ordered migration files approved for that release; the maintainer may promote the registration schema and RPC changes specified by the approved registration design, but shall not apply the local SQL bundle wholesale or include destructive or irreversible changes.
- [ ] **REL-DB-006**: When applying an APSG production migration, the release maintainer shall reverify the project ref, migration ledger, and schema against the reviewed state immediately beforehand and shall stop if any unexpected drift is present.
- [ ] **REL-DB-007**: While an APSG production migration is being applied, one named release maintainer shall own the operation and no concurrent dashboard or SQL-editor schema changes shall occur.
- [ ] **REL-DB-008**: The APSG production release process shall preserve existing production records and shall not import local member or test records.
- [ ] **REL-DB-009**: When validating APSG production-data compatibility, the release maintainer shall use aggregate or boolean results that do not expose member details or export production member data.
- [ ] **REL-DB-010**: When preparing to repair the APSG production migration ledger or apply a production migration, the release maintainer shall obtain explicit release-owner approval for the project ref, migration versions, reviewed commit SHA, and recovery reference.

## Security and Compatibility

- [ ] **REL-SEC-001**: The APSG production release process shall derive and review an access matrix for public roles, read-only dashboard users, and authorized APSG/CWDI administrators and staff across `public.members` and `public.cwdi_members`, using existing application role guards and HLD behavior, and shall resolve critical public data-access findings before any production migration or deploy.
- [ ] **REL-SEC-002**: The APSG production release process shall replace the consumers of the previously exposed privileged Supabase credential and rotate or revoke that credential before release; browser code, build configuration, and the published bundle shall contain only the public anon or publishable key.
- [ ] **REL-SEC-003**: When screening APSG public Git history and the deployed bundle for private Supabase credentials, the release maintainer shall not print matched values; if a credential is found, the maintainer shall revoke or rotate it and hold the release, and any public-history rewrite shall require a separate reviewed decision.
- [ ] **REL-SEC-004**: When preparing to apply an APSG production migration, the release maintainer shall verify with non-production data and writes disabled in an isolated environment that the currently deployed site and incoming site remain compatible with the post-migration schema and policies; if compatibility is not established, the migration shall be deferred or redesigned as a coordinated transition.
- [ ] **REL-SEC-005**: While an APSG release preview is available, it shall use a non-production backend or verified read-only mode with every write disabled, and it shall not access production member data or contain a service-role credential; staging write checks shall run separately from a read-only preview.
- [ ] **REL-SEC-006**: The APSG production release process shall verify before release that public roles cannot read sensitive member columns in either registry, each command center remains scoped to its own registry, and authorized Members Control Room operations remain source-routed and subject to the selected registry's reviewed RLS policy.

## Recovery

- [ ] **REL-REC-001**: When preparing an APSG production data dump, the release maintainer shall confirm an approved encrypted storage location, access list, and retention period before creating the dump, and shall keep the dump outside the public repository.
- [ ] **REL-REC-002**: When preparing to apply an APSG production migration, the release maintainer shall verify that an approved pre-change backup or export exists and that restoration has been verified in isolation; any restored production-data copy shall have production-equivalent access controls and shall be securely removed after verification unless separate retention is approved, and the migration shall not proceed without this recovery path.
- [ ] **REL-REC-003**: If an APSG production migration fails, the release maintainer shall determine whether it committed partially before retrying and shall use a reviewed corrective migration unless a verified recovery plan specifies otherwise.
- [ ] **REL-REC-004**: If an APSG website deploy fails after a compatible production migration succeeds, the release process shall retain the compatible database state and shall not automatically reverse the database migration.
- [ ] **REL-REC-005**: If an APSG production smoke check fails after deployment, the release maintainer shall restore the known-good Netlify deploy while retaining compatible database additions unless a separately reviewed recovery decision requires database restoration.

## Netlify Deployment and Verification

- [ ] **REL-NET-001**: The APSG production release process shall make a draft preview of the exact reviewed website commit available before production migration or site connection; when preparing the preview, the release maintainer shall record its commit SHA, publish directory, build command and environment, redirects, route behavior, and backend target and compare its content and behavior with the current production site.
- [ ] **REL-NET-002**: When linking the APSG production Netlify site to `Worththanks/apsgnigeria`, the release owner shall approve the first live deploy and the configured production branch `main` shall point to the exact approved commit; the release maintainer shall protect `main` against unreviewed changes or freeze other writes through link and deploy because linking may publish immediately.
- [ ] **REL-NET-003**: When the first APSG Git-backed Netlify deploy completes, the release maintainer shall verify that the deployed commit SHA matches the approved source SHA and shall halt further release activity if it does not.
- [ ] **REL-NET-004**: When a later APSG production release includes database migrations, the release maintainer shall apply the compatible reviewed migrations as an explicit step before merging the pull request that triggers the production website deploy; a website build shall not automatically apply production migrations.
- [ ] **REL-NET-005**: While performing APSG production smoke verification, the release maintainer shall verify key public pages and read-only access behavior, shall verify the currently deployed registration and recovery behavior remains compatible in an isolated environment, and shall exercise the approved incoming registration and recovery behavior only in staging with synthetic records and outbound notifications suppressed; any production write shall require documented side effects, cleanup, and separate approval.
- [ ] **REL-NET-006**: When recording a completed APSG production release, the release maintainer shall record the project ref, baseline version and commit SHA, applied migration versions and status, Git commit SHA, Netlify deploy ID, security results, and backup or recovery reference without including credentials or member data.
