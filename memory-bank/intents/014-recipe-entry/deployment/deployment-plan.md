---
intent: 014-recipe-entry
release: v0.14.0-fd66c42
commit: fd66c42
units: [001-recipe-manual-entry, 002-recipe-import]
created: '2026-09-11T16:00:00Z'
updated: '2026-09-11T16:20:00Z'
status: db-applied
current_checkpoint: 2
follows: v0.13.0-6b10daf
environments:
  dev:
    status: verified
    target: 'local — vitest 617/617, tsc -b, eslint, prettier clean; migration NOT yet applied anywhere'
  staging:
    status: 'n/a — product owner decision 2026-09-11 (Checkpoint 1). The migration is additive and idempotent: one `create or replace function` plus a grant, no table, constraint, row or policy touched, covered by 22 pgTAP tests including the atomicity proof. Its blast radius on production was a function that nothing called.'
  production:
    status: not-started
    target: 'Supabase (one migration) THEN Netlify main'
    db: 'APPLIED 2026-09-11 — 20260908230000_create_dinner_rpc.sql. VERIFIED three ways: `supabase migration list` now shows remote 20260908230000; an RPC probe from a client authenticated against prod reached the function with the app''s exact signature and was refused by the function''s OWN invariant (23514, "A dinner needs at least one ingredient") rather than by PostgREST''s PGRST202 — so the function exists, the grant works, and the aggregate rules are live; and the probe wrote nothing (`dinners ilike %probe%` returns zero rows).'
    fe: 'NOT STARTED — 6 commits unreleased, and `dev` is not pushed.'
    edge_function: 'n/a — claude-proxy unchanged and frozen since intent 008.'
---

# Deployment Plan: intent 014 — recipe entry (release v0.14.0)

