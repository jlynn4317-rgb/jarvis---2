-- Supports per-visitor and overall signup limits. Safe to run more than once.
alter table public.leads add column if not exists ip_hash text;
create index if not exists leads_ip_hash_created_idx on public.leads(ip_hash, created_at desc);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
