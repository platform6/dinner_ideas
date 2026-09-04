-- Intent 011 (planning-week-rollover), unit 001-week-start-setting, bolt 045.
--
-- Additive: the weekday a household's dinner-planning week starts on
-- (0 = Sunday .. 6 = Saturday). Consumed client-side in local time to derive
-- "the current planning week" and roll the catalog picker over at that boundary.
--
-- No new RLS: `households` already has member-SELECT ("Household readable by its
-- members") and owner-UPDATE ("Household updatable by an owner") policies from
-- 20260828230000, which cover this column.

alter table public.households
  add column if not exists week_start_day smallint not null default 0
    check (week_start_day between 0 and 6);

comment on column public.households.week_start_day is
  'Weekday the dinner-planning week starts on: 0 = Sunday .. 6 = Saturday. '
  'Default 0 (Sunday). Owner-editable on /settings. Read client-side (local time) '
  'to compute the current planning week — intent 011.';
