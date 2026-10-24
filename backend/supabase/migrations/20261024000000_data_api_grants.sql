-- Supabase is ending automatic Data API grants for new public-schema
-- tables on 2026-10-30. Existing tables keep their current grants, but a
-- local "supabase db reset" (or a new preview branch/project) replays every
-- migration from scratch -- after that date, a reset would recreate all of
-- these tables WITHOUT Data API access, breaking local dev even though
-- production is unaffected. This migration makes the grants explicit so
-- schema replay stays correct regardless of the cutover date, matching
-- what Supabase's own auto-grant used to apply (broad table-level access,
-- with RLS -- already in place on every table below -- doing the real
-- per-row restriction).
--
-- Any new table from here on should include its own grants in the same
-- migration that creates it, following this same pattern.

grant select on public.vehicles to anon;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.vehicles to service_role;

grant select on public.repair_events to anon;
grant select, insert, update, delete on public.repair_events to authenticated;
grant select, insert, update, delete on public.repair_events to service_role;

grant select on public.decisions to anon;
grant select, insert, update, delete on public.decisions to authenticated;
grant select, insert, update, delete on public.decisions to service_role;

grant select on public.valuation_cache to anon;
grant select, insert, update, delete on public.valuation_cache to authenticated;
grant select, insert, update, delete on public.valuation_cache to service_role;

grant select on public.symptom_checks to anon;
grant select, insert, update, delete on public.symptom_checks to authenticated;
grant select, insert, update, delete on public.symptom_checks to service_role;

grant select on public.purchases to anon;
grant select, insert, update, delete on public.purchases to authenticated;
grant select, insert, update, delete on public.purchases to service_role;

grant select on public.web_purchases to anon;
grant select, insert, update, delete on public.web_purchases to authenticated;
grant select, insert, update, delete on public.web_purchases to service_role;
