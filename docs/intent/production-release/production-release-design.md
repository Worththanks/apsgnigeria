---
parent: high-level-design
prefix: REL
---

# Low-Level Design: APSG Production Release

## Context and Design Philosophy

The public website, its Supabase schema and functions, and the Netlify production site must be released as a compatible, traceable change. The production project already contains live member and organization data, while its migration history is not tracked. The GitHub source exists independently from the current Netlify site, and the local workspace is not based on the remote Git history.

Treat production as the source of truth for current schema and records. Reconcile the local workspace with the existing repository before preparing a release. Establish a reviewed migration baseline before applying new database changes. Keep the production database apply step explicit and separate from a static website build. Do not copy local member records into production.

## Scope

This component defines the release path for `Worththanks/apsgnigeria`, the Supabase production project `hamjvcaacrctnmbkwlag`, and the Netlify production site for `apsgnigeria.org`. It covers repository reconciliation, the production schema baseline, reviewed schema/function/policy migrations, security and recovery gates, Netlify connection and deployment, and release records.

It does not define the business behavior of individual registration, member portal, dashboard, or content features. It does not migrate local member records, replace production records, merge APSG and CWDI registries, move hosting providers, or automatically apply production database migrations on every Git push.

## Current State and Constraints

| Surface | Observed state | Design consequence |
|---|---|---|
| Workspace | Local `master` has no commits or configured remote; site, test, release, and temporary directories are untracked. | Preserve the current work, fetch the remote history, and compare candidate source trees before creating a release branch. Never force-push this workspace over `main` or stage the whole workspace blindly. |
| GitHub | Public repository `Worththanks/apsgnigeria` exists; `main` has 27 commits, includes `sql/apsg_production_schema_recommendations.sql`, has no `supabase/migrations` directory, and is unprotected. | Use the existing `main` history as the starting point. Prepare an explicit reviewed commit and migration directory; do not replace repository history. |
| Supabase | Project `hamjvcaacrctnmbkwlag` is on the `main` PRODUCTION branch. Dashboard shows no migration history, no branches, and no backup. Advisor reports critical public data-access findings, including RLS disabled on `public.members`. | Inspect production schema and migration metadata before deriving a baseline. A database recovery path and security review are prerequisites to applying production changes. |
| Staging Supabase | A separate staging project `cmsofpxhfdulbnpfsqzw` exists and has no registration schema or tables yet. | Use it only after the migration chain is reviewed and its isolated staging configuration is confirmed; keep synthetic validation separate from production. |
| Local SQL | `local-build/apsg_v10.1/sql` contains seven independently maintained scripts. Some overlap and replace RPCs; `phase2_registration_reliability.sql` says to precede `diaspora_membership_flow.sql`, which in turn says not to reapply the legacy RPC source afterward. | Do not concatenate or apply the scripts as a bundle. Identify which definitions already exist and select only reviewed deltas against the production baseline. |
| Registration source | The local registration page adds residence-country, international-phone and optional Nigerian-contact fields, and depends on separate presentation/submission scripts and bundled phone metadata. Its submission behavior depends on organization-specific RPCs and country/counter tables. | Promote the complete reviewed page dependency set and ordered SQL candidates; do not publish the page without a compatible staging schema and RPCs. |
| Netlify | The production project exists and is not linked to GitHub. The current published site was deployed separately from the repository. | Review the exact first Git deploy against the live site and production database before linking. Linking enables continuous deployment; pushes to the configured production branch can publish to the primary domain. |
| Tooling | The workspace does not have the Supabase CLI or Docker available. The Supabase project has no preview branches. | Select and provision an isolated migration-validation environment before executing migrations; local PGlite alone is not treated as equivalent to a Supabase stack. |

The previously exposed privileged Supabase credential has been removed from browser code, but the project release notes require rotating it before deployment. Browser code may contain only the public anon/publishable credential; service-role and database credentials must remain out of the public repository and static bundle.

## Source Reconciliation

