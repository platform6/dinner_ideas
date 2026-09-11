---
intent: 018-serving-scale-and-removal
phase: inception
status: units-defined
updated: '2026-09-11T16:24:16Z'
---

# Units: Scaling and Removal

## Decomposition Principle

Split by mechanism, not by screen. These three pieces arrived from one bug report, but they fail in
completely different ways: one is a column, one is arithmetic taken away from a model, and one is a
destructive database operation. Nothing is learned by building them together.

## Unit Summary

| Unit                       | Name                | Requirements     | Depends on | Cuttable |
| -------------------------- | ------------------- | ---------------- | ---------- | -------- |
| `001-serving-size-setting` | Servings Per Dinner | FR-1, FR-6       | none       | No       |
| `002-scale-on-review`      | Scale On Review     | FR-2, FR-3, FR-4 | 001        | No       |
| `003-remove-a-dinner`      | Remove A Dinner     | FR-5, NFR-3      | none       | **Yes**  |

**Unit 003 is genuinely independent** — it shares no code with the other two and could ship first,
last, or alone. It is listed third because the scaling fix is what was actually reported, but if
only one thing ships, removal is arguably the more valuable: it is the only way to correct anything
already wrong in the catalog.

## Unit 001: Servings Per Dinner

**Owns**: the `households.servings_per_dinner` column, the `/settings` control that writes it, and
every site that currently hard-codes 3 — the extraction prompt and the ingredients editor's
guidance line.

**Why the literal sweep is here and not in 002**: it is the same mechanical "stop hard-coding a
number" work `dinners_per_week` did in intent 015, and grouping it with the column keeps one
decision in one place. Unit 002 _consumes_ the setting; it should not also be the thing that
introduces it.

**The risk it carries**: almost none. An additive column with a default, and a grep. Intent 015's
bolt 063 is the template, minus the trigger rewrite that made that one interesting.

## Unit 002: Scale On Review

**Owns**: removing the rescaling instruction from the prompt, carrying the source's stated serving
count through the parser into the draft, and the review-form control that performs the scaling in
pure client code.

**Why it is the centre of this intent**: it moves arithmetic out of a language model. Everything
else here is a column and a button.

**The risk it carries, and it is real**:

- **Decimal quantities.** Scaling 1 cup by 3/9 gives 0.333…. The current extraction produced
  "0.33 cup", which is at least measurable. Code doing this properly has to decide about rounding,
  and a wrong decision here is a quantity nobody can measure — the same harm the bug report was
  about, arrived at from the other direction.
- **Reversibility.** FR-3 requires undo. That means the source quantities must survive the scaling
  operation, so scaling cannot be destructive in-place.
- **A ranged serving count.** Resolved at Checkpoint 2 as "the user supplies the base", which means
  the control needs a path for that and must not pretend a range is a number.

## Unit 003: Remove A Dinner

**Owns**: the delete path — the database side (cascade or RPC), the catalog menu entry, the
confirmation, and the warning when a dinner has history.

**Why it is separate**: it is the only destructive operation in the project. Everything else in
this intent adds or adjusts; this removes rows a plan or meal history may reference.

**The risk it carries**: referential. `dinner_last_chosen`, meal history and plan selections all
point at dinners. Checkpoint 2 settled the product question — warn and proceed — but what happens
to a locked plan that referenced the removed dinner is a design question this unit has to answer,
not dodge.

## Sequencing

```text
001 ──> 002
003 (independent, any time)
```

002 cannot start before 001, because it reads the setting 001 creates. 003 touches neither.
