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
