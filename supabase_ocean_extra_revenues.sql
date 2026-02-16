-- Run this in Supabase Dashboard → SQL Editor to enable Extra Revenues sync
-- App sends: id, revenue_date (YYYY-MM-DD), type, description, amount, created_at, updated_at

create table if not exists public.ocean_extra_revenues (
  id text primary key,
  revenue_date date not null default (current_date),
  type text not null default 'Services',
  description text not null default '',
  amount numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- If table already exists, add missing columns (revenue_date is what the app sends):
alter table public.ocean_extra_revenues add column if not exists revenue_date date default (current_date);
alter table public.ocean_extra_revenues add column if not exists type text not null default 'Services';
alter table public.ocean_extra_revenues add column if not exists description text not null default '';
alter table public.ocean_extra_revenues add column if not exists amount numeric not null default 0;
alter table public.ocean_extra_revenues add column if not exists created_at timestamptz default now();
alter table public.ocean_extra_revenues add column if not exists updated_at timestamptz default now();

-- RLS
alter table public.ocean_extra_revenues enable row level security;

drop policy if exists "Allow anon read write ocean_extra_revenues" on public.ocean_extra_revenues;
create policy "Allow anon read write ocean_extra_revenues"
  on public.ocean_extra_revenues for all to anon
  using (true) with check (true);

drop policy if exists "Allow authenticated read write ocean_extra_revenues" on public.ocean_extra_revenues;
create policy "Allow authenticated read write ocean_extra_revenues"
  on public.ocean_extra_revenues for all to authenticated
  using (true) with check (true);
