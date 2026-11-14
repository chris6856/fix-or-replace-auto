-- Check Engine Light Assistant: enter diagnostic trouble codes (and
-- whether the light is flashing) for an owned vehicle, get AI-suggested
-- possible causes -- never a diagnosis, never a cost estimate (see
-- ai-diagnose-check-engine). A sibling of symptom_checks, same
-- ownership-through-vehicles RLS pattern, since this check is tied to an
-- owned vehicle (unlike purchase_checks).
--
-- Explicit Data API grants are included (not left to Supabase's
-- auto-grant) since 2026-10-30 is the cutover date after which new
-- public-schema tables no longer get them automatically.

create table if not exists check_engine_checks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  dtc_codes text[] not null,
  is_flashing boolean not null,
  symptom_notes text,
  possible_causes jsonb not null,
  urgent_safety_note text,
  created_at timestamptz not null default now()
);

create index if not exists check_engine_checks_vehicle_id_idx on check_engine_checks (vehicle_id);

alter table check_engine_checks enable row level security;

create policy "check_engine_checks: owner full access"
  on check_engine_checks for all
  using (exists (
    select 1 from vehicles v where v.id = check_engine_checks.vehicle_id and v.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from vehicles v where v.id = check_engine_checks.vehicle_id and v.user_id = auth.uid()
  ));

grant select on public.check_engine_checks to anon;
grant select, insert, update, delete on public.check_engine_checks to authenticated;
grant select, insert, update, delete on public.check_engine_checks to service_role;