The existing GitHub repository is the release source. Start from its current `main` history and preserve the local uncommitted workspace separately while comparing it with the candidate site trees. Select only the reviewed website source, required assets, docs, and migration files. Exclude local databases, debug logs, generated artifacts, test fixtures containing member data, and unrelated directories.

Prepare release changes on a branch based on remote `main`. Push that branch and review a pull request before merging. A production release must never replace the existing GitHub history with a newly initialized local history. No service-role key, database password, access token, or other private credential may enter Git history.

## Database Baseline and Migration Contract

1. Before connecting a CLI, verify the production project ref and inspect its migration ledger. Record the exact Supabase CLI version, diff engine, schemas included, extensions, and managed-schema objects/customizations needed by the application. Stop if the ledger contains unexpected versions or the project ref is not the confirmed production project.
2. Pull the live schema into a candidate baseline without accepting any prompt that changes the remote migration ledger. Review the generated SQL and document every excluded object/schema. The baseline must describe production as it exists, including relevant functions, grants, triggers and policies; compare it with Advisor findings and tracked/local SQL candidates.
3. Replay the candidate baseline into a clean isolated Supabase environment using the pinned tooling and schema scope. Confirm initialization succeeds and a canonical schema diff is empty after replay, accounting for documented managed-schema exclusions. If it fails or leaves unexplained drift, revise the baseline; do not mark it applied remotely.
4. After baseline review and replay pass, merge the reviewed baseline-only pull request to GitHub `main` and record its exact version, merge commit SHA, and migration version in the release record. Only then record it as already applied with the exact migration version using `supabase migration repair --status applied <version>`. This command repairs migration tracking only; it must not execute baseline DDL. Verify the migration list and remote schema afterward. If the baseline is not present on `main`, do not repair the production ledger.
5. Create subsequent migration files only for deliberate differences approved for the release. Keep files ordered and focused. Review table rewrites, constraints, function replacements, grants, policies and data updates individually. Preserve production rows and avoid destructive or irreversible changes in this release.
6. Validate migrations against the baseline in an isolated environment without production member data. Check production data compatibility using aggregate or boolean queries that do not expose member details. Immediately before production apply, recheck project ref, migration ledger and schema drift against the reviewed state. Stop on any unexpected change. One named maintainer owns the apply, with no concurrent dashboard or SQL-editor changes.
7. Once the baseline is established, make future remote schema changes through reviewed migration files. Dashboard edits are not a parallel schema-change path; record and reconcile any unavoidable emergency edit before another release.

The baseline and migration files are part of the GitHub source. Before any data-bearing dump is created, approve its encrypted storage location, access list and retention because it contains member data. The release recovery gate requires an available pre-change database backup/export, a recorded artifact type and timestamp, and a restore procedure verified in an isolated environment. Any restored copy of production data must receive production-equivalent access controls, remain outside the public repository, and be securely removed after restore verification unless a separate retention decision authorizes keeping it. Database dumps do not include Supabase Storage objects; include a separate storage recovery plan only if the release changes storage data or configuration. Prefer forward-compatible repair over restoring the whole database after new member writes have arrived.

## Security and Compatibility Gates

- Resolve the critical public data-access findings that affect member records before the first production release.
- Derive and review an access matrix for `public.members` and `public.cwdi_members` from the existing application role guards and documented HLD behavior. Public roles cannot read sensitive member columns; each command center remains scoped to its own registry; authorized shared Members Control Room operations remain source-routed and subject to the selected registry's RLS policies.
- Verify RLS is enabled where member or administrative data requires it; review each relevant policy, role grant, view, and `SECURITY DEFINER` function against that access matrix.
- Inventory the previously exposed credential by type and consumer without printing its value. Replace all required consumers, then rotate/revoke it before release. The static website uses only the public anon/publishable key. Scan the candidate commit, relevant public Git history and deployed bundle for credentials without emitting matched values. If a private credential is present in public history, revoke it before any release; any history rewrite is a separate reviewed decision.
- Confirm no private key or database credential is present in the selected Git commit, Netlify build configuration for a static build, or published bundle.
- Prove that the currently deployed site still works against the post-migration schema and policies in an isolated environment with non-production data and writes disabled. Prefer additive schema/function transitions. Do not remove an RPC, column, or policy that the currently deployed site still needs. If compatibility cannot be proved, design a coordinated two-step cutover that keeps the old site working until the new site is live; otherwise defer production application.
- The registration product behavior is owned by the registration, field, lookup, branding and submission designs. Verify the currently deployed flow against the proposed schema in an isolated environment, then exercise the incoming registration write paths against staging with synthetic records and outbound notifications suppressed. Do not create production registrations or modify production member/admin state during smoke checks.
- If a migration cannot preserve compatibility or the recovery path is unavailable, defer the production release rather than apply a one-step cutover.

