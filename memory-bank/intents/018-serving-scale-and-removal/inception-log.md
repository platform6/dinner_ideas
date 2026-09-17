---
intent: 018-serving-scale-and-removal
phase: inception
status: complete
created: '2026-09-11T16:24:16Z'
updated: '2026-09-11T16:24:16Z'
---

# Inception Log: 018-serving-scale-and-removal

## Origin

Production use on release day. After v0.14.0 shipped, the product owner imported Mel's Kitchen
Cafe's salted chocolate toffee pretzel bark. The source states **8–10 servings** and **1 cup
(227 g) butter**. It was saved to the catalog as **0.33 cup butter**.

Nothing malfunctioned: the prompt told the model to rescale to 3 servings, and it did. **The rule
was wrong**, not its execution. A tray bake is made as a tray. "Three servings of bark" is not a
thing anyone makes.

## The second problem it exposed

The bark could not be corrected. `/dinners/new` is the only way to write a dinner, and the catalog
menu offers only "Not interested", which hides a dinner rather than deleting it. **v0.14.0 made the
catalog writable but not correctable.** That only shows up once something wrong has been saved.

## Decisions

| Checkpoint | Question                            | Decision                                                     |
| ---------- | ----------------------------------- | ------------------------------------------------------------ |
| 1          | Scope                               | Scaling + household setting + **delete**. Full edit deferred |
| 1          | The control                         | A toggle: scale to household size                            |
| 1          | When it applies                     | **Keep as written on import; offer scaling on review**       |
| 1          | Reach of the setting                | Replaces the hardcoded 3 everywhere                          |
| 2          | A ranged serving count ("8–10")     | Carried as stated; the user supplies the base if they scale  |
| 2          | Removing a cooked or planned dinner | Warn and proceed — do not refuse                             |
| 2          | Household versus dish yield         | Resolved by the default, not the setting (see below)         |

### The decision that changed the architecture

Moving scaling from import to **review** also moved the arithmetic **out of the model and into
code**. The model now reports what the page says, and tested code does the multiplication. A
shopping-list quantity can no longer be wrong because a language model divided badly, and the user
sees the source's own numbers first.

### The tension that was raised and resolved

A household serving size cannot be right for every dish, and a tray bake has its own natural
yield. It does not matter, because **nothing is scaled unless the user asks** (FR-4). A bark imports
as written, and the user simply does not press the button. The household setting is the target
offered, never a rule applied. Bolt 071's brief warns against later reintroducing automatic
scaling "because the household size is right there".

## Artifacts

- `requirements.md` — 6 FRs, 3 NFRs, all Checkpoint 1–2 decisions recorded
- `system-context.md` — the model/code boundary is the intent's real content
- `units.md` — 3 units, split by mechanism
- 3 unit briefs, 9 stories
- Bolts **069** (DDD), **070** (simple), **071** (simple), **072** (DDD)

## Sequencing

```text
069 ──> 070 ──> 071
072 (independent — could ship first)
```

Unit 003 (bolt 072) is the only way to correct anything already wrong in the catalog, the bark
included. **NFR-1** holds: no migration rewrites saved quantities, so the bark is fixed by
removing and re-importing it once 072 ships.

## Also found during this inception

The story-index headers for 013, 014, 015 and 016 were found claiming "not yet deployed" while all
four were live. That traced to a framework gap: Operations never owned the header. It was fixed
separately in commit d843d49 and is not part of this intent's scope.

## Ready for Construction

- [x] Requirements approved (Checkpoint 2)
- [x] Context, units, stories and bolts approved (Checkpoint 3)
- [x] Every open question resolved
- [x] Bolts have dependencies and complexity recorded