Current production is **v0.13.0** (`origin/main` @ `be7af39`, PR #21, live 2026-09-08).

## Scope

- **FE** — `dev → main` → Netlify. Bolts 059, 060, 061, 062.
- **DB** — **one migration**, `20260908230000_create_dinner_rpc.sql`.
- **Edge Function** — none. `claude-proxy` is untouched; intent 014 is its second _caller_, not a
  change to it.
- **RLS** — none. The new function is `security invoker` precisely so the household-scoped INSERT
  policies from intent 004 apply unchanged.

**What ships to the family**: the catalog becomes writable. A dinner can be typed in, or a recipe
page pasted and read into the same form for review before saving.

## The migration, and why the ordering is easier than it looks

`fn_create_dinner` is what makes a recipe save atomic — four tables in one transaction (ADR-13).
The frontend calls it over RPC, so the obvious fear is the coupling: ship the FE first and every
save hits a function that does not exist.

**But the migration is purely additive.** It is a `create or replace function` plus one
`grant execute`. No table is altered, no constraint added or dropped, no row touched, no policy
changed. Applying it to production **changes nothing observable** — it adds a function that
nothing on the live site calls, because the live site has no recipe entry page.

That turns a coupled release into two independent steps:

1. **Apply the migration.** Production is unaffected: no new UI, no caller, no behaviour change.
   Verify it landed.
2. **Ship the frontend**, at whatever point afterwards is convenient.

The window between them is safe in the direction that matters. The dangerous order — FE first —
is simply never entered.

## Verification of the current state, not assumption of it

| Claim                        | How it was checked                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| The migration is not on prod | `supabase migration list` — `20260908230000` shows `local` set, `remote` **empty** |
| Everything else IS on prod   | Same listing: 25 of 26 migrations have both local and remote set                   |
| Construction is complete     | Bolts 059–062 all `status: complete`; units 001 and 002 both `complete`            |
| The suite is green           | 617/617 vitest, `tsc -b`, `eslint`, `prettier` — run at bolt 062 close             |
| The proxy is unchanged       | No diff under `supabase/functions/` in `origin/main..dev`                          |

## ⚠ `dev` is not pushed

`git log origin/dev..dev` shows **6 commits ahead**. This is the same shape as the PR #17 failure
this project has already had once: a PR opened, Netlify green, and **nothing shipped**, because the
branch behind the PR had never been pushed. A green build proves a build ran, not that the code
reached `main`.

**Push `dev` first.** Then open the PR. Then verify against `origin/main` — on the artifact, not
the PR page.

## Steps

1. **Apply the migration**

   ```bash
   npx supabase db push
   ```

2. **Verify it landed, on the database rather than on the CLI's word**

   ```bash
   npx supabase migration list          # 20260908230000 now has a remote timestamp
   ```

   Plus: the function exists, is `invoker` not `definer`, and carries `search_path=""` — the ADR-12
   property that a previous release had to be corrected for. Production is otherwise unchanged at
   this point; nothing calls the function yet.

3. **Push `dev`**

   ```bash
   git push origin dev
   git log --oneline origin/dev..dev     # must be EMPTY
   ```

4. **PR `dev` → `main`**, merge, let Netlify build `main`.

5. **Verify on `origin/main`, not on the PR page**

   ```bash
   git fetch origin && git log --oneline origin/main -1
   git show origin/main:src/features/recipe-entry/import/messages.ts | head -5
   git log --oneline origin/main..dev    # must be EMPTY
   ```

   If that `git show` prints the file, the feature is on `main`. If it errors, it is not —
   whatever Netlify says.

## Staging

**Proposed: n/a**, for the product owner to accept or reject.

The argument for skipping: the migration is additive and idempotent (`create or replace`), it
touches no existing row, constraint or policy, and it is covered by 22 pgTAP tests including the
atomicity proof. The frontend is a new page on a new route; every existing screen is untouched.

The argument against, which is not nothing: **this is the first release since v0.11.x to carry
SQL**, and intent 010's plan records a staging rehearsal on production data as the thing that
caught a real problem. A Supabase branch rehearsal is available.

My recommendation is **n/a**, because the migration's blast radius is genuinely a single new
function that nothing calls until step 4 — but this is a product owner decision and it is recorded
here as one rather than assumed.

## Rollback

**Database**: the function is additive and unreferenced until the FE ships. Rolling it back is
one statement, which the migration itself documents at line 61:

```sql
drop function if exists public.fn_create_dinner(text, text, integer, text, jsonb, text[], text[]);
```

No data to unwind — the function writes only what a user explicitly saves, and those are ordinary
`dinners` rows that the catalog already knows how to show.

**Frontend**: revert the merge commit on `main` and let Netlify rebuild. If the FE is rolled back
while the function stays, nothing breaks: an unused function is invisible.

## Checkpoint 1 — build approved, migration applied (2026-09-11)

Approved by the product owner with staging as **n/a**, and applied. The frontend was deliberately
NOT shipped in this step: it needs its own approval at Checkpoint 3.

### What was done

```
npx supabase db push --dry-run     # exactly one migration listed
npx supabase db push --yes         # applied
npx supabase migration list        # 20260908230000 now has a remote timestamp
```

### Verified on the database, not on the CLI's word

The CLI reporting success is a claim about the CLI. Three independent checks:

1. **The migration is registered remotely** — `20260908230000` now carries a remote timestamp
   alongside its local one.
2. **The function is reachable with the app's exact signature.** An RPC probe from a client
   authenticated against production called `fn_create_dinner` with the same seven parameters
   `api.ts` sends. It was refused with **23514 — "A dinner needs at least one ingredient"**, which
   is the function's own aggregate invariant. Had the function been missing, PostgREST would have
   answered `PGRST202`; had the grant been wrong, `42501`. Getting the domain rule back proves the
   function exists, is callable by an ordinary authenticated user, and is enforcing the model.
3. **The probe wrote nothing.** `dinners` filtered on the probe name returns zero rows — the
   transaction aborted whole, which is ADR-13's guarantee observed on production rather than
   argued.

The probe used `p_cook_time_minutes: 0` and an empty ingredient list precisely so it could not
commit. It was a question, not a write.

### Production state after this step

Unchanged from the family's point of view. There is a new function and nothing calls it, because
the live site still has no recipe entry page. The dangerous ordering — frontend before migration —
is now impossible to enter.

## Post-deploy smoke — https://dinnerideas.netlify.app

| #   | Action                                                  | Expected                                                                           |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Catalog → the entry point to add a dinner               | Present; route opens                                                               |
| 2   | Type a dinner in full and save                          | Lands in the catalog with its ingredients, steps and tags                          |
| 3   | Save a second dinner with the SAME name                 | Plain-language duplicate message; the draft survives, only the name needs changing |
| 4   | Paste a real recipe page, press "Get the recipe"        | Draft lands in the form; steps in order; no step lost                              |
| 5   | Check the cook time on a page that splits prep and cook | TOTAL of the two (the bolt 061 prompt fix)                                         |
| 6   | Leave the page without saving                           | Nothing written; the catalog is unchanged                                          |
| 7   | Import when the daily call limit is spent               | "That's all the recipe reading for today…", pasted text preserved                  |
| 8   | Existing screens — plan, shopping list, cooking         | Unaffected                                                                         |

## Open items carried into this release

- **`Daily call limit` is currently 10.** It was raised from 3 during bolt 062's live testing, at
  my request. That is a live household setting on a metered API and it should be set deliberately
  before release rather than left where a test session put it.
- **Bolt 068** (`intent 017`, `blocks: true`) remains planned and unstarted. It is unrelated to
  this release and is not a blocker for it, but it is the oldest open item in the project.