## Netlify Connection and Release Order

Netlify's production branch is `main`. A pull request may create a deploy preview after the site is linked, and a push or merge to `main` can trigger a production deploy and replace the site at its primary domain. Linking the current site may start a production build immediately. Therefore, do not link the production site as setup: the link and initial build are the final live release event and require all preceding gates plus final owner approval. Before that event, prepare a draft preview from the exact reviewed commit using a non-production Netlify site or an equivalent non-production deploy context. A read-only visual preview may have all writes disabled; registration and recovery write checks run separately against the staging backend with synthetic records and outbound notifications suppressed. No preview or staging check may read or write production member data, and no preview may contain a service-role credential.

Release sequence:

1. Reconcile the local workspace to GitHub `main` and create the reviewed release branch.
2. Capture and review the production schema baseline; establish the migration ledger without replaying baseline DDL.
3. Prepare the approved schema/function/policy deltas and validate them in an isolated environment. Confirm live-data compatibility without exporting member details.
4. Complete the security and recovery gates, including privileged-key rotation readiness and the reviewed RLS/access posture.
5. Produce a draft preview of the exact reviewed website commit. Record the commit SHA, publish directory, build command/environment, redirects, route behavior and backend target. Compare it with the current production site. Verify staging/read-only behavior and public-key-only configuration.
6. Rehearse the approved migration and verify the current deployed site against its post-migration schema/policies in the isolated environment. Resolve any incompatibility before production.
7. Complete all database, security, credential, recovery, source-review and Netlify configuration gates. Confirm the exact production branch and publish settings. Before linking, put the reviewed release commit at the configured production branch, verify its SHA and protect the branch against unreviewed changes. If branch protection cannot be enabled, freeze all other writes to the branch through linking and deploy. The connection is made only after the owner explicitly approves the first live deploy; because linking may publish immediately, the target branch must already point to the approved commit. Verify the resulting Netlify deploy's commit SHA immediately after publishing and stop further releases if it differs.
8. After final approval, the named maintainer rechecks production ref, history and drift, then applies only the reviewed backward-compatible migration as a deliberate recorded step. Connect the existing Netlify project to the reviewed GitHub repository/`main` and permit the first production deploy of that exact source/database combination. For later releases, apply compatible database migrations before merging the reviewed pull request that triggers the production site deploy.
9. Verify key public pages and read-only production behavior. Exercise the existing deployed registration and recovery paths for post-migration compatibility in isolation, and exercise the incoming registration path against staging with synthetic records and outbound notifications suppressed. Do not create production registrations, trigger recovery emails, or modify production member/admin state during smoke checks. Record the Git commit SHA, migration versions and status, Netlify deploy ID, security gate result, and backup/recovery reference. If smoke verification fails, restore the known-good Netlify deploy while retaining compatible schema additions.

The static site root is selected from the reconciled repository and published without local build, test, database, or release artifacts. Netlify must retain the existing route/redirect behavior. Deploy previews must not introduce a private credential, use production member data, or use a production service-role credential.

## Failure and Recovery

