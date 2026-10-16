-- Palay batches: stop storing a planned milling method and recovery. Recovery is
-- now DERIVED from actual milling runs (rice produced ÷ palay milled), so the
-- batch no longer needs it — and neither do the generated columns that used it
-- (expected_rice_kg, cost_per_kg_rice; cost-per-kg-of-rice is recomputed from the
-- real milled output in the app). Add a sacks count (informational; total
-- kg_purchased stays the basis for cost and pricing).

alter table public.palay_batches
  drop column if exists cost_per_kg_rice,
  drop column if exists expected_rice_kg,
  drop column if exists milling_recovery,
  drop column if exists milling_method,
  add column if not exists sacks numeric(10,2);
