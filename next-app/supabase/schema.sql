-- Honeydew Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Usage tracking: 3 free generations per browser fingerprint
create table if not exists usage (
  id uuid primary key default gen_random_uuid(),
  fingerprint text unique not null,
  generation_count int not null default 0,
  last_generated_at timestamptz,
  created_at timestamptz not null default now()
);

-- Waitlist signups from extension
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  fingerprint text,
  created_at timestamptz not null default now()
);

-- Index for fast fingerprint lookups
create index if not exists idx_usage_fingerprint on usage (fingerprint);
create index if not exists idx_waitlist_email on waitlist (email);
