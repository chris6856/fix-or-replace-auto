-- Symptom Check: describe a symptom, get possible causes to take to a
-- mechanic (never a diagnosis, never a cost estimate -- see
-- ai-diagnose-symptom). Same ownership/RLS pattern as repair_events and
-- decisions.

create table if not exists symptom_checks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles (id) on delete cascade,
  symptom_description text not null,
  possible_issues jsonb not null,
  urgent_safety_note text,
  created_at timestamptz not null default now()
);

create index if not exists symptom_checks_vehicle_id_idx on symptom_checks (vehicle_id);

alter table symptom_checks enable row level security;

create policy "symptom_checks: owner full access"
  on symptom_checks for all
  using (exists (
    select 1 from vehicles v where v.id = symptom_checks.vehicle_id and v.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from vehicles v where v.id = symptom_checks.vehicle_id and v.user_id = auth.uid()
  ));
