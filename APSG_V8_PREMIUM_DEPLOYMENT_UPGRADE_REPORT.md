# APSG/CWDI V8 Premium Deployment Upgrade Report

## Executive summary
This pass upgraded the APSG/CWDI V8 project from a mostly premium draft into a stronger deployment-ready static/Supabase website package. The work focused on production correctness, admin consistency, admin settings hardening, public/admin SEO and accessibility safety, Supabase settings/RLS design, receipt/viewer route safety, and deploy-time validation.

## Critical bugs fixed
- Fixed the old broken leadership route in `history.html`: `/leadership.html` now points to `/pages/leadership.html`.
- Fixed the missing admin publishing route in `pages/events.html`: `/admin/content-manager.html` now points to `/admin/admin-event.html`.
- Added redirect safety for `/admin/content-manager.html` to `/admin/admin-event.html` in `_redirects` and `vercel.json`.
- Removed malformed `</meta>` from `admin/account-details.html`.
- Added accessible fallback H1 to `pages/event-details.html` before the dynamic event renderer.
- Confirmed sitemap has no `/admin/` entries.

## Admin settings command center upgrades
- Hardened `admin/settings.html` to require a `superadmin` role before loading/saving the Settings Command Center.
- Added client-side protections against importing or saving private secrets into settings.
- Added safer JSON import validation with clear error messages.
- Improved settings save flow through `assets/js/apsg-settings.js`:
  - category-level sensitive setting awareness,
  - sensitive categories forced to `public_visible=false`,
  - superadmin-only security/integrations/maintenance/deployment settings,
  - old-value lookup before write where RLS allows,
  - audit log insert with `user_agent` placeholder,
  - graceful audit-log failure handling.
- Preserved public settings behavior so public pages only load rows where `public_visible=true`.

## Admin shell upgrades
- Rebuilt `assets/js/admin-unified.js` into a stronger shared admin shell system.
- Rebuilt `assets/css/admin-unified.css` for a consistent premium admin sidebar, role badges, active states, mobile drawer, overlay, logout, and role-lock states.
- The unified sidebar now includes:
  - Dashboard
  - Members
  - Account Details
  - Leadership Desk
  - Create / Update Official
  - Officials Manager
  - Member Dossier
  - Edit Member
  - Get Involved Command
  - Donations
  - Sponsorships
  - Volunteers
  - RSVPs
  - Payment Verification
  - Receipt Studio
  - View PDF
  - Support Receipts
  - News & Updates
  - Blog Manager
  - Meetings
  - Events
  - Gallery Albums
  - Settings
  - Admin Users
  - Public Review links for all major public pages
- Added consistent admin noindex coverage across all admin HTML pages.

## CSS/codebase cleanup
- Consolidated duplicated publishing CSS.
- Kept `assets/css/admin-content-desk.css` as the single full source for shared admin publishing desk styles.
- Converted these duplicated files into small wrappers:
  - `assets/css/admin-blog.css`
  - `assets/css/admin-event.css`
  - `assets/css/admin-meeting.css`
- Added deployment polish CSS/JS consistently to public/admin/root pages that were missing it.
- Added safe dimensions/decoding to common APSG logo images.

## Security improvements
- Confirmed frontend Supabase usage remains anon-key only.
- Added/strengthened security headers in `vercel.json`:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Strict-Transport-Security`
  - `Content-Security-Policy`
  - admin `X-Robots-Tag`
  - admin `Cache-Control: no-store`
- Added stronger robots disallow rules for admin, SQL, components, config files, and root Supabase compatibility shim.
- Added a local security scan script at `scripts/security-scan.py`.
- Added deployment warning in code comments to rotate previously exposed keys before production.

## Supabase SQL/RLS improvements
Updated `sql/apsg_production_schema_recommendations.sql` with category-level settings protection:
- `public.apsg_setting_min_role(category)`
- `public.can_read_setting(category, public_visible)`
- `public.can_write_setting(category)`
- Public settings reads exclude sensitive categories.
- Security/admin access/integrations/maintenance/deployment settings are superadmin-only.
- Finance/receipt settings require admin-level access.
- Added superadmin-only delete policy for settings.
- Preserved admin profile, audit log, get-involved, content, events, and gallery RLS patterns.

## SEO improvements
- Admin pages are noindexed through HTML meta and Vercel `X-Robots-Tag`.
- Sitemap remains valid and excludes admin/private routes.
- Robots now blocks admin/private/config areas.
- Event detail now has a static fallback H1 for accessibility and SEO before dynamic rendering.
- Existing dynamic blog/event/meeting detail metadata renderer is preserved.
- Existing canonical/Open Graph/Twitter metadata is preserved.

## Performance improvements
- Shared deployment polish added across pages for layout safety, image defaults, focus states, table overflow, and reduced motion.
- Duplicated admin CSS reduced from three full copies to wrappers importing one shared stylesheet.
- Static assets configured for long immutable caching on Vercel.
- Admin pages configured as no-store.
- Existing jsPDF/html5-qrcode/DataTables/CDN dependencies are preserved only where already used to avoid breaking production behavior. CSP allows current CDN dependencies while leaving a clear future path to self-host.

## Accessibility improvements
- Added/confirmed one public H1 on all public/root/Lagos pages.
- Added event detail fallback H1.
- Strengthened focus-visible styling via deployment polish.
- Strengthened admin drawer keyboard behavior, overlay close, Escape close, and focus movement.
- Added icon-only button safety through deployment polish.
- Added table overflow wrappers to prevent mobile horizontal page overflow.
- Added mobile admin drawer and no-overflow rules.

## Validation results
The following local checks passed after the upgrade:
- `BROKEN_LOCAL_LINKS=0`
- `SECRET_SCAN_FINDINGS=0`
- `INLINE_JS_SYNTAX_ERRORS=0`
- `JS_FILES_SYNTAX_OK`
- `VERCEL_JSON_OK`
- `SITEMAP_XML_OK`
- `ADMIN_NOINDEX_MISSING=0`
- `PUBLIC_H1_MISSING=0`
- `PUBLIC_H1_MULTIPLE=0`
- `malformed </meta> count=0`
- `admin sitemap refs=0`

## Remaining manual deployment steps
1. Run the updated SQL in Supabase SQL Editor after reviewing existing production table names.
2. Confirm one active superadmin row exists in `admin_profiles` for the deployment admin email.
3. Rotate any previously exposed Supabase keys before launch.
4. Place real production values in `config.js` or `window.APSG_SUPABASE_CONFIG` where the hosting setup expects them.
5. Test login with superadmin, admin, editor, and viewer users.
6. Test donation, sponsor, volunteer, RSVP, receipt view, and receipt download against the live Supabase project.
7. Replace or compress large images to WebP/AVIF where practical before final CDN/hosting upload.
8. When inline scripts are fully migrated in a future pass, remove `'unsafe-inline'` from the CSP.

## Important note
This pass intentionally preserved page-specific inline scripts/styles where they are tightly coupled to existing page behavior. The project is safer and cleaner now, but a deeper future refactor can further modularize every page-specific inline block into standalone bundles after live browser regression testing.
