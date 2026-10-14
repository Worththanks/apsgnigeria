# APSG/CWDI Website

Premium static HTML/CSS/JS website for APC Progressive Support Group (APSG) and Confident Women Development Initiative (CWDI), with Supabase-powered membership registration, public official directories, dossiers, media/content desks, and admin dashboard pages.

## Security status before deployment

A Supabase privileged key was found in the original frontend bundle and has been removed from browser code. Before deploying this website, rotate the exposed Supabase project keys in the Supabase dashboard, especially the previously exposed privileged key. Frontend code must use only the public anon key.

Admin authorization must be enforced with:

1. Supabase Auth session checks.
2. Row Level Security policies.
3. `admin_profiles` role records (`viewer`, `editor`, `admin`, `superadmin`).

Do not rely on localStorage, hidden buttons, or frontend-only role checks as the source of truth.

## Project structure

```text
/admin                  Admin dashboard and management desks
/pages                  Canonical public pages
/assets/css             Site styles
/assets/js              Site JavaScript and Supabase browser client
/assets/images          Logo, hero, page images, placeholders
/assets/files           JSON data used by registration dropdowns
/components             Navbar/footer components
index.html              Root homepage
```

Root duplicates such as `leadership.html`, `mp.html`, `state.html`, and `state-details.html` now redirect to canonical `/pages/...` routes.

## Supabase configuration

The single browser client is:

```text
/assets/js/supabase-clients.js
```

It exposes these compatible globals for existing code:

```text
window.apsgSupabase
window.supabaseClient
window.supabaseClientPublic
window.APSG_SUPABASE
window.sb
```

To avoid editing the client directly, copy:

```text
config.example.js -> config.js
```

Then provide only your public anon configuration:

```js
window.APSG_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_PUBLIC_SUPABASE_ANON_KEY'
};
```

Load `/config.js` before `/assets/js/supabase-clients.js` if using external configuration. Never place service-role, database passwords, JWT secrets, or private API keys in frontend files.

## Required Supabase tables/features

The site expects these records/policies to exist where used:

- `members` for public registration.
- `admin_profiles` for admin role checks.
- `apsg_officials` preferred for leadership/directories; legacy fallbacks include `officials` and `leadership_officials`.
- Storage bucket used by member uploads, commonly `uploads`.
- Public/RLS policies that allow published public records to be read by anon users, while admin writes are protected by Auth + roles.

## Official directory rules

Public cards show only name, position, `short_info`, image, Quick View, and View Dossier. Full credentials, biography, achievements, linked roles, and metadata are shown only on `/pages/official-details.html`.

Dossier routing supports:

```text
/pages/official-details.html?id=...
/pages/official-details.html?profile=...
/pages/official-details.html?profile_slug=...
/pages/official-details.html?slug=...
```

Duplicate public cards are grouped by `profile_slug`, `profile_key`, `placement_key`, and canonical profile mapping. Linked roles remain visible inside the dossier/admin context.

## Local testing

Use any static server from the project root:

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080/
```

Recommended checks:

- Home, navbar, footer, mobile menu.
- `/pages/register.html` cascading State/LGA/Ward dropdowns.
- `/pages/leadership.html`, `/pages/mp.html`, `/pages/nat-exec.html`, `/pages/cwdi.html` directories.
- `/pages/state.html` and `/pages/state-details.html?state=lagos`.
- Quick View modals and dossier links.
- `/admin/login.html` and admin redirects when unauthenticated.
- Console errors on desktop and mobile widths.

## Deployment notes

This is a static website. Deploy the cleaned project root to Netlify, Vercel, Cloudflare Pages, cPanel, or any static host.

- Netlify uses `_redirects`.
- Vercel uses `vercel.json`.
- Admin pages are marked noindex and should be protected by Supabase Auth + RLS.
- `.git`, `.vscode`, installer files, and unsafe binaries are excluded from the cleaned deployment bundle.

## Manual steps still required

1. Rotate the previously exposed Supabase keys before production.
2. Confirm `admin_profiles` has the right user IDs/emails and roles.
3. Confirm RLS policies match the new auth model.
4. Confirm the storage bucket and upload policies.
5. Run a browser console check against the real Supabase project.
