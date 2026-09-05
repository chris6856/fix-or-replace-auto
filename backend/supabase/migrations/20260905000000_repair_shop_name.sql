-- Captures which shop gave a repair estimate, so the app can later help the
-- user look up that shop's ratings/reviews (Research Repair Facility).
alter table repair_events add column if not exists shop_name text;
