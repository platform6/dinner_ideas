---
unit: 002-recipe-import
intent: 014-recipe-entry
created: '2026-09-10T19:28:55Z'
---

# Construction Log: 002-recipe-import

## Bolt 061 — recipe extraction (2026-09-09 → 2026-09-10)

Stories 001, 002, 003. Pasted page text becomes a draft in the founding format, or a typed
failure. Three modules in `recipe-entry/import/` plus the paste box on the tab bolt 059 shipped
inert. Bolt 062 still owns the error copy and the handoff into the form, so this bolt ends at a
typed result rather than a finished journey.

**553 / 553 vitest** (+102), `tsc -b`, `eslint`, `prettier` clean. No SQL, no schema change, no
change to the proxy — it stays frozen. Second caller of `claude-proxy` after bolt 039's connection
test.

### Findings

**1. A binary search over the string index does not stop you splitting an emoji.** The trim was
built to a budget in UTF-8 bytes, searching over the **string index** rather than slicing the byte
array — and the comment claimed that made cutting a character in half impossible. It is not. An
astral character is a **surrogate pair occupying two indices**, so the cut can land between them,
and the resulting lone high surrogate encodes as U+FFFD (3 bytes) — which the search then measures
as fitting. `trimToBytes('🍤', 3)` returned `'�'`.

Two- and three-byte characters were never at risk, one index each, so `é`, `½`, `—` and curly
quotes — everything the comment listed as motivating the design — were always safe. Only the
four-byte case, the one it named last, was wrong. **A guarantee asserted in a comment is not a
guarantee until a test has tried to break it**; this one had been written down twice, in the code
and in the walkthrough, and was false both times.

**2. Half the defects this stage were in the tests.** Two of the four initial failures were wrong
expectations of mine, not wrong code: `½` asserted as three UTF-8 bytes (it is two — U+00BD sits
below U+0800, and only U+0800 and above reach three), and a trim test whose "recipe" half did not
actually overrun the budget, so a sliver of the tail legitimately survived and the assertion was
simply wrong about its own arithmetic.

Worth recording alongside the running "an assertion is only a test if a plausible defect would
break it" thread from bolts 059, 065 and 066. That thread is about tests too weak to fail. This is
its neighbour: **a test that fails can be wrong too, and a red test is not automatically an
indictment of the code.** Checking which of the two is wrong is the work; assuming the
implementation is guilty would have "fixed" `byteLength` into incorrectness.

**3. Green unit tests here do not touch the first line of the Definition of Done.** The plan said
this before implementation and it survived contact: prompt behaviour is not unit-testable. The
suite proves the budget, the trim, the parser against every malformed shape, the tag rules, and
that a well-formed reply becomes a draft `validateDraft` accepts. It cannot prove that a real
recipe page yields a correct draft with no step lost — the thing the bolt exists to guarantee, and
the requirement the product owner pushed back to add.

That manual pass against real pages and a real key has **not been run**. Recorded as outstanding
rather than left for green checkmarks to imply, because the whole risk of this bolt sits in the
half the suite cannot reach.

### Outstanding for this unit

- **Manual extraction-quality pass** (carried from bolt 061's DoD): several real pages of different
  shapes — story-heavy blog, bare recipe card, printed-recipe view — checked for a correct draft in
  both layers with no step lost, and for the 3-serving rescale
- **Bolt 062**: proxy error messages (story 004), the draft's handoff into unit 001's form
  (story 005), and the import tests (story 006)
