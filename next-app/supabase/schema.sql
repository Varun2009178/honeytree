-- Honeytree: Auth, Sync, Payments schema
-- Run this in the Supabase SQL editor

create table public.profiles (
  id uuid references auth.users(id) primary key,
  github_id bigint unique,
  username text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

create table public.trees (
  id bigserial primary key,
  user_id uuid references public.profiles(id) not null,
  count int default 0,
  streak int default 0,
  forest_data jsonb default '[]'::jsonb,
  last_synced_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.plantings (
  id bigserial primary key,
  user_id uuid references public.profiles(id) not null,
  real_trees_planted int default 1,
  stripe_payment_id text,
  stripe_session_id text,
  one_tree_planted_id text,
  good_api_response jsonb,
  email_sent_at timestamptz,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, github_id, username, email, avatar_url)
  values (
    new.id,
    (new.raw_user_meta_data->>'provider_id')::bigint,
    new.raw_user_meta_data->>'user_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.trees (user_id, count) values (new.id, 0);
  return new;
end;
$$ language plpgsql security definer;

create table public.rewards (
  id bigserial primary key,
  user_id uuid references public.profiles(id) not null,
  badge_slug text not null,
  unlocked_at timestamptz default now(),
  unique(user_id, badge_slug)
);

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Idempotency: one planting row per Stripe checkout session
alter table public.plantings
  add column if not exists stripe_session_id text;

create unique index if not exists plantings_stripe_session_id_key
  on public.plantings (stripe_session_id);
