-- Price Check: the owner enters an already-diagnosed repair and the price
-- a shop quoted; Claude gives a typical cost range and where the quote
-- falls relative to it (see ai-check-repair-price for the caveats baked
-- into the prompt -- this is general U.S.-average knowledge, never
-- real-time or regional pricing data). Same ownership/RLS pattern as
-- symptom_checks.
--
-- Explicit Data API grants are included below (not left to Supabase's
-- auto-grant) since 2026-10-30 is the cutover date after which new
-- public-schema tables no longer get them automatically.

create table if not exists price_checks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  repair_description text not null,
  quoted_price numeric(12, 2) not null,
  typical_low_cost numeric(12, 2) not null,
  typical_high_cost numeric(12, 2) not null,
  verdict text not null check (verdict in ('below_typical', 'within_typical', 'above_typical')),
  explanation text not null,
  created_at timestamptz not null default now()
);

create index if not exists price_checks_vehicle_id_idx on price_checks (vehicle_id);

alter table price_checks enable row level security;

create policy "price_checks: owner full access"
  on price_checks for all
  using (exists (
    select 1 from vehicles v where v.id = price_checks.vehicle_id and v.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from vehicles v where v.id = price_checks.vehicle_id and v.user_id = auth.uid()
  ));

grant select on public.price_checks to anon;
grant select, insert, update, delete on public.price_checks to authenticated;
grant select, insert, update, delete on public.price_checks to service_role;
