-- Lets people unsubscribe. Safe to run more than once.
alter table public.leads add column if not exists unsubscribed_at timestamptz;
