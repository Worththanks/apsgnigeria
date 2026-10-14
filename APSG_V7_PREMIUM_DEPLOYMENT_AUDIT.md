# APSG/CWDI v7 Premium Deployment Audit

Generated: 2026-07-04

## Critical Inspection Summary

The project has been upgraded as a production-readiness patch for a premium APSG/CWDI civic organization website. The pass focused on security, routing, admin consistency, centralized settings, mobile responsiveness, SEO hygiene, form/receipt workflows, and deployment safety.

Key production risks found and addressed:

- Tailwind Play CDN dependency existed across many pages.
- Vercel/Netlify redirects contained an unsafe national executive route issue.
- Root shortcut links such as `/donation.html`, `/contact.html`, and `/membership.html` needed canonical page routing.
- Admin settings was too basic for a production command center.
- Admin role logic and admin-users access needed stronger superadmin protection.
- Settings were duplicated between public engagement pages and admin get-involved settings.
- Sitemap contained redirect-wrapper routes and needed admin/private exclusion.
- Public blog cards needed reliable blog-detail routing by `slug` or `id`.
- Admin pages needed consistent noindex protection and unified admin navigation support.

## Major Files Changed / Added

### Added

- `404.html`
- `assets/css/tailwind-static.css`
- `assets/js/apsg-settings.js`
- `sql/apsg_production_schema_recommendations.sql`
- `APSG_V7_PREMIUM_DEPLOYMENT_AUDIT.md`

### Heavily Upgraded

- `admin/settings.html`
- `admin/admin-users.html`
- `assets/js/admin-auth.js`
- `assets/js/admin-unified.js`
- `assets/js/apsg-involvement-system.js`
- `assets/js/public-content.js`
- `pages/about.html`
- `pages/blog.html`
- `pages/blog-detail.html`
- `pages/sitemap.html`
- `_redirects`
- `vercel.json`
- `robots.txt`
- `sitemap.xml`

### Project-wide HTML Updates

Many public and admin HTML pages were updated to use local static Tailwind replacement CSS, centralized settings loading, corrected links, noindex admin protection, and consistent Supabase/settings support.

## Bugs Fixed

- Removed production dependency on `https://cdn.tailwindcss.com` and replaced it with `assets/css/tailwind-static.css` generated from project utility classes.
- Fixed broken local shortcut routes:
  - `/donation.html` to `/pages/donation.html`
  - `/contact.html` to `/pages/contact.html`
  - `/membership.html` to `/pages/register.html`
- Fixed national executive redirect behavior:
  - `/pages/nat-exe.html` now redirects/canonicalizes to `/pages/nat-exec.html`.
- Removed catch-all SPA rewrites that could break static multi-page routing.
- Added a premium `404.html` fallback.
- Removed admin/private URLs from sitemap.
- Removed redirect wrapper pages from sitemap where they should not be canonical crawl targets.
- Blog cards now open `pages/blog-detail.html` by `slug`, with `id` fallback.
- Event/meeting/blog detail helpers now use `id` when no slug exists.
- Volunteer and RSVP flows stay submit-only and do not trigger payment WhatsApp flows.
- Donation and sponsor still support pending receipts, PDF download, view PDF, and WhatsApp sharing.

## Admin Settings Command Center Upgrade

`admin/settings.html` was rebuilt as a premium APSG/CWDI Settings Command Center with:

- Dashboard hero
- Settings health score
- Supabase connection status
- Searchable settings
- Sticky tabbed settings sidebar
- Mobile-friendly section dropdown
- Save section / save all controls
- Reset section / reset all controls
- Export settings JSON
- Import settings JSON
- Print settings summary
- Preview public settings panel
- Loading/empty/error states
- Toast notifications
- Dangerous-action confirmation modal
- Unsaved changes warning
- Validation errors
- Audit metadata fields
- Superadmin-only lock badges
- Keyboard-accessible modal closing
- Responsive forms with no horizontal overflow

Settings sections implemented:

1. Organization Profile
2. Brand & Appearance
3. Finance & Payment
4. Donation/Sponsor/Volunteer/RSVP
5. Receipt & PDF
6. SEO
7. Content Publishing
8. Admin Access & Security
9. Integrations
10. Backup, Export & Maintenance

## Security Improvements

- Verified frontend Supabase key is anon-role only.
- Added warnings to rotate previously exposed keys before deployment.
- Added `admin-auth.js` role guard using `admin_profiles`.
- `admin/admin-users.html` is now superadmin-only in UI routing.
- Settings page requires at least admin role; security and maintenance sections are superadmin-locked.
- Admin pages include noindex protection.
- `vercel.json` adds noindex/no-store headers for `/admin/*`.
- `robots.txt` disallows `/admin/`, `/assets/files/`, and `/config.js`.
- Centralized guidance added for RLS enforcement; real permission control must remain in Supabase policies.

