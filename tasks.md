# Roadmap / task inbox

## Not yet an intent

- Let's make the scaling section an acordian in green - that says simply "Adjust based on household option" and put just above tags
- For dinner catalog I would like to be able to search by text to narrow the available dinner.
  Add a search bar that searchs the recipe titles
- Add pagination on dinner catalog and a total recipe count on the bottom for both desktop and mobile
- For recipe entry add a URL field. This is an optional field in manual entry and in the import section.
- on /settings hide anthropic api key input element when a key is already set
- It is not clear from the add a dinner form that the hint default text is just the hint default text from a design perspective.

**Critical / fix-first**

- "This week's plan" copy says "Locks these 3 dinners" and "All three picked" while displaying 5 dinner cards. Numbers hard-coded from an earlier version of the feature don't match current state — this is the kind of bug that makes users distrust every other number on the page (shopping list counts, "5 of 5", etc.).
- Recipe titles on unpicked cards render in a low-contrast muted brown/taupe on a cream background (confirmed via zoom). This almost certainly fails WCAG AA contrast and makes the primary content of the card — the recipe name — the hardest thing to read.
- The shopping list doesn't consolidate similar ingredients ("chicken thighs" and "chicken thighs, cubed" listed separately in Protein). For a tool whose entire value proposition is generating a usable grocery list, this undermines the core job.

**Broken or inconsistent interactions**

- Expanding "Details" on a card in the two-column grid doesn't reflow the layout — the neighboring card just sits next to a tall stretch of empty space, breaking the grid instead of stacking or pushing content down gracefully.
- Two different links ("Add a dinner" vs. "Add dinner") point to the same destination — small but signals copy wasn't proofread across the app.
- The default "aisle" category assigned to a new ingredient ("Chicken thighs") in Add a Dinner is "Produce," not "Protein" — a wrong default that will quietly corrupt shopping lists for anyone who doesn't double-check every ingredient row.
- The eye-icon button next to "Add dinner" (which opens "Not interested" / suppressed recipes) has no visible label or tooltip and isn't in the main sidebar nav like every other section — it's a genuinely useful page that's nearly undiscoverable.
- Select-all (Ctrl+A) inside the "Add a dinner" Name field produced unexpected text mutation rather than a clean selection — worth a real QA pass on form field event handling.

**Weak or missing feedback / affordances**

- The "Full" lock badge on unpicked cards (once 5 picks are used) is rendered in the same low-contrast muted tone as everything else, so it's easy to miss why a checkbox is disabled. It should be a clearer, higher-contrast state with a tooltip explaining "remove a pick to add this one."
- Cooking mode lists steps as static text with no way to check off a step, no timer despite showing "40 min," and no next/previous focus — for a "cooking mode" this is a missed opportunity to actually be useful hands-at-the-stove.
- The Cuisine/Tags filter dropdowns have no "Apply," "Clear," or visible count of matches, and no search-within-list for what could become a long checkbox list.
- Empty aisles in Store Setup just say "Nothing here yet" with no delete/hide affordance visible for aisles you'll never use, cluttering the walking-path view over time.

**Polish / visual hierarchy**

- The serif display font for headings ("Dinner catalog," "Shopping list") is nice, but combined with the muted secondary text color everywhere, the whole app reads as slightly washed out — there's very little visual hierarchy beyond size; almost everything is the same low-saturation palette.
- The small store-icon button on each shopping list row (opens an aisle-assignment modal) has no label/tooltip and looks identical to a decorative icon at a glance — first-time users won't know it's interactive without hovering or clicking blind.
- Sidebar navigation mixes primary nav (Catalog, This Week, List, Cooking) with secondary/settings nav (Store setup, Settings, Log out) with no visual separation beyond a thin divider and no section labels — fine at this size, but will get harder to scan as more items are likely added.
