-- Run this in Supabase → SQL Editor if you get "column ocean_extra_revenues.data does not exist"
-- This adds the missing "data" column to your existing table.

alter table public.ocean_extra_revenues
  add column if not exists data jsonb not null default '{}';

-- If you get "column updated_at does not exist", run this too:
-- alter table public.ocean_extra_revenues add column if not exists updated_at timestamptz default now();
