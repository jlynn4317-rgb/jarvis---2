create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  role text default 'operator',
  created_at timestamptz default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  asin text,
  affiliate_tag text default 'gblabs20-20',
  status text default 'draft',
  brief jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.telemetry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  source text,
  event_name text,
  payload jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists campaigns_user_idx on public.campaigns(user_id);
create index if not exists telemetry_user_idx on public.telemetry(user_id);

-- Operational data used by campaign routing, attribution, analytics, and agent runs.
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  advertiser text not null,
  category text not null,
  payout numeric not null default 0,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

create table if not exists public.agent_logs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  action text not null,
  message text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_start timestamptz not null,
  period_end timestamptz not null,
  spend numeric not null default 0,
  revenue numeric not null default 0,
  roi numeric not null default 0,
  epc numeric not null default 0,
  cvr numeric not null default 0,
  clicks integer not null default 0,
  conversions integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tracking_links (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  destination text not null,
  clicks integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  tracking_link_id uuid references public.tracking_links(id) on delete set null,
  value numeric not null default 0,
  source text not null default 'unknown',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}',
  attempts integer not null default 0,
  status text not null default 'queued',
  run_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.copy_variants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  tone text not null,
  headline text not null,
  body text not null,
  winner boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists offers_status_idx on public.offers(status);
create index if not exists agent_logs_created_at_idx on public.agent_logs(created_at desc);
create index if not exists analytics_snapshots_created_at_idx on public.analytics_snapshots(created_at desc);
create index if not exists tracking_links_slug_idx on public.tracking_links(slug);
create index if not exists conversions_created_at_idx on public.conversions(created_at desc);
create index if not exists tasks_queue_idx on public.tasks(status, run_at);
create index if not exists copy_variants_campaign_idx on public.copy_variants(campaign_id);

-- Lock down every application table. Server routes use the service key for trusted writes.
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.telemetry enable row level security;
alter table public.offers enable row level security;
alter table public.agent_logs enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.tracking_links enable row level security;
alter table public.conversions enable row level security;
alter table public.tasks enable row level security;
alter table public.copy_variants enable row level security;

drop policy if exists "authenticated users read profiles" on public.profiles;
create policy "authenticated users read profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "authenticated users manage campaigns" on public.campaigns;
create policy "authenticated users manage campaigns" on public.campaigns for all to authenticated using (true) with check (true);
drop policy if exists "authenticated users read telemetry" on public.telemetry;
create policy "authenticated users read telemetry" on public.telemetry for select to authenticated using (true);
drop policy if exists "authenticated users read offers" on public.offers;
create policy "authenticated users read offers" on public.offers for select to authenticated using (true);
drop policy if exists "authenticated users read agent logs" on public.agent_logs;
create policy "authenticated users read agent logs" on public.agent_logs for select to authenticated using (true);
drop policy if exists "authenticated users read analytics" on public.analytics_snapshots;
create policy "authenticated users read analytics" on public.analytics_snapshots for select to authenticated using (true);
drop policy if exists "public read tracking links" on public.tracking_links;
create policy "public read tracking links" on public.tracking_links for select to anon, authenticated using (true);
drop policy if exists "public conversion insert" on public.conversions;
create policy "public conversion insert" on public.conversions for insert to anon, authenticated with check (true);
drop policy if exists "authenticated users read tasks" on public.tasks;
create policy "authenticated users read tasks" on public.tasks for select to authenticated using (true);
drop policy if exists "authenticated users read copy variants" on public.copy_variants;
create policy "authenticated users read copy variants" on public.copy_variants for select to authenticated using (true);

-- ==========================================
-- Growth loop: lead capture, multi-network affiliate, distribution queue
-- ==========================================

alter table public.campaigns add column if not exists niche text not null default 'general';
alter table public.offers add column if not exists network text not null default 'amazon' check (network in ('amazon', 'clickbank', 'shareasale', 'impact', 'generic'));
alter table public.copy_variants add column if not exists status text not null default 'active' check (status in ('active', 'paused'));
alter table public.tracking_links add column if not exists copy_variant_id uuid references public.copy_variants(id) on delete set null;

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
  status text not null default 'pending_approval' check (status in ('pending_approval', 'queued', 'posted', 'failed', 'manual_pending')),
  external_id text,
  error text,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leads_email_idx on public.leads(email);
create index if not exists leads_campaign_idx on public.leads(campaign_id);
create index if not exists social_posts_status_idx on public.social_posts(status);
create index if not exists social_posts_campaign_idx on public.social_posts(campaign_id);

alter table public.leads enable row level security;
alter table public.social_posts enable row level security;

drop policy if exists "public lead capture" on public.leads;
create policy "public lead capture" on public.leads for insert to anon, authenticated with check (true);
drop policy if exists "authenticated users read leads" on public.leads;
create policy "authenticated users read leads" on public.leads for select to authenticated using (true);
drop policy if exists "authenticated users read social posts" on public.social_posts;
create policy "authenticated users read social posts" on public.social_posts for select to authenticated using (true);
