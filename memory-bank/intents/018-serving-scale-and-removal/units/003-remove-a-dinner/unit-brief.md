---
unit: 003-remove-a-dinner
intent: 018-serving-scale-and-removal
phase: inception
status: complete
created: '2026-09-11T16:24:16Z'
updated: '2026-09-11T16:24:16Z'
---

# Unit Brief: Remove A Dinner

## Purpose

Let a dinner be taken out of the catalog. Release v0.14.0 made the catalog writable; this makes it
correctable.

## Scope

### In Scope

- Deleting a dinner and its ingredients, steps and tag links, atomically
- A catalog entry point, beside the existing "Not interested"
- Confirmation, and a plain warning when the dinner has history

### Out of Scope

- Editing a dinner — explicitly deferred at Checkpoint 1
- Undo. Removal is permanent, which is why it is confirmed
- Any change to "Not interested", which stays as the non-destructive option

## Notes

**The only destructive operation in the project.** Everything else adds or adjusts.

Checkpoint 2 settled the product question — **warn and proceed**, do not refuse. Refusing would
leave a wrong recipe permanently in the catalog the moment anybody cooked it, which is the exact
trap this intent exists to escape.

What it must NOT do is leave the database inconsistent. NFR-3 holds it to the standard ADR-13 set
for the write: all of it, or none of it.

## Stories

- `001-remove-a-dinner` — A dinner can be deleted, with its children (Must)
- `002-confirm-before-removing` — Removal is confirmed, and says what it affects (Must)
- `003-removal-tests` — The destructive path is covered (Must)
