-- Records Stripe donations made through the marketing website's "Keep the
-- lights on" donate flow -- an audit trail only, not a security gate:
-- Stripe itself is the source of truth for whether a session was paid.
-- Same pattern as web_purchases, but grants are scoped tighter (service
-- role only) since nothing here is ever read directly by a signed-in app
-- user the way price_checks/purchase_checks are.

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  amount_cents integer not null,
  created_at timestamptz not null default now()
);

alter table donations enable row level security;
-- No policies: this table is only ever written/read by Edge Functions
-- using the service role key, never directly from a client.

grant select, insert, update, delete on public.donations to service_role;