- **Source comparison fails:** keep the remote `main` history and local files untouched; resolve the intended source tree before pushing.
- **Baseline capture or review fails:** do not create or repair production migration history; capture diagnostics without modifying the project and resolve schema coverage first.
- **Baseline replay differs:** do not mark the baseline applied; document unexplained schema differences and revise/review the baseline.
- **Production drift appears before apply:** stop; reconcile the new state and re-review migration order before resuming.
- **Private credential is found in public history:** revoke/rotate it immediately and hold release; evaluate any public-history rewrite as a separate decision.
- **Backup cannot be stored or restored safely:** hold all production changes until an approved recovery path is available.
- **First Netlify link would auto-publish before approval:** do not link the production site; prepare an isolated draft deploy and make the connection part of the final live release.
- **Validation or security gate fails:** do not apply the production migration or connect Netlify to a commit that depends on it.
- **Migration fails:** stop the release, record the failing migration/version, and determine whether it committed partially before retrying. Do not assume every SQL file rolls back atomically. Use a reviewed corrective migration unless a verified recovery plan directs otherwise.
- **Migration succeeds but site deploy fails:** retain the compatible database state and retry or fix the website deploy. Do not automatically revert database changes.
- **Site deploy succeeds but smoke verification fails:** restore the known-good Netlify deploy while retaining compatible database additions; use a forward fix for schema changes unless a reviewed recovery decision requires restoration.

## Release Record

Keep a concise release record with the production project ref, reviewed GitHub commit, migration versions and application status, Netlify deploy ID, security checks, and backup/recovery reference. Do not include database credentials, API secrets, or member data in the record.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Source history | Reconcile to the existing GitHub `main` history and release through a reviewed branch/PR. | Initialize a fresh Git history from the workspace; push directly to `main`. | The remote repo is public and already has a maintained history. Preserving it avoids losing existing releases and provides a commit to review. |
| Production schema baseline | Capture and review the actual production schema, then record it as an applied baseline without replaying its DDL. | Treat the local SQL bundle as the source of truth; replay all candidate scripts against production. | Production has live records and no visible migration history. A generated baseline separates existing state from deliberate future changes. |
| Migration application | Keep database application explicit and separate from Netlify builds. | Run production migrations automatically on every website push; continue dashboard-only SQL edits. | A static website push must not unexpectedly alter production schema, and manual SQL without committed migration files would recreate drift. |
| Initial Netlify link | Link only after reviewing the exact first production commit and database compatibility. | Link immediately and inspect the resulting site afterward; continue unrelated upload deploys indefinitely. | Linking enables production deployments from Git pushes, so the initial branch build must be treated as a live release. |
| Release data | Preserve all current production rows and import no local member records. | Seed production from local development records or replace production data with a local snapshot. | Existing production member records remain authoritative; the release changes schema/functions/policies only. |
| Registration feature promotion | Promote the complete reviewed registration page, required assets, behavior specifications and focused database migration candidates as one source change; apply database changes only after baseline, recovery, security and staging gates pass. | Publish the page without its RPC/schema dependencies; apply the local SQL bundle wholesale. | The page and selected-organization write contract must agree, while production schema changes require deliberate deltas from the verified baseline and must preserve existing records. |
| Migration validation | Use an isolated Supabase-capable environment without production member data. | Validate only in PGlite or run the migration first against production. | Supabase-managed behavior, policies, functions, and extensions need validation outside production; the current workspace has neither Supabase CLI nor Docker configured. |
| Baseline ledger repair | Review and replay the baseline first, then use migration repair to record that exact version as applied without executing its SQL. | Let baseline capture change history before review or run baseline DDL against production. | The ledger must match the live schema while ensuring baseline DDL is not replayed. |
| Baseline source order | Merge the reviewed baseline-only pull request to `main` before repairing production migration history. | Repair the ledger while the baseline exists only on a local or feature branch. | Production history must refer to a migration version present in the shared source of truth. |
| First Netlify connection | Treat linking the existing production site as the first live deploy and wait until the final release gate. | Link early to enable previews and inspect the live result afterward. | Linking may trigger a production build and replace the primary site. |
| Preview isolation | Use a non-production site/backend or a verified read-only preview with writes disabled. | Point an unreviewed preview at production with ordinary credentials. | Preview code must not expose or modify production member data. |
| Registry authorization | Preserve documented role behavior and organization boundaries while restricting public access to sensitive columns; keep shared admin operations source-routed under each registry's RLS. | Apply a blanket deny or broad shared grant to both registries. | Dashboard and Members Control Room requirements depend on session RLS and source ownership across both registries. |
| Registration and recovery coverage | Use the registration and portal leaf designs for product behavior; verify the current live flow remains compatible and run the new flow only against synthetic staging data with outbound notifications suppressed. | Treat a production deploy as proof of database behavior or use production member writes for smoke checks. | Product behavior belongs to its feature segments; release checks establish compatibility without exposing or changing production member records. |
| Recovery artifact | Store an encrypted, access-controlled backup/export outside Git and verify restoration in isolation before production changes. | Assume a visible backup setting or successful export is enough evidence. | Current production backup visibility is empty; the release needs a usable and approved recovery path. |