## Role Model Implemented in UI

- `superadmin`: full admin/settings/users/payment/publishing/export authority.
- `admin`: manage members, operations, payments, engagement and most settings.
- `editor`: manage publishing desks such as blog, events, meetings and gallery.
- `viewer`: read-only dashboard-level access.

## SEO Improvements

- Rebuilt `sitemap.xml` with public canonical routes only.
- Admin URLs excluded from sitemap.
- Redirect wrappers removed from sitemap where inappropriate.
- `robots.txt` updated for admin/private exclusions.
- `vercel.json` and `_redirects` corrected for canonical legacy routes.
- Public blog/detail/event/meeting URL helpers improved.
- Added premium standalone `pages/about.html` instead of a simple redirect wrapper.
- Added noindex on redirect-wrapper pages.

## Performance Improvements

- Removed Tailwind Play CDN runtime dependency.
- Added local static utility CSS subset generated from project classes.
- Preserved lazy-loading patterns and reduced blocking dependency risk.
- Added asset cache headers for `/assets/*` on Vercel.
- Removed dangerous catch-all static rewrite that could interfere with direct page loading.

## Accessibility Improvements

- Added accessible 404 page with clear H1 and focus styles.
- Settings Command Center includes keyboard-accessible controls, visible focus behavior, labels, error states and responsive form structure.
- Admin access denied screen includes clear semantic messaging and navigation.
- About page includes skip link, clear H1 and meaningful CTA labels.
- Admin unified shell supports mobile drawer/overlay/escape close behavior.

## Supabase SQL / RLS Recommendations

See:

`sql/apsg_production_schema_recommendations.sql`

It includes recommended schema and policies for:

- `admin_profiles`
- `apsg_settings`
- `admin_audit_logs`
- `apsg_donations`
- `apsg_sponsorships`
- `apsg_volunteers`
- `apsg_rsvps`
- `apsg_payment_receipts`
- `apsg_content`
- `apsg_events`
- `gallery_albums`

Recommended RLS coverage:

- Public read only where `public_visible = true` for settings.
- Anonymous insert only for public form submissions.
- No anonymous updates/deletes.
- Admin/editor/superadmin role enforcement through `admin_profiles` helper functions.
- Superadmin-only admin profile management.
- Superadmin-only audit log read.
- Editor/admin content publishing controls.

## Validation Completed

- External JavaScript syntax check: passed.
- Inline scripts in `admin/settings.html` and `admin/admin-users.html`: passed.
- `vercel.json` JSON parse: passed.
- `sitemap.xml` XML parse: passed.
- Broken local `href/src` reference scan: 0 missing local references found.
- Admin noindex scan: all admin HTML pages include noindex.
- Sitemap admin URL scan: no `/admin/` URLs found.
- Tailwind CDN scan across HTML/JS/CSS excluding the generated local replacement: no production Tailwind CDN references found.
- Supabase JWT frontend check: public key role decoded as `anon`.

## Remaining Manual Deployment Steps

1. Rotate any Supabase keys that were ever exposed before this version.
2. Confirm only the anon key is shipped in `/assets/js/supabase-clients.js` or `/config.js`.
3. Run and adapt `sql/apsg_production_schema_recommendations.sql` in Supabase SQL Editor.
4. Confirm `admin_profiles` contains your first `superadmin` account.
5. Verify RLS policies in Supabase using anon, viewer, editor, admin and superadmin test accounts.
6. Configure the correct public domain in settings: `base_url`, canonical base URL and sitemap base URL.
7. Update bank, WhatsApp, public email and finance email from the Settings Command Center.
8. Deploy to Vercel/Netlify and test form submissions against the live Supabase project.
9. Test PDF download/view/share on a real mobile browser because WhatsApp PDF sharing depends on device Web Share support.
10. Run Lighthouse after deployment for final LCP/INP/CLS numbers with live hosting and real images.

## Final Deployment Checklist

- [x] Broken local links repaired.
- [x] Tailwind Play CDN removed from HTML/JS.
- [x] Vercel redirect self-loop fixed.
- [x] Admin pages noindexed.
- [x] Sitemap excludes admin URLs.
- [x] Root shortcut redirects corrected.
- [x] Settings centralized through `APSGSettings`.
- [x] Admin users protected as superadmin-only in frontend guard.
- [x] Donation/sponsor pending receipt PDF flow preserved.
- [x] Volunteer submit-only behavior preserved.
- [x] RSVP submit-only behavior preserved.
- [x] Blog cards open professional detail page by slug/id.
- [x] Supabase schema/RLS recommendations added.
- [ ] Supabase SQL applied in production.
- [ ] Supabase keys rotated.
- [ ] Live browser QA completed after deployment.
