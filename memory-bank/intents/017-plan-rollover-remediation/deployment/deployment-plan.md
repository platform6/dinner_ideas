---
intent: 017-plan-rollover-remediation
release: v0.11.2-44542b4
commit: 44542b4
units: [001-plan-uniqueness-scope]
created: '2026-09-08T17:45:00Z'
updated: '2026-09-08T17:45:00Z'
status: production-live
current_checkpoint: 4
follows: v0.11.1-6a0f5df
severity: outage-fix
environments:
  dev:
    status: verified
    target: 'local — pgTAP 361/361 on clean-slate reset (24-migration chain), vitest 317/317, tsc -b, eslint, vite build'
  staging:
    status: 'n/a — product owner decision 2026-09-08. Widening change; no data shape can fail it, and the invariant was already exercised against production data in a rolled-back transaction.'
  production:
    status: 'live 2026-09-08'
    target: 'Supabase linked gpkqsedtlzxczmarxjia + Netlify main'
    db: 'APPLIED 2026-09-08 — 20260908170000_plan_uniqueness_per_week.sql via supabase db push --linked. VERIFIED: pg_indexes reports btree (household_id, start_date) NULLS NOT DISTINCT WHERE (locked_at IS NULL), and the index comment matches. Smoke-tested against live data in a rolled-back transaction: a draft for a second week is ACCEPTED (previously 23505) and a same-week duplicate is still REJECTED.'
    fe: 'MERGED 2026-09-08 — PR #19, origin/main 050b410. Verified: the migration file is present on origin/main and 44542b4 is on origin/main. No application code in this release, so no behaviour change is expected from the merge itself.'
    edge_function: 'n/a'
---

# Deployment Plan: intent 017 — plan rollover remediation (release v0.11.2)

