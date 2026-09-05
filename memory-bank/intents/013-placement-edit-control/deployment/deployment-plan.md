---
intent: 013-placement-edit-control
release: v0.11.0-b1507bf
commit: b1507bf
units: [001-placement-review-state, 002-store-placement-control]
created: '2026-09-05T21:40:00Z'
updated: '2026-09-05T22:00:00Z'
status: production-live
current_checkpoint: 4
environments:
  dev:
    status: verified
    target: 'local — vitest 305/305, tsc -b, eslint, pnpm run build (Netlify cmd), pgTAP 358/358 incl. clean-slate db reset'
  staging:
    status: 'n/a — product owner decision 2026-09-05. Additive column + backfill + one RPC; no data cutover, no equivalence gate that can fail on production data. The prod-data rehearsal v0.10.0 ran existed for gates this release does not have.'
  production:
    status: 'live 2026-09-05'
    target: 'Supabase linked gpkqsedtlzxczmarxjia + Netlify main'
    db: 'APPLIED 2026-09-05 — 20260905180000_item_review_state.sql (supabase db push --linked)'
    fe: 'LIVE 2026-09-05T20:42:44Z — PR #16 merged, main 6ba1b37; Netlify build green (user-confirmed)'
    edge_function: 'n/a — no function change'
    advisors: "product owner will monitor (this session's Supabase MCP is a different account)"
---

# Deployment Plan: intent 013 — placement edit control (release v0.11.0)

Current production is **v0.10.0** (`origin/main`, intent 010, live 2026-09-05).

## Scope

- **DB — one migration.** `20260905180000_item_review_state.sql`, confirmed
  `<NOT APPLIED>` on prod. Purely additive:
  - `items.reviewed_at timestamptz` — nullable, **no default** (a default would empty the
    review queue permanently)
  - Backfill `where reviewed_at is null` — idempotent, so a re-run is a no-op
  - `mark_item_reviewed(uuid)` — `security definer`, `set search_path = ''`, execute granted to
    `authenticated` only
  - `create or replace view item_location_resolution` appending `reviewed_at`. **Resolution
    logic untouched** — the body is v0.10.0's verbatim plus one column
- **FE** — `dev → main` → Netlify. Store page gains an all-groceries list, category moves,
  uncapped stop rows, and the review queue.
- **Edge Function** — none. **Dependencies** — none.
- **Not shipping**: unit 003 (deferred), ADR-9 retirement (now landable; separate release).

## Staging — n/a, and why that differs from last release

v0.10.0 got a full production-data rehearsal because its cutover carried two gates that could
only fail on production's data shape — a category guard and an equivalence check that would abort
the transaction. **This release has no such gate.** Adding a nullable column and stamping every
existing row cannot fail on data: there is no constraint to violate, no equivalence to prove, and
the backfill's predicate makes it idempotent.

Product owner's call, 2026-09-05. Recorded as a decision rather than an omission — the v0.10.0
rehearsal earned its keep, and the reason it is not repeated here is specific, not fatigue.

## Ordering hazard — same direction as last time, milder

**Migration before FE (safe).** The column is unread by the live v0.10.0 frontend. The RPC has no
caller. The view gains a column nothing selects. **No user-visible effect.**

**FE before migration (unsafe, but not catastrophic).** The new frontend selects `reviewed_at` in
`fetchResolvedItems`. Against the old view that column does not exist → PostgREST 400 → the
resolution query errors → the store page's item lists and the review queue fail to load. The
walking path itself still renders (it reads `locations`), and the shopping list degrades to
alphabetical rather than breaking, as it did in v0.10.0.

→ **Apply the migration first, then merge.** Same order as v0.10.0, same reason.

## Progression

