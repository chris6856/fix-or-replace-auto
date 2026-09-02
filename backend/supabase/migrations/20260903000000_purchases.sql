-- Paywall: a user's first-ever decision is free; from the 2nd decision
-- onward, seeing the result requires a purchase. Records verified
-- purchases (never trust the client's own claim of "I paid" -- see
-- verify-purchase Edge Function, which is the only writer of this table).

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null check (product_id in ('unlock_decision', 'unlock_full_report')),
  purchase_token text not null unique,
  verified_at timestamptz not null default now()
);

create index if not exists purchases_user_id_idx on purchases (user_id);

alter table purchases enable row level security;

-- Owner can read their own purchase history (e.g. to show past receipts
-- later); all writes happen server-side in verify-purchase using the
-- caller's own JWT, which this same policy already permits.
create policy "purchases: owner full access"
  on purchases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
