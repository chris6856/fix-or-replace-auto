-- Records Stripe payments made through the marketing website's guest
-- "Already Have an Estimate" flow (no Supabase Auth account involved --
-- see the app's own `purchases` table for the mobile IAP equivalent).
-- This is an audit trail, not a security gate: Stripe itself is the
-- source of truth for whether a session was paid, re-checked live on
-- every verify/report call. The unique constraint just keeps repeated
-- verifications of the same session from producing duplicate rows.
create table if not exists web_purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  tier text not null check (tier in ('decision', 'full')),
  email text,
  created_at timestamptz not null default now()
);

alter table web_purchases enable row level security;
-- No policies: this table is only ever written/read by Edge Functions
-- using the service role key, never directly from a client.
