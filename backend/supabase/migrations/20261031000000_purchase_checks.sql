-- Purchase Check: evaluate a prospective car purchase (not yet owned) by
-- comparing an asking price against MarketCheck's real market-value
-- prediction for that exact VIN (see valuation-proxy -- reused unmodified,
-- no new Edge Function needed). Scoped directly to auth.uid(), not through
-- a vehicle_id FK like price_checks/symptom_checks are, since there's no
-- owned `vehicles` row for a car the user doesn't own yet.
--
-- Explicit Data API grants are included (not left to Supabase's auto-grant)
-- since 2026-10-30 is the cutover date after which new public-schema
-- tables no longer get them automatically.

create table if not exists purchase_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vin text not null,
  year integer not null,
  make text not null,
  model text not null,
  trim text,
  mileage integer not null,
  zip text not null,
  asking_price numeric(12, 2) not null,
  market_value numeric(12, 2) not null,
  value_low numeric(12, 2) not null,
  value_high numeric(12, 2) not null,
  verdict text not null check (verdict in ('below_market', 'at_market', 'above_market')),
  created_at timestamptz not null default now()
);

create index if not exists purchase_checks_user_id_idx on purchase_checks (user_id);

alter table purchase_checks enable row level security;

create policy "purchase_checks: owner full access"
  on purchase_checks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.purchase_checks to anon;
grant select, insert, update, delete on public.purchase_checks to authenticated;
grant select, insert, update, delete on public.purchase_checks to service_role;
