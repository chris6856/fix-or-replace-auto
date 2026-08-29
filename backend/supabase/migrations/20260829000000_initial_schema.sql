-- Fix or Replace Auto — initial schema
-- Tables: vehicles, repair_events, decisions, valuation_cache
-- All scoped to auth.uid() via RLS (see build plan section 2).

create extension if not exists "pgcrypto";

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vin text,
  year integer not null,
  make text not null,
  model text not null,
  trim text,
  engine text,
  drivetrain text,
  body text,
  nickname text,
  primary_driver text check (primary_driver in ('me', 'spouse_partner', 'child', 'other')),
  zip text not null,
  current_mileage integer not null default 0,
  current_loan_payoff numeric(12, 2) not null default 0,
  condition text check (condition in ('excellent', 'good', 'fair', 'poor')),
  reliability_bucket text check (reliability_bucket in ('reliable', 'some_problems', 'problem_vehicle')),
  created_at timestamptz not null default now()
);

create table if not exists repair_events (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  description text not null,
  category text not null,
  cost numeric(12, 2) not null,
  is_safety_issue boolean,
  source text not null check (source in ('estimate', 'user_reported')),
  created_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  repair_event_id uuid references repair_events (id) on delete set null,
  recommendation text not null check (recommendation in ('fix', 'get_quote', 'replace', 'too_close')),
  calc_input jsonb not null,
  calc_output jsonb not null,
  ai_explanation text,
  created_at timestamptz not null default now()
);

create table if not exists valuation_cache (
  vehicle_id uuid primary key references vehicles (id) on delete cascade,
  value_low numeric(12, 2) not null,
  value_high numeric(12, 2) not null,
  working_value numeric(12, 2) not null,
  trade_value numeric(12, 2) not null,
  source text not null,
  fetched_at timestamptz not null default now()
);

create index if not exists repair_events_vehicle_id_idx on repair_events (vehicle_id);
create index if not exists decisions_vehicle_id_idx on decisions (vehicle_id);

alter table vehicles enable row level security;
alter table repair_events enable row level security;
alter table decisions enable row level security;
alter table valuation_cache enable row level security;

create policy "vehicles: owner full access"
  on vehicles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "repair_events: owner full access"
  on repair_events for all
  using (exists (
    select 1 from vehicles v where v.id = repair_events.vehicle_id and v.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from vehicles v where v.id = repair_events.vehicle_id and v.user_id = auth.uid()
  ));

create policy "decisions: owner full access"
  on decisions for all
  using (exists (
    select 1 from vehicles v where v.id = decisions.vehicle_id and v.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from vehicles v where v.id = decisions.vehicle_id and v.user_id = auth.uid()
  ));

create policy "valuation_cache: owner full access"
  on valuation_cache for all
  using (exists (
    select 1 from vehicles v where v.id = valuation_cache.vehicle_id and v.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from vehicles v where v.id = valuation_cache.vehicle_id and v.user_id = auth.uid()
  ));