## Edge-Case Probe Incorporated

The independent LLD review identified these release-blocking cases; each is now represented as a gate or failure path above:

- Schema pull or baseline bookkeeping could change production migration metadata before review.
- Production migration history could reference a baseline that has not yet been committed to the shared release branch.
- A generated baseline may omit managed-schema customizations or fail to replay cleanly in a fresh environment.
- Netlify linking can trigger an immediate live build, and a database-first migration can break the currently deployed site.
- An immediate first build could publish an unexpected commit unless the branch is verified and protected/frozen before linking, then checked against the deployed SHA.
- A draft preview could accidentally use production credentials/data or write to production.
- Production smoke checks could create real member records or trigger notifications if writes are not excluded.
- A previously exposed key may remain in public Git history or a deployed bundle after removal from current source.
- Backup existence is insufficient without a named artifact, protected storage, retention and a verified restore path; restored production data also needs equivalent controls and secure removal.
- Concurrent dashboard edits can invalidate the reviewed migration, while unprotected `main` weakens release review.

Until those gates are satisfied, no production ledger repair, migration, Netlify connection or deploy is authorized by this design alone.

## Open Questions & Future Decisions

### Resolved

1. The chosen release model is a controlled, versioned rollout based on the existing GitHub repository.
2. The release changes schema, functions, and policies only; it imports no local member data.
3. The release access matrix preserves documented APSG/CWDI role behavior and registry boundaries, blocks public access to sensitive member columns, and keeps shared administrative actions source-routed under each registry's RLS.
4. The reviewed registration designs define the incoming form and write behavior; validate writes only in staging with synthetic data and outbound notifications suppressed. Production registration writes are excluded from smoke checks.
5. The reviewed baseline-only pull request is merged to `main` before production migration history is repaired.

### Deferred

1. Which approved encrypted location, access list and retention will hold the production backup/export, and who will verify its isolated restore?
2. Which exposed Supabase key type and consumers will the credential inventory identify, and who owns replacement and revocation?
3. Who reviews the release pull request and gives final approval for the initial Netlify production deploy? Will `main` protection be enabled, or is an equivalent owner-controlled merge gate needed?
4. Does current GitHub `main` match the live site's content and database expectations, or is a separately reviewed release commit required?
5. Which exact non-production Netlify preview mechanism and backend target will be used for the read-only visual preview and separate staging write checks?
6. Can the current published site pass compatibility checks against the post-migration schema and RLS policies in isolation, or is a coordinated two-step cutover needed?

## References

- [APSG/CWDI HLD](../../high-level-design.md)
- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase environments and existing-project baselines](https://supabase.com/docs/guides/deployment/managing-environments)
- [Supabase migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair)
- [Supabase backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Netlify deploy overview](https://docs.netlify.com/deploy/deploy-overview/)
- [Netlify repository linking](https://docs.netlify.com/build/git-workflows/repo-permissions-linking/)
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [Registration submission requirements](../registration-submission/registration-submission-specs.md)
