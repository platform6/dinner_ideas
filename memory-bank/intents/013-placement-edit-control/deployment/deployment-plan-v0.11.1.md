---
intent: 013-placement-edit-control
release: v0.11.1-6a0f5df
commit: 6a0f5df
units: [003-shopping-list-move]
created: '2026-09-08T00:00:00Z'
updated: '2026-09-08T00:00:00Z'
status: production-live
current_checkpoint: 4
follows: v0.11.0-b1507bf
environments:
  dev:
    status: verified
    target: 'local — vitest 317/317, tsc -b, eslint, vite build (Netlify cmd). pgTAP not run: no SQL change (see build record)'
  staging:
    status: 'n/a — product owner decision 2026-09-08. No data, no schema, no cutover; staging would run the same static bundle against the same live schema production will. The pre-production device check was ALSO waived — see Checkpoint 2.'
  production:
    status: 'live 2026-09-08'
    target: 'Netlify main (frontend only; no Supabase change)'
    fe: 'LIVE 2026-09-08 — PR #18 merged, origin/main c4ca6d9. Verified: ShoppingListPage.tsx on origin/main contains the move affordance; 0f2a837 is on origin/main.'
    db: 'n/a — no migration in this release'
    edge_function: 'n/a'
    note: 'PR #17 merged first and shipped NOTHING — dev had not been pushed, so it carried only already-published docs commits. Corrected by pushing dev and merging again as PR #18.'
---

# Deployment Plan: intent 013 — the deferred unit (release v0.11.1)

Current production is **v0.11.0** (`origin/main` @ `6ba1b37`, PR #16, live 2026-09-05).

## Scope

- **DB — none.** No migration in the payload. `supabase/migrations/` is byte-identical to
  `origin/main`.
- **Edge Function — none.**
- **FE** — `dev → main` → Netlify. The shopping list gains a per-item move affordance.
- **Not shipping**: ADR-9's destructive retirement (landable since v0.11.0, still its own release).

## There is no ordering hazard

Both previous releases devoted a section to this, and both concluded "apply the migration first,
then merge." **That section does not apply here**, and the reason is worth stating rather than
leaving as an absence:

> There is no migration to order. The release is a static-site build. Netlify publishing the new
> bundle is the entire deployment, and the schema the new code reads has been live since
> 2026-09-05.

The new code selects nothing that v0.11.0's schema does not already provide — `reorder.ts` and
`ShoppingListPage.tsx` read `item_location_resolution` exactly as the shipped store page does, and
write through `placeItem` / `mark_item_reviewed`, both live since v0.11.0.

## Rollback

**Netlify revert to the previous deploy.** No data to unwind, no migration to reverse, no
intermediate state a rollback could strand — which is what makes this the lowest-risk release of
the three.

The prior two releases' rollback paths (the retained `grocery_store_rows` /
`category_row_assignments` tables) remain in place and untouched.

## Staging — a decision, not a default

v0.10.0 got a full production-data rehearsal because its cutover carried gates that could only
fail on production's data shape. v0.11.0 skipped it because an additive column and a backfill
cannot fail on data.

**This release touches no data at all.** There is no cutover, no backfill, no constraint, no
schema. A staging environment would exercise the same static bundle against the same live schema,
which is what production will do.

→ **Recommendation was: n/a, and proceed to the manual check instead.**

**Decided 2026-09-08: staging n/a, and the manual device check waived too.** The product owner
elected to ship without it: _"I'm just going to push to prod as it's fine if this breaks for a
little bit."_

That is a legitimate call for this release — the blast radius of a scroll-anchoring bug is a list
that jumps while you shop, not lost or corrupted data, and it is reversible with a Netlify revert.
Recorded as a decision so the gap is visible, not implied.

## The verification that was skipped: scroll on a real device

**Status: NOT PERFORMED. Waived by the product owner 2026-09-08, knowingly.**

This is the one gap testing did not close. The plan originally gated production on it; that gate
was lifted rather than quietly dropped. It is now a **post-deploy check** — worth doing on the live
site, since the steps are identical:

