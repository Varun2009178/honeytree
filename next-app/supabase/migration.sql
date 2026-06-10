-- Honeytree: Auth, Sync, Payments, Receipts schema.
-- Safe to run repeatedly and on a partially-migrated database: every statement
-- is idempotent (IF NOT EXISTS / OR REPLACE), so it never errors on objects
-- that already exist and only fills in what's missing.

-- ---- Tables (no-ops if they already exist) ----
create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  github_id bigint unique,
  username text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.trees (
  id bigserial primary key,
  user_id uuid references public.profiles(id) not null,
  count int default 0,
  streak int default 0,
  forest_data jsonb default '[]'::jsonb,
  last_synced_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.plantings (
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

create table if not exists public.rewards (
  id bigserial primary key,
  user_id uuid references public.profiles(id) not null,
  badge_slug text not null,
  unlocked_at timestamptz default now(),
  unique(user_id, badge_slug)
);

-- ---- Columns added to tables that may pre-date this migration ----
-- (`create table if not exists` above does NOT add columns to a table that
-- already exists, so the additive alters below cover partially-migrated DBs.)
alter table public.trees     add column if not exists forest_data jsonb default '[]'::jsonb;
alter table public.plantings add column if not exists stripe_session_id text;
alter table public.plantings add column if not exists good_api_response jsonb;
alter table public.plantings add column if not exists email_sent_at timestamptz;

-- Idempotency: one planting row per Stripe checkout session.
create unique index if not exists plantings_stripe_session_id_key
  on public.plantings (stripe_session_id);

-- ---- Auto-create a profile (and trees row) on signup ----
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
