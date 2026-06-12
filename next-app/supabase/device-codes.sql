-- REQUIRED for `honeytree login` to work in production.
-- Run once in the Supabase SQL Editor. Safe to run repeatedly.
--
-- Device codes were previously held in server memory, which breaks on
-- serverless hosting (each API call can hit a different instance). This table
-- makes them durable. Service-role access only — RLS is enabled with no
-- policies, so anon/authenticated keys can't read tokens.

create table if not exists public.device_codes (
  device_code uuid primary key,
  user_code text not null,
  status text not null default 'pending',
  access_token text,
  refresh_token text,
  user_id uuid,
  username text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Upgrade for tables created before refresh-token support (safe to re-run).
alter table public.device_codes add column if not exists refresh_token text;

create index if not exists idx_device_codes_user_code
  on public.device_codes (user_code);

alter table public.device_codes enable row level security;
