-- Brings an EXISTING database (older campaigns table, no leads/social_posts) up to date.
-- Additive only: nothing is dropped except one status rule, which is replaced by a wider one.
-- Safe to run more than once.

-- 1. New tables
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  role text default 'operator',
  created_at timestamptz default now()
);

create table if not exists public.telemetry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  source text,
  event_name text,
  payload jsonb default '{}',
  created_at timestamptz default now()
);

-- 2. Update the existing campaigns table (keeps all existing rows)
alter table public.campaigns alter column name drop not null;
alter table public.campaigns add column if not exists title text;
alter table public.campaigns add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.campaigns add column if not exists asin text;
alter table public.campaigns add column if not exists affiliate_tag text default 'gblabs20-20';
alter table public.campaigns add column if not exists brief jsonb default '{}';
alter table public.campaigns add column if not exists updated_at timestamptz default now();
alter table public.campaigns add column if not exists niche text not null default 'general';
update public.campaigns set title = name where title is null;
alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check
  check (status in ('active', 'paused', 'draft', 'completed', 'generated'));

-- 3. Missing columns on other existing tables
alter table public.offers add column if not exists network text not null default 'amazon'
  check (network in ('amazon', 'clickbank', 'shareasale', 'impact', 'generic'));
alter table public.copy_variants add column if not exists status text not null default 'active'
  check (status in ('active', 'paused'));
alter table public.tracking_links add column if not exists copy_variant_id uuid
  references public.copy_variants(id) on delete set null;

-- 4. Lead capture and posting queue
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  tracking_link_id uuid references public.tracking_links(id) on delete set null,
  source text not null default 'landing_page',
  created_at timestamptz not null default now(),
  unique (email, campaign_id)
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  copy_variant_id uuid references public.copy_variants(id) on delete set null,
  channel text not null check (channel in ('pinterest', 'tiktok', 'x', 'email')),
  content jsonb not null default '{}',
  status text not null default 'pending_approval'
    check (status in ('pending_approval', 'queued', 'posted', 'failed', 'manual_pending')),
  external_id text,
  error text,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

-- 5. Indexes
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists campaigns_user_idx on public.campaigns(user_id);
create index if not exists telemetry_user_idx on public.telemetry(user_id);
create index if not exists offers_status_idx on public.offers(status);
create index if not exists agent_logs_created_at_idx on public.agent_logs(created_at desc);
create index if not exists analytics_snapshots_created_at_idx on public.analytics_snapshots(created_at desc);
create index if not exists conversions_created_at_idx on public.conversions(created_at desc);
create index if not exists tasks_queue_idx on public.tasks(status, run_at);
create index if not exists copy_variants_campaign_idx on public.copy_variants(campaign_id);
create index if not exists leads_email_idx on public.leads(email);
create index if not exists leads_campaign_idx on public.leads(campaign_id);
create index if not exists social_posts_status_idx on public.social_posts(status);
create index if not exists social_posts_campaign_idx on public.social_posts(campaign_id);

-- 6. Lock down ONLY the new tables (the app writes to them with the server-side secret key).
-- Existing tables are left as they are, in case another app uses them.
alter table public.profiles enable row level security;
alter table public.telemetry enable row level security;
alter table public.leads enable row level security;
alter table public.social_posts enable row level security;

drop policy if exists "authenticated users read profiles" on public.profiles;
create policy "authenticated users read profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "authenticated users read telemetry" on public.telemetry;
create policy "authenticated users read telemetry" on public.telemetry for select to authenticated using (true);
drop policy if exists "authenticated users read leads" on public.leads;
create policy "authenticated users read leads" on public.leads for select to authenticated using (true);
drop policy if exists "authenticated users read social posts" on public.social_posts;
create policy "authenticated users read social posts" on public.social_posts for select to authenticated using (true);