```text
[x] Dev — verified 2026-09-05 (see deployment/build.md)
    [x] vitest 305/305 · tsc -b · eslint · pnpm run build
    [x] pgTAP 358/358, and again after a clean-slate 23-migration reset
[x] Staging — n/a by decision (see above)
[x] Production — Checkpoint 3  DEPLOYED 2026-09-05
    [x] 0.  dev in sync with origin/dev
    [x] 1.  migration list --linked — 20260905180000 confirmed remote:"" immediately prior
    [x] 2.  DB:  supabase db push --linked — applied
    [x] 3.  post-push read against prod:
            - items.reviewed_at present, with its comment
            - mark_item_reviewed present, SECURITY DEFINER, search_path pinned to ''
            - execute granted to authenticated + service_role, NOT anon
            - items still grants only SELECT/REFERENCES/TRIGGER/TRUNCATE/MAINTAIN —
              no INSERT/UPDATE/DELETE, so ADR-10's invariant holds on production
            - 121 items, 0 unreviewed: the queue starts empty, not full
            - item_location_resolution projects reviewed_at
            Production dumps deleted from the scratchpad after reading.
    [x] 4.  FE:  PR #16 merged 2026-09-05T20:42:44Z -> main 6ba1b37; Netlify green
    [x] 5.  regen types from prod (3ab7372) — the column and RPC already matched; the only
            diff was a __InternalSupabase.PostgrestVersion '14.5' marker the generator emits
            from prod but not from the local stack. A future regen from local drops it again;
            that is a PostgREST version difference, not a mistake.
[~] Verify production — Checkpoint 4  (2026-09-05)
    [x] db push output confirms the migration applied
    [x] Netlify main build green and live (user-confirmed)
    [~] Smoke T1-T8 — product owner confirmed the release "looks good"; individual results
        not itemised. T7 in particular has an invisible failure mode (see below) and is
        worth a deliberate look rather than inference from the page working.
    [ ] get_advisors — product owner monitoring, open
    [x] **Intent 010's Checkpoint 4 unblocked** — its S6/S7/S8 were blocked on precisely the
        placement gap this release fixes
```

## Smoke (Checkpoint 4) — on prod as a household owner

| #   | Check                                        | Pass                                                                                                  |
| --- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| T1  | `/store` opens                               | Walking path unchanged: Dairy, Produce, Pantry, Aisle 1, Bakery, Grains, Protein, Garmantasdf         |
| T2  | Expand **All groceries**, search `spag`      | Both spaghetti items appear — **the thing that was impossible**                                       |
| T3  | Move one to Bakery                           | Persists across reload; its line reads `Bakery · you chose this`                                      |
| T4  | Expand a stop with >4 items (Produce has 39) | All of them listed; collapsed count matches                                                           |
| T5  | **Where each kind of thing lives**           | All five categories listed; move one and its inherited items follow, while the item from T3 stays put |
| T6  | Add a dinner with a brand-new ingredient     | It appears under **New — needs review**                                                               |
| T7  | Press "Looks right" on it                    | Leaves the queue; **no** placement written (still shows `follows <category>`)                         |
| T8  | Shopping list for a 3-pick week              | Groups still ordered by walking path, reflecting any category move from T5                            |

T2 is the release's reason to exist. T7 is the subtle one: accepting must not pin the item.

**Expect no suggestions in the review queue** until after T3 — see the build record.

## Rollback

- **FE**: redeploy the previous Netlify production deploy. The v0.10.0 frontend does not select
  `reviewed_at`, so it works unchanged against the new schema. Instant, no data loss.
- **DB**: `drop function if exists public.mark_item_reviewed(uuid);` then
  `alter table public.items drop column if exists reviewed_at;` then re-run v0.10.0's
  `create or replace view item_location_resolution` to drop the projected column (a view cannot
  lose a column via CREATE OR REPLACE). Documented in the migration's own header.
- Losing `reviewed_at` loses only review marks — no placement, no path, no registry data.
- Prefer roll-forward. Nothing here can corrupt data.

## Notes

- The Supabase MCP in this session is authenticated to a **different account** and cannot reach
  `gpkqsedtlzxczmarxjia`. Advisors are the product owner's to monitor, as agreed.
- **Release note wording, suggested**: _"New groceries now show up under 'needs review' so you can
  confirm or correct where they'll sort. Suggestions appear once you've placed a few things
  yourself."_
- With ADR-9's gate #4 now satisfied, the destructive retirement of `grocery_store_rows` /
  `category_row_assignments` is landable. **Not in this release** — it should be its own, and it
  should wait until this one has been verified, because those tables are still the rollback path.

## Checkpoint 4 note — what is and is not confirmed

The product owner confirmed the release looks good on production, 2026-09-05, after watching the
Netlify build go green. Recorded as their confirmation rather than as an itemised smoke pass,
because that is what it was.

**T7 is the one worth a deliberate look.** Pressing "Looks right" must mark the item reviewed and
write **no** placement — the row should leave the queue while its line still reads
`follows <category>`. If it flips to `you chose this`, a placement was written, which silently
pins the item and stops the category lever working for it. That failure is invisible unless
looked for: the queue empties either way, and the page behaves normally.

It is covered by a unit test (`expect(placeItem).not.toHaveBeenCalled()`), so the risk is low —
but the test proves the wiring, not the deployed build.

Still open: `get_advisors`, which the product owner is monitoring.
