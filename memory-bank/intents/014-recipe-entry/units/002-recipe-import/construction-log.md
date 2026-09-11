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

That manual pass was recorded as outstanding rather than left for green checkmarks to imply,
because the whole risk of this bolt sits in the half the suite cannot reach. It was run the same
day — see below. It passed, and it found three things the suite could not have.

## Manual extraction pass (2026-09-10)

Run live against the real proxy and the household key. Two pages of opposite shape: Smitten
Kitchen's "pizza beans" (story-heavy blog, **131 KB**, overruns the budget ~3x) and Allrecipes'
"Thai Red Curry Soup" (bare card, 8 KB, no trim). Full results in bolt 061's `test-walkthrough.md`.

**The DoD line holds.** 14 of 14 source actions preserved on page 1, 11 of 11 on page 2, every
compression a legal merge rather than a deletion. The rescale is exact on both (x0.375 and x0.5,
checked ingredient by ingredient). Tag proposal works — `shrimp` proposed from the vocabulary,
nothing invented. **The no-omission rule held under real length pressure**, which is the risk the
bolt was shaped around and the thing no unit test could reach.

### Findings

**4. The prompt's numeric instructions are being read as suggestions, but its prohibitions are
not.** "Never drop a cooking step" held perfectly across 25 source actions. "Around 80 characters"
produced 197 and 133. Same prompt, same model, same call — the difference is that one is a
prohibition with a stated reason and an offered alternative, and the other is a number in the
middle of a sentence. Useful to know before writing more prompt: **state limits as rules with
consequences, not as adjectives.**

**5. An ambiguity the prompt never resolves: which time to take.** A page giving Prep 25 / Cook 25 /
Total 50 produced a cook time of **25**. A page giving one number produced that number. Both are
defensible readings of a silent instruction, and one of them puts a 50-minute dinner in the catalog
labelled 25 minutes. The spec has always said "cook time" without saying cook time _of what_.

**6. Rate limiting proved story 004 is not cosmetic.** The pass ended on the household's daily cap.
The placeholder copy said the service "couldn't be reached" — false, and it points at a retry that
cannot succeed. The real message ("you are out of calls until tomorrow") is a different action for
the user, not a nicer sentence.

## Prompt fixes (2026-09-11)

Findings 4 and 5 fixed in `prompt.ts` and re-verified against the pages that produced them. Cook
time on the split-time page went **25 → 50**; summaries went **197 → 90** and **133 → 97**. Step
coverage unchanged on both pages (14/14 and 11/11), which was the thing worth checking — cutting a
summary by more than half is real length pressure, and "compress the wording, never drop a step to
make room" is what kept the step list whole. 557/557 green.

The `no-recipe` branch was also closed: a page of editorial boilerplate returned exactly
`{"error": "no recipe found"}`. Every live path in this bolt has now been exercised.

### Finding

**7. The fix for finding 4 was to apply finding 4.** "Around 80 characters" was ignored twice;
"Never longer than 100 characters", with a consequence attached and an escape route offered,
held on both pages at 90 and 97. Same model, same call, same prompt — the difference is entirely in
how the limit was phrased. The lesson from the manual pass turned out to be directly actionable on
the manual pass's own findings, which is the cheapest kind of lesson to have.

Worth carrying into bolt 062's error copy and any later prompt work: **a number stated as a
preference is advisory; a number stated as a rule with a named cost is followed.**

## Bolt 062 — import review and messages (2026-09-11)

Stories 004, 005, 006. The draft now lands in the same form manual entry uses, every failure says
which thing went wrong and what to do about it, and the boundary is covered. **Unit 002 complete.**

**617 / 617 vitest** (+60), `tsc -b`, `eslint`, `prettier` clean. No SQL. The unit still writes
nothing of its own.

### Findings

**8. "Every code has a message" is not the test the story was asking for.** Story 004 wants five
codes and five distinct messages, and the obvious per-code assertion passes just as happily when
three of them are the same sentence. The suite compares set size against count instead. Same shape
as the running "an assertion is only a test if a plausible defect would break it" thread — the
plausible defect here is not a missing message, it is a duplicated one, and only the set-size form
can see it.

**9. Three tests assert an ABSENCE, and those are the ones that will earn their keep.**
`no_api_key` must not contain "error/failed/sorry/wrong"; `rate_limited` must not say "try again";
no message may contain a code or a bare HTTP status. Copy gets tidied later by someone who wants
the five messages to sound consistent, and consistency is exactly the bug: `rate_limited` is the
one failure where retrying is useless, and a household without a key has not failed at all. The
absence assertions are what make that tidy-up fail loudly instead of quietly.

**10. The structural guarantee is now held by a test as well as by the shape.** `createDinner` is
unreachable from the import path, and a test asserts it is not called after an import. FR-7's
"review cannot be skipped" was always an argument about code shape; it is now also something that
breaks a build if the shape changes.

### Verified live, not just green

The handoff was run against the real proxy: a real page imported, landed on the form tab with
cook time 50, 18 ingredients and 6 steps in order, no red validation on a fresh draft — and
navigating away left the catalog unchanged. FR-7 observed rather than argued.

`rate_limited` was reached honestly mid-testing and rendered its own message. Yesterday the same
event said "The AI service couldn't be reached", which was false and pointed at a retry that could
not succeed. That single comparison is the whole value of story 004.

### Operational note, not a defect

The household `Daily call limit` was **3**, which blocked live testing on two consecutive days. It
is a `/settings` field, raised to 10 by the product owner to finish this pass. Worth a deliberate
choice before release rather than leaving it where it happens to sit: 3 is a fair guard on a
metered API for family use and tight during a build.

### Unit 002: complete

Both bolts done. Paste a page, get a draft in the founding format or an honest failure, review it
in the same form you would have typed into, save it through unit 001's path. The unit writes
nothing itself, by construction.

**Intent 014 is now built** — bolts 059, 060, 061, 062 — and not yet deployed. The `create_dinner`
RPC migration (`20260908230000`) is still pending on production, which makes this release Operations'
concern rather than an FE-only push.
