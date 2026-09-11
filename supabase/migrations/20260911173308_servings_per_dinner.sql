-- Servings per dinner: how many people a household cooks a dinner for
-- (intent 018-serving-scale-and-removal, unit 001-serving-size-setting, bolt 069)
-- Story: 001-servings-column. See ddd-01-domain-model.md, ddd-02-technical-design.md,
--        adr-014-stored-quantities-mean-what-is-cooked.md
--
-- The third household preference, after week_start_day (intent 011) and dinners_per_week
-- (intent 015), and built exactly the same way: additive, check-constrained, commented, and
-- covered by the existing households policies (member SELECT, owner UPDATE, from
-- 20260828230000). No new RLS, no function, no grant — so ADR-12 does not apply and ADR-6 does
-- not either (households has no column-level grants; verified at bolt 069 stage 4).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠ WHAT THIS NUMBER DOES NOT MEAN (ADR-14)
-- ─────────────────────────────────────────────────────────────────────────────
-- It does NOT describe the dinners already stored. A stored dinner's quantities are what the
-- household actually cooks with — a tray of bark is saved for a tray, a dinner may be kept at the
-- 8 its page stated. Changing this value rescales NOTHING, now or later. It is only:
--   1. the TARGET offered when the user chooses to scale an imported draft on review, and
--   2. the GUIDANCE shown when typing quantities in.
-- Anything that ever reacts to this column changing is changing what stored data means, and
-- should be recognised as that before it is written.
--
-- Default 3 = what the app hard-coded before intent 018, so existing households see no change.
-- Range 1..12: one because cooking for one is coherent; twelve as a sanity bound against typos,
-- not a ruling on who counts as family.

alter table public.households
  add column if not exists servings_per_dinner smallint not null default 3
    check (servings_per_dinner between 1 and 12);

comment on column public.households.servings_per_dinner is
  'How many people this household cooks a dinner for. 1..12; default 3, which is what the app '
  'hard-coded before intent 018. The TARGET offered when scaling an imported recipe on review, and '
  'the guidance shown when typing quantities in. It does NOT describe stored dinners: a dinner''s '
  'quantities are what the household actually cooks (ADR-14). Changing it rescales nothing.';