Current production is **v0.11.1** (`origin/main` @ `c4ca6d9`, PR #18, live 2026-09-08).

## Why this is urgent

The defect is **live**. Picking a dinner fails whenever the planning week rolls over with the
previous week's draft still unlocked. The household is unblocked today only because the stale draft
was locked by hand; the next rollover — within a week — reproduces it, and locking by hand requires
database access the product owner should not need for normal use.

## Scope

- **DB — one migration.** `20260908170000_plan_uniqueness_per_week.sql`, confirmed not present on
  `origin/main`. Rescopes one index. No table, column, RLS or function change.
- **FE** — no application code. `src/` is byte-identical to `origin/main`.
- **Edge Function** — none.
- **Not shipping**: unit 002 (bolt 068), deliberately.

## Ordering — unlike v0.11.1, this one matters

v0.11.1 was frontend-only and had no ordering question. This release is the mirror image: **it is
database-only**, and that makes the ordering unusually forgiving.

**Migration first, then merge (safe, and effectively a no-op ordering).** The running v0.11.1
frontend does not read the index; it just stops receiving a `23505` it never wanted. There is no
frontend change to sequence against, so the migration can be applied at any point without a
window in which the two disagree.

**Merge first, then migrate (also safe).** The `main` merge changes no shipped behaviour — the
payload is a migration file and pgTAP tests, neither of which Netlify's bundle contains.

→ **Either order works.** Apply the migration first anyway, because it is the part that fixes the
defect and the merge is only bookkeeping. Stated explicitly so the absence of a hazard reads as a
conclusion rather than an oversight.

## Rollback

**Asymmetric — read before rolling back.** Recreating the single-column index is a **narrowing**
change and will fail once any household holds drafts for two different weeks, which is the state
this release exists to permit.

The migration carries the query to find offenders:

```sql
select household_id, count(*), array_agg(start_date order by start_date)
from public.weekly_plans where locked_at is null
group by household_id having count(*) > 1;
```

Resolve each (lock the intended plan, or delete the abandoned one), then recreate the old index.

Rolling back also restores the outage, so it is a last resort rather than a routine option.

## Staging — n/a, and the reason is stronger than last time

- **v0.10.0** rehearsed against production data: its cutover had gates that could fail on real data.
- **v0.11.0** skipped it: an additive column and backfill cannot fail on data.
- **v0.11.1** skipped it: no data or schema involved at all.
- **v0.11.2**: the change is **widening**. Adding a column to a unique key can only permit more
  combinations, never fewer, so every existing row satisfies the new index by construction. There
  is no data shape on which this can fail.

Beyond that argument, the invariant has already been exercised **against production data** in a
rolled-back transaction — all four cases, on the real schema with the real rows. That is stronger
evidence than a staging environment would produce.

Product owner's call at Checkpoint 2.

## Progression

| Checkpoint | Stage                  | State                       |
| ---------- | ---------------------- | --------------------------- |
| 1          | Build approval         | ✅ approved 2026-09-08      |
| 2          | Staging decision       | ✅ n/a, 2026-09-08          |
| 3          | Production deploy      | ✅ live 2026-09-08 (PR #19) |
| 4          | Monitoring / close-out | ✅ closed 2026-09-08        |

## Production steps, when approved

1. ✅ **`git push origin dev`** — done 2026-09-08, `origin/dev` @ `fe3160c`
2. ✅ Apply the migration — done 2026-09-08 via `npx supabase db push --linked`
3. ✅ **Verify the index actually changed** — done; `pg_indexes` confirms the composite key
   (original instruction retained below, because it is the step worth repeating), rather than trusting the command's exit code:
   ```sql
   select indexdef from pg_indexes where indexname = 'idx_weekly_plans_one_unlocked';
   -- expect: ... USING btree (household_id, start_date) NULLS NOT DISTINCT WHERE (locked_at IS NULL)
   ```
   This check exists because the migration's own design notes flag the failure mode: a
   `create ... if not exists` would silently no-op. The migration uses `drop` + `create`, but the
   verification is cheap and the failure would be invisible.
4. ✅ **Opened and merged as PR #19** (`origin/main` 050b410). **Confirm the PR diff shows the migration and the two pgTAP
   files** — a PR showing only `.md` is the PR #17 failure repeating
5. Netlify builds `main`; confirm green. No behaviour change is expected — this release contains
   no application code
6. **Smoke the actual fix**: pick a dinner. It should work. For a fuller check, confirm a draft can
   exist for an older week alongside the current one
7. Record the release here and close Checkpoint 4

## Post-deploy

- **Carried from v0.11.1: the scroll check**, waived before that release and still outstanding.
  Mid-shop, scroll into a part-checked list, move an item whose group jumps to the top, confirm the
  list does not slide out from under you. Phone first, then a wide window.
- **Advisors** — unchanged practice: the product owner monitors, since this session's Supabase MCP
  is a different account. This release adds no table, policy or function, so no new advisor surface.
- **Unit 002 (bolt 068)** remains planned: the catalog still advises retrying a failure that cannot
  be retried.

---

## Post-deploy record — 2026-09-08

**v0.11.2 is live.** Migration applied at 17:5x UTC; PR #19 merged to `origin/main` @ `050b410`.

### Verified rather than assumed

| Check                      | Result                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `pg_indexes` definition    | `btree (household_id, start_date) NULLS NOT DISTINCT WHERE (locked_at IS NULL)`      |
| Index comment              | Matches the new rule                                                                 |
| Live smoke, rolled back    | Second-week draft **ACCEPTED** (was `23505`); same-week duplicate still **REJECTED** |
| Stray rows afterwards      | 0                                                                                    |
| Migration on `origin/main` | Present; `44542b4` is on `origin/main`                                               |
| Unreleased code remaining  | None                                                                                 |

The index definition was checked directly rather than inferred from the push command's exit code —
the migration's design notes flag that a `create ... if not exists` would silently no-op, and that
failure would be invisible.

### What this closes

Next week's rollover will not break. The workaround that unblocked the household — locking a stale
draft by hand — is no longer needed, and required database access a product owner should not need
for ordinary use.

### Still open

- **The scroll check** from v0.11.1, waived and never performed. Now checkable against the live
  site.
- **Bolt 068** (unit 002): the catalog still advises retrying a failure that cannot be retried.
  `Should`, and this particular failure is now unreachable.
