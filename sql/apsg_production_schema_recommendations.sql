-- APSG/CWDI production schema and RLS recommendations
-- Run in Supabase SQL editor after reviewing table names already present in your project.
-- Never expose service_role keys in frontend code. Browser clients should use only the public anon key.

create extension if not exists pgcrypto;

-- Admin profiles: source of truth for dashboard roles.
create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  email text unique not null,
  full_name text,
  role text not null default 'viewer' check (role in ('superadmin','admin','editor','viewer')),
  status text not null default 'active' check (status in ('active','inactive','disabled')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apsg_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default 'null'::jsonb,
  public_visible boolean not null default false,
  category text not null default 'general',
  description text,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists apsg_settings_public_idx on public.apsg_settings(public_visible, category);
create index if not exists apsg_settings_key_idx on public.apsg_settings(setting_key);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  affected_table text,
  affected_record text,
  admin_user text,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);
create index if not exists admin_audit_logs_admin_idx on public.admin_audit_logs(admin_user, created_at desc);

-- Get Involved / payment tables used by donation, sponsor, volunteer, RSVP and receipt studio.
create table if not exists public.apsg_donations (
  id uuid primary key default gen_random_uuid(),
  donation_ref text unique,
  donor_ref text,
  payment_ref text unique,
  receipt_ref text unique,
  donor_name text not null,
  phone text,
  email text,
  state_chapter text,
  donation_type text,
  impact_area text,
  support_category text,
  item_category text,
  amount numeric default 0,
  transfer_sender_name text,
  bank_transaction_ref text,
  payment_note text,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected','cancelled')),
  payment_status text default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apsg_sponsorships (
  id uuid primary key default gen_random_uuid(),
  sponsorship_ref text unique,
  sponsor_ref text,
  payment_ref text unique,
  receipt_ref text unique,
  sponsor_name text not null,
  organization_name text,
  phone text,
  email text,
  state_chapter text,
  event_id uuid,
  event_title text,
  package_name text,
  support_category text,
  amount numeric default 0,
  recognition_preference text,
  transfer_sender_name text,
  bank_transaction_ref text,
  sponsor_note text,
  payment_note text,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected','cancelled')),
  payment_status text default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apsg_volunteers (
  id uuid primary key default gen_random_uuid(),
  volunteer_ref text unique,
  full_name text not null,
  phone text,
  email text,
  member_status text,
  membership_id text,
  state_chapter text,
  lga text,
  ward text,
  category text,
  event_id uuid,
  event_title text,
  availability text,
  skills text,
  experience text,
  notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  status text not null default 'submitted' check (status in ('submitted','approved','assigned','checked_in','rejected','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apsg_rsvps (
  id uuid primary key default gen_random_uuid(),
  rsvp_ref text unique,
  full_name text not null,
  phone text,
  email text,
  member_status text,
  membership_id text,
  state_chapter text,
  event_id uuid,
  event_title text,
  guest_count integer not null default 1,
  attendance_note text,
  status text not null default 'submitted' check (status in ('submitted','confirmed','checked_in','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apsg_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_ref text not null unique,
  payment_ref text,
  source_id uuid,
  source_ref text,
  supporter_ref text,
  source_type text not null default 'support',
  recipient_name text not null,
  recipient_phone text,
  recipient_email text,
  state_chapter text,
  support_category text,
  amount numeric default 0,
  receipt_status text not null default 'pending' check (receipt_status in ('pending','final','cancelled')),
  receipt_mode text default 'pending_payment',
  transfer_sender_name text,
  receipt_note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apsg_content (
  id uuid primary key default gen_random_uuid(),
  content_type text not null default 'blog' check (content_type in ('blog','news','event','meeting')),
  title text not null,
  slug text unique,
  excerpt text,
  body text,
  category text,
  image_url text,
  venue text,
  event_date date,
  start_time time,
  end_time time,
  cta_label text,
  cta_url text,
  is_featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  seo_title text,
  seo_description text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists apsg_content_public_idx on public.apsg_content(content_type,status,is_featured,created_at desc);
create index if not exists apsg_content_slug_idx on public.apsg_content(slug);

-- Separate events table used by the get-involved/event sponsorship dashboard.
create table if not exists public.apsg_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  event_type text,
  description text,
  event_date date,
  start_time time,
  end_time time,
  location text,
  image_url text,
  sponsorship_target numeric default 0,
  volunteer_slots_required integer default 0,
  rsvp_capacity integer default 0,
  status text not null default 'draft' check (status in ('draft','published','archived','cancelled')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists apsg_events_public_idx on public.apsg_events(status,event_date);

-- Gallery albums used by the gallery admin and public gallery page.
create table if not exists public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  cover_image text,
  images jsonb not null default '[]'::jsonb,
  category text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_featured boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gallery_albums_public_idx on public.gallery_albums(status,is_featured,created_at desc);

-- Helper functions for RLS. Adjust email matching if your admin_profiles uses user_id only.
create or replace function public.current_admin_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((
    select role from public.admin_profiles
    where is_active = true
      and status = 'active'
      and (user_id = auth.uid() or id = auth.uid() or lower(email) = lower(coalesce(auth.jwt() ->> 'email','')))
    limit 1
  ), 'anonymous');
$$;

create or replace function public.is_admin_at_least(required_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when public.current_admin_role() = 'superadmin' then true
    when required_role = 'viewer' and public.current_admin_role() in ('viewer','editor','admin') then true
    when required_role = 'editor' and public.current_admin_role() in ('editor','admin') then true
    when required_role = 'admin' and public.current_admin_role() = 'admin' then true
    else false
  end;
$$;


-- Category-level permissions for APSG settings.
-- Public users may read only public_visible settings outside sensitive categories.
-- Security, integrations, maintenance and deployment controls are superadmin-only.
create or replace function public.apsg_setting_min_role(setting_category text)
returns text language sql immutable as $$
  select case lower(coalesce(setting_category,''))
    when 'security' then 'superadmin'
    when 'admin_access' then 'superadmin'
    when 'integrations' then 'superadmin'
    when 'maintenance' then 'superadmin'
    when 'deployment' then 'superadmin'
    when 'finance' then 'admin'
    when 'receipt' then 'admin'
    when 'receipt_pdf' then 'admin'
    else 'editor'
  end;
$$;

create or replace function public.can_read_setting(setting_category text, is_public boolean)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when coalesce(is_public,false) = true
      and lower(coalesce(setting_category,'')) not in ('security','admin_access','integrations','maintenance','deployment') then true
    when public.apsg_setting_min_role(setting_category) = 'superadmin' then public.current_admin_role() = 'superadmin'
    when public.apsg_setting_min_role(setting_category) = 'admin' then public.is_admin_at_least('admin')
    when public.apsg_setting_min_role(setting_category) = 'editor' then public.is_admin_at_least('editor')
    else false
  end;
$$;

create or replace function public.can_write_setting(setting_category text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when public.apsg_setting_min_role(setting_category) = 'superadmin' then public.current_admin_role() = 'superadmin'
    when public.apsg_setting_min_role(setting_category) = 'admin' then public.is_admin_at_least('admin')
    when public.apsg_setting_min_role(setting_category) = 'editor' then public.is_admin_at_least('editor')
    else false
  end;
$$;

alter table public.admin_profiles enable row level security;
alter table public.apsg_settings enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.apsg_donations enable row level security;
alter table public.apsg_sponsorships enable row level security;
alter table public.apsg_volunteers enable row level security;
alter table public.apsg_rsvps enable row level security;
alter table public.apsg_payment_receipts enable row level security;
alter table public.apsg_content enable row level security;
alter table public.apsg_events enable row level security;
alter table public.gallery_albums enable row level security;

-- Settings policies with category-level enforcement.
drop policy if exists "Public read public settings" on public.apsg_settings;
create policy "Public read public settings" on public.apsg_settings
  for select to anon, authenticated using (
    public_visible = true
    and lower(coalesce(category,'')) not in ('security','admin_access','integrations','maintenance','deployment')
  );
drop policy if exists "Admin read all settings" on public.apsg_settings;
create policy "Admin read all settings" on public.apsg_settings
  for select to authenticated using (public.can_read_setting(category, public_visible));
drop policy if exists "Admin update settings" on public.apsg_settings;
create policy "Admin update settings" on public.apsg_settings
  for insert to authenticated with check (
    public.can_write_setting(category)
    and not (public_visible = true and lower(coalesce(category,'')) in ('security','admin_access','integrations','maintenance','deployment'))
  );
drop policy if exists "Admin modify settings" on public.apsg_settings;
create policy "Admin modify settings" on public.apsg_settings
  for update to authenticated using (public.can_write_setting(category)) with check (
    public.can_write_setting(category)
    and not (public_visible = true and lower(coalesce(category,'')) in ('security','admin_access','integrations','maintenance','deployment'))
  );
drop policy if exists "Superadmin delete settings" on public.apsg_settings;
create policy "Superadmin delete settings" on public.apsg_settings
  for delete to authenticated using (public.current_admin_role() = 'superadmin');


-- Admin profiles are superadmin-managed. Viewers can read their own profile.
drop policy if exists "Admins read active admin profiles" on public.admin_profiles;
create policy "Admins read active admin profiles" on public.admin_profiles
  for select to authenticated using (public.is_admin_at_least('viewer'));
drop policy if exists "Superadmin insert admin profiles" on public.admin_profiles;
create policy "Superadmin insert admin profiles" on public.admin_profiles
  for insert to authenticated with check (public.current_admin_role() = 'superadmin');
drop policy if exists "Superadmin update admin profiles" on public.admin_profiles;
create policy "Superadmin update admin profiles" on public.admin_profiles
  for update to authenticated using (public.current_admin_role() = 'superadmin') with check (public.current_admin_role() = 'superadmin');

-- Audit logs: no anonymous access. Admins insert; superadmin reads.
drop policy if exists "Admins insert audit logs" on public.admin_audit_logs;
create policy "Admins insert audit logs" on public.admin_audit_logs
  for insert to authenticated with check (public.is_admin_at_least('admin'));
drop policy if exists "Superadmin read audit logs" on public.admin_audit_logs;
create policy "Superadmin read audit logs" on public.admin_audit_logs
  for select to authenticated using (public.current_admin_role() = 'superadmin');

-- Public form inserts. Admins read/update. No anonymous updates.
drop policy if exists "Anon create donations" on public.apsg_donations;
create policy "Anon create donations" on public.apsg_donations for insert to anon, authenticated with check (true);
drop policy if exists "Anon create sponsorships" on public.apsg_sponsorships;
create policy "Anon create sponsorships" on public.apsg_sponsorships for insert to anon, authenticated with check (true);
drop policy if exists "Anon create volunteers" on public.apsg_volunteers;
create policy "Anon create volunteers" on public.apsg_volunteers for insert to anon, authenticated with check (true);
drop policy if exists "Anon create rsvps" on public.apsg_rsvps;
create policy "Anon create rsvps" on public.apsg_rsvps for insert to anon, authenticated with check (true);

drop policy if exists "Admin read donations" on public.apsg_donations;
create policy "Admin read donations" on public.apsg_donations for select to authenticated using (public.is_admin_at_least('admin'));
drop policy if exists "Admin read sponsorships" on public.apsg_sponsorships;
create policy "Admin read sponsorships" on public.apsg_sponsorships for select to authenticated using (public.is_admin_at_least('admin'));
drop policy if exists "Admin read volunteers" on public.apsg_volunteers;
create policy "Admin read volunteers" on public.apsg_volunteers for select to authenticated using (public.is_admin_at_least('admin'));
drop policy if exists "Admin read rsvps" on public.apsg_rsvps;
create policy "Admin read rsvps" on public.apsg_rsvps for select to authenticated using (public.is_admin_at_least('admin'));

drop policy if exists "Admin update donations" on public.apsg_donations;
create policy "Admin update donations" on public.apsg_donations for update to authenticated using (public.is_admin_at_least('admin')) with check (public.is_admin_at_least('admin'));
drop policy if exists "Admin update sponsorships" on public.apsg_sponsorships;
create policy "Admin update sponsorships" on public.apsg_sponsorships for update to authenticated using (public.is_admin_at_least('admin')) with check (public.is_admin_at_least('admin'));
drop policy if exists "Admin update volunteers" on public.apsg_volunteers;
create policy "Admin update volunteers" on public.apsg_volunteers for update to authenticated using (public.is_admin_at_least('admin')) with check (public.is_admin_at_least('admin'));
drop policy if exists "Admin update rsvps" on public.apsg_rsvps;
create policy "Admin update rsvps" on public.apsg_rsvps for update to authenticated using (public.is_admin_at_least('admin')) with check (public.is_admin_at_least('admin'));

-- Receipts: public can view by reference only if you create a dedicated RPC; otherwise keep table admin-readable.
drop policy if exists "Admin manage receipts" on public.apsg_payment_receipts;
create policy "Admin manage receipts" on public.apsg_payment_receipts for all to authenticated using (public.is_admin_at_least('admin')) with check (public.is_admin_at_least('admin'));

-- Content: public read published only; editors/admins manage content.
drop policy if exists "Public read published content" on public.apsg_content;
create policy "Public read published content" on public.apsg_content for select to anon, authenticated using (status = 'published');
drop policy if exists "Editors read all content" on public.apsg_content;
create policy "Editors read all content" on public.apsg_content for select to authenticated using (public.is_admin_at_least('editor'));
drop policy if exists "Editors insert content" on public.apsg_content;
create policy "Editors insert content" on public.apsg_content for insert to authenticated with check (public.is_admin_at_least('editor'));
drop policy if exists "Editors update content" on public.apsg_content;
create policy "Editors update content" on public.apsg_content for update to authenticated using (public.is_admin_at_least('editor')) with check (public.is_admin_at_least('editor'));
drop policy if exists "Admins delete content" on public.apsg_content;
create policy "Admins delete content" on public.apsg_content for delete to authenticated using (public.is_admin_at_least('admin'));

-- Events table: public reads published events; editors/admins manage.
drop policy if exists "Public read published events" on public.apsg_events;
create policy "Public read published events" on public.apsg_events for select to anon, authenticated using (status = 'published');
drop policy if exists "Editors read all events" on public.apsg_events;
create policy "Editors read all events" on public.apsg_events for select to authenticated using (public.is_admin_at_least('editor'));
drop policy if exists "Editors manage events" on public.apsg_events;
create policy "Editors manage events" on public.apsg_events for all to authenticated using (public.is_admin_at_least('editor')) with check (public.is_admin_at_least('editor'));

-- Gallery table: public reads published albums; editors/admins manage.
drop policy if exists "Public read published gallery albums" on public.gallery_albums;
create policy "Public read published gallery albums" on public.gallery_albums for select to anon, authenticated using (status = 'published');
drop policy if exists "Editors read all gallery albums" on public.gallery_albums;
create policy "Editors read all gallery albums" on public.gallery_albums for select to authenticated using (public.is_admin_at_least('editor'));
drop policy if exists "Editors manage gallery albums" on public.gallery_albums;
create policy "Editors manage gallery albums" on public.gallery_albums for all to authenticated using (public.is_admin_at_least('editor')) with check (public.is_admin_at_least('editor'));

-- Seed safe public settings. Add real values in the Settings Command Center after deployment.
insert into public.apsg_settings(setting_key, setting_value, public_visible, category, description)
values
('apsg_name', to_jsonb('APC Progressive Support Group'::text), true, 'organization', 'APSG official name'),
('cwdi_name', to_jsonb('Confident Women Development Initiative'::text), true, 'organization', 'CWDI official name'),
('base_url', to_jsonb('https://apsgnigeria.org'::text), true, 'organization', 'Canonical base URL'),
('primary_green', to_jsonb('#05351f'::text), true, 'brand', 'Primary brand green'),
('gold_accent', to_jsonb('#d6a92b'::text), true, 'brand', 'Gold accent'),
('currency_symbol', to_jsonb('₦'::text), true, 'finance', 'Public currency symbol'),
('receipt_prefix', to_jsonb('APSG-RCP'::text), true, 'receipt', 'Receipt prefix')
on conflict (setting_key) do nothing;


-- Optional meetings separation: if you prefer meetings outside apsg_content, create public.apsg_meetings
-- with the same RLS pattern as apsg_events. Current frontend can also store meetings in apsg_content with type='meeting'.
-- Keep all private keys, payment-gateway secrets, SMTP passwords and service-role keys outside this table.

-- APSG analytics tracker table and dashboard views.
-- The public tracker inserts only non-sensitive event metadata; admins read aggregated views.
create table if not exists public.site_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null default 'page_view',
  page_path text not null default '/',
  page_title text,
  visitor_id text,
  session_id text,
  referrer text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists site_analytics_events_created_idx on public.site_analytics_events(created_at desc);
create index if not exists site_analytics_events_page_idx on public.site_analytics_events(page_path, created_at desc);
create index if not exists site_analytics_events_event_idx on public.site_analytics_events(event_name, created_at desc);
alter table public.site_analytics_events enable row level security;
drop policy if exists "Public insert analytics events" on public.site_analytics_events;
create policy "Public insert analytics events" on public.site_analytics_events
  for insert to anon, authenticated with check (
    length(coalesce(event_name,'')) between 1 and 80
    and length(coalesce(page_path,'')) between 1 and 400
  );
drop policy if exists "Admins read analytics events" on public.site_analytics_events;
create policy "Admins read analytics events" on public.site_analytics_events
  for select to authenticated using (public.is_admin_at_least('viewer'));

create or replace view public.dashboard_analytics_daily as
select
  date_trunc('day', created_at)::date as event_day,
  page_path,
  count(*) filter (where event_name = 'page_view')::bigint as page_views,
  count(distinct visitor_id)::bigint as unique_visitors,
  count(*) filter (where event_name <> 'page_view')::bigint as cta_clicks
from public.site_analytics_events
group by 1,2;

create or replace view public.dashboard_analytics_top_pages as
select
  (date_trunc('day', now())::date - interval '6 days')::date as period_start,
  page_path,
  count(*) filter (where event_name = 'page_view')::bigint as page_views,
  count(distinct visitor_id)::bigint as unique_visitors
from public.site_analytics_events
where created_at >= date_trunc('day', now()) - interval '6 days'
group by page_path
order by page_views desc;

