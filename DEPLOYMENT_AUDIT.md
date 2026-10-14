# APSG/CWDI Deployment Upgrade Audit

## Security remediation

- Removed the exposed Supabase service-role JWT from `assets/js/supabase-clients.js`.
- Removed the `SUPABASE_SERVICE_KEY` frontend pattern from `assets/js/admin.js`.
- Replaced browser Supabase setup with an anon-key-only global client.
- Added `config.example.js` as the safe public configuration reference.
- Added `assets/js/admin-auth.js` to enforce Supabase Auth session checks and `admin_profiles` role checks on admin pages.
- Added `noindex,nofollow` metadata to admin pages.
- Added clear deployment instructions requiring key rotation before production.

> Important: rotate the previously exposed Supabase service-role key and anon key before deployment. Never ship service-role/admin/private keys in frontend code.

## Cleanup completed

- Removed `.git` and `.vscode` from the deploy copy.
- Removed unsafe local installer/system files from `assets/images/pages`.
- Added `.gitignore`.
- Added `README.md` with setup, Supabase, deployment, and admin-login notes.
- Added Netlify `_redirects`, Vercel `vercel.json`, and `robots.txt`.

## Routing and component cleanup

- Kept `index.html` at root.
- Converted duplicate root public pages to lightweight canonical redirects into `/pages`.
- Fixed `/Pages/...` casing to `/pages/...`.
- Fixed `Account-Details.html` casing to `account-details.html`.
- Fixed broken APSG logo references to `/assets/images/logo/apsg1.png`.
- Added/fixed placeholder image assets for profile, avatar, PDF, OG, and hero fallbacks.
- Consolidated navbar/footer loading into root-safe component loaders.
- Replaced legacy `components/navbar1.html` with the corrected canonical navbar markup.

## Public directory improvements

- Rebuilt `assets/js/leadership-public.js` around anon Supabase reads and safe fallbacks.
- Public cards now show only name, position, short excerpt, image, Quick View, and View Dossier.
- Full credentials, biography, achievements, metadata, and linked roles are reserved for `pages/official-details.html`.
- Added support for `id`, `profile`, `profile_slug`, `profile_key`, and `slug` dossier fallbacks.
- Added deduplication using canonical/profile/placement keys while preserving linked-role information in dossier views.
- Prevented fallback seed records from overriding live Supabase records.

## Premium UI improvements

- Added a reusable premium official-card system in `assets/css/leadership-directory.css`.
- Improved image behavior with top-centered `object-fit: cover`, lazy loading, hover scale, rounded cards, and premium shadows.
- Upgraded State Executive Desk rendering to match the leadership card system with 2 cards per row on desktop.
- Cleaned messy duplicate state-details overrides and consolidated rendering through shared public scripts.
- Preserved the CWDI information section plus Supabase-powered CWDI officials directory.

## Verification run in this package

- JavaScript syntax checked with `node --check` for `assets/js` and `components` scripts.
- Local HTML link scan completed with no unresolved static local href/src/poster references after filtering dynamic template/storage references.
- Security scan found no service-role JWT; the only JWT remaining is an anon-role key in the public browser client.
- Unsafe binary scan found no `.exe`, `.winmd`, `.dll`, or `.msi` files.
