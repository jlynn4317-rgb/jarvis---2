-- Lets the weekly pack record posts made by hand on Facebook, Instagram and YouTube.
-- Safe to run more than once.
alter table public.social_posts drop constraint if exists social_posts_channel_check;
alter table public.social_posts add constraint social_posts_channel_check
  check (channel in ('pinterest', 'tiktok', 'x', 'email', 'facebook', 'instagram', 'youtube'));