| Step | What                                                                                                  |
| ---- | ----------------------------------------------------------------------------------------------------- |
| 1    | Run the app locally (`pnpm dev`) on a **phone**, or a phone-sized viewport                            |
| 2    | Pick a week so the shopping list has several category groups                                          |
| 3    | Check off a few items part-way down the list, and scroll so you are mid-list                          |
| 4    | Move an item whose category group will jump to the top of the walking path                            |
| 5    | **Confirm the list does not slide out from under you** — the row you moved stays where your thumb was |
| 6    | Confirm the checked items are still checked                                                           |
| 7    | Repeat in a **wide desktop window**, where the list is two CSS columns and reflow is less predictable |

If step 5 or 7 fails, that is a Construction fix (bolt 058's `useLayoutEffect` anchor), not a
deployment problem. Since this now runs **after** the deploy rather than before it, the response to
a failure is a Netlify revert plus a new bolt, rather than simply holding the release.

## Progression

| Checkpoint | Stage                  | State                                  |
| ---------- | ---------------------- | -------------------------------------- |
| 1          | Build approval         | ✅ approved 2026-09-08                 |
| 2          | Staging decision       | ✅ n/a; device check waived 2026-09-08 |
| 3          | Production deploy      | ⏳ in progress                         |
| 4          | Monitoring / close-out | ⏳ pending                             |

## Production steps, when approved

1. ~~Manual device check~~ — waived 2026-09-08; now a post-deploy check
2. **Push `dev` to `origin/dev` first.** As of 2026-09-08 local `dev` is 5 commits ahead of the
   remote; a PR opened without this would not contain bolt 058 at all
3. Open a PR `dev → main`, or merge directly per the product owner's preference
4. Netlify builds `main` and publishes; confirm the build is green
5. Smoke: open the shopping list, move an item, confirm it re-sorts and stays reviewed on `/store`
6. **Do the waived scroll check on the live site** — the one thing tests did not cover
7. Record the release in this plan's frontmatter and close Checkpoint 4

**No Supabase step at any point.** If a deploy instruction in this plan seems to call for one,
it is wrong.

## Also outstanding, and not part of this release

- **`004-account-model`** deployment status reads `production-live-fe-smoke-pending` — a frontend
  smoke check never closed out. The oldest loose thread in the memory bank; worth clearing while
  we are in Operations.
- **Advisors** — v0.11.0 left these for the product owner to monitor, since this session's
  Supabase MCP is a different account. Unchanged: no SQL ships here, so no new advisor surface.

---

## Post-deploy record — 2026-09-08

**Shipped as PR #18, `origin/main` @ `c4ca6d9`.**

### The first merge shipped nothing

PR #17 was merged and Netlify built green — but `dev` had never been pushed, so the PR carried only
documentation commits that were already on the remote. Bolt 058 was not in it.
`git branch -r --contains 0f2a837` returned nothing at that point.

A green Netlify build says the bundle compiled, not that the feature is in it. The reliable check is
the artifact: `git show origin/main:<file> | grep`, or the live site itself. Recorded because the
tell was available and cheap — PR #17's diff would have shown only `.md` files.

Fixed by `git push origin dev` and merging again.

### The waived scroll check — performed 2026-09-08, PASSED

Waived at Checkpoint 2, then carried out against the live site once v0.11.2 unblocked picking.

Chrome at 500 x 635 (single column, genuinely scrollable), three items checked off, scrolled to
mid-list, then an item moved so its category group jumped from 5th to 2nd:

| Measure                     | Before | After | Delta     |
| --------------------------- | ------ | ----- | --------- |
| `scrollY`                   | 709    | 110   | **-599**  |
| Moved row's viewport offset | 338    | 338   | **0**     |
| Checked items               | 3      | 3     | preserved |

**Zero drift** — the row moved 599px up the document and stayed on the same pixel. The anchor works
under real browser reflow.

Separately: at 1920px the check is not applicable, because the two-column layout fits all 17 items
and the page does not scroll at all. The two-column reflow risk is moot at this list size.

**Nothing outstanding from this release.**
