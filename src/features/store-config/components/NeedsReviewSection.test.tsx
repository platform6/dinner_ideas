import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NeedsReviewSection } from '@/features/store-config/components/NeedsReviewSection';
import { theme } from '@/shared/theme';
import type { ResolvedItem } from '@/features/store-config/types';

/**
 * Fixture rule for this unit (story 006).
 *
 * Items default to **inherited and reviewed**, because that is production's shape after intent
 * 010's cutover and bolt 055's backfill: all 121 groceries inherit a stop from their category,
 * and everything predating the feature is marked.
 *
 * Intent 010's suites passed 290/290 over a feature nobody could reach, because their fixtures
 * built `unassigned` items directly — a state the model cannot produce, since
 * `dinner_ingredients.category` is NOT NULL over five values and the cutover placed all five.
 * A fixture that cannot occur in production proves nothing about production.
 *
 * A test needing an unassigned item must construct a genuine **registry orphan** — see
 * `orphan()` — rather than setting the state by hand.
 */
const REVIEWED = '2026-09-05T00:00:00Z';

function item(overrides: Partial<ResolvedItem> & Pick<ResolvedItem, 'itemId' | 'itemName'>): ResolvedItem {
  return {
    nameKey: overrides.itemName.trim().toLowerCase(),
    category: 'Grains',
    state: 'inherited',
    locationId: 'loc-1',
    locationName: 'Produce',
    locationPosition: 1,
    viaCategory: 'Grains',
    reviewedAt: REVIEWED,
    ...overrides,
  };
}

/** Unreviewed: what a newly imported ingredient looks like the moment its Item is registered. */
const arrived = (overrides: Partial<ResolvedItem> & Pick<ResolvedItem, 'itemId' | 'itemName'>) =>
  item({ ...overrides, reviewedAt: null });

/**
 * The ONLY honest way to build an unassigned item: an Item whose dinners were deleted, so it
 * derives no category and therefore inherits nothing. Everything else about it follows.
 */
const orphan = (overrides: Pick<ResolvedItem, 'itemId' | 'itemName'>) =>
  item({
    ...overrides,
    category: null,
    viaCategory: null,
    state: 'unassigned',
    locationId: null,
    locationName: null,
    locationPosition: null,
    reviewedAt: null,
  });

/** An item the user placed by hand — the only kind similarity treats as evidence. */
const placed = (
  overrides: Pick<ResolvedItem, 'itemId' | 'itemName'> & { locationId: string; locationName: string },
) => item({ ...overrides, state: 'placed', viaCategory: null });

function renderSection(props: Partial<Parameters<typeof NeedsReviewSection>[0]> = {}) {
  const onAccept = vi.fn();
  const onMove = vi.fn();
  const onAcceptSuggestion = vi.fn();

  render(
    <ChakraProvider theme={theme}>
      <NeedsReviewSection
        unreviewedItems={[]}
        allItems={[]}
        dismissedItemIds={new Set()}
        isSaving={false}
        onAccept={onAccept}
        onMove={onMove}
        onAcceptSuggestion={onAcceptSuggestion}
        {...props}
      />
    </ChakraProvider>,
  );

  return { onAccept, onMove, onAcceptSuggestion };
}

describe('NeedsReviewSection — the queue', () => {
  it('lists unreviewed items whatever their placement state', () => {
    const unreviewed = [
      arrived({ itemId: 'a', itemName: 'whole wheat spaghetti' }),
      orphan({ itemId: 'b', itemName: 'forgotten thing' }),
    ];
    renderSection({ unreviewedItems: unreviewed, allItems: unreviewed });

    // An INHERITED item belongs here. The old section listed only `unassigned`, which is why it
    // was permanently empty.
    expect(screen.getByText('whole wheat spaghetti')).toBeInTheDocument();
    expect(screen.getByText('forgotten thing')).toBeInTheDocument();
  });

  it('renders an orphan neutrally, with no stop and no warning styling', () => {
    const items = [orphan({ itemId: 'b', itemName: 'forgotten thing' })];
    renderSection({ unreviewedItems: items, allItems: items });

    expect(screen.getByText('No spot yet')).toBeInTheDocument();
  });

  it('is calm and vacuously true when nothing is outstanding', async () => {
    const user = userEvent.setup();
    renderSection({ unreviewedItems: [], allItems: [] });

    // Collapsed by itself when empty — the header carries the message.
    expect(screen.getByText('Nothing new to check')).toBeInTheDocument();

    // And expanding it says the same thing rather than showing an empty box.
    await user.click(screen.getByRole('button', { name: /New — needs review/ }));
    expect(screen.getByText('Nothing new to check.')).toBeInTheDocument();
  });

  it('accepting hands back the item, so the page can mark it reviewed without placing it', async () => {
    const items = [arrived({ itemId: 'a', itemName: 'whole wheat spaghetti' })];
    const user = userEvent.setup();
    const { onAccept } = renderSection({ unreviewedItems: items, allItems: items });

    await user.click(screen.getByRole('button', { name: 'whole wheat spaghetti is in the right place' }));

    expect(onAccept).toHaveBeenCalledWith(items[0]);
  });
});

describe('NeedsReviewSection — suggestions', () => {
  it('shows nothing when the household has never placed anything by hand', () => {
    // Day one. Every item inherits, so the candidate pool is empty and no row can be advised.
    // Documented behaviour, not a defect — the feature bootstraps once placements exist.
    const items = [arrived({ itemId: 'a', itemName: 'sourdough starter' })];
    renderSection({ unreviewedItems: items, allItems: items });

    expect(screen.queryByRole('button', { name: /^Put sourdough starter in/ })).not.toBeInTheDocument();
  });

  it('suggests the stop where a similar item was placed by hand', () => {
    const arrival = arrived({ itemId: 'a', itemName: 'sourdough bread' });
    const evidence = placed({
      itemId: 'p',
      itemName: 'sourdough bread rolls',
      locationId: 'loc-3',
      locationName: 'Bakery',
    });
    renderSection({ unreviewedItems: [arrival], allItems: [arrival, evidence] });

    // Interpolated across text nodes, so matched on the element's whole textContent.
    expect(
      screen.getByText((_, el) => el?.textContent === 'You put sourdough bread rolls in Bakery'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Put sourdough bread in Bakery' })).toBeInTheDocument();
  });

  it('suppresses a suggestion that just restates where the item already sits', () => {
    // The similar item was placed at loc-1 — exactly where this item already inherits to.
    // Agreeing with the status quo is noise; silence is more useful.
    const arrival = arrived({ itemId: 'a', itemName: 'sourdough bread', locationId: 'loc-1' });
    const evidence = placed({
      itemId: 'p',
      itemName: 'sourdough bread rolls',
      locationId: 'loc-1',
      locationName: 'Produce',
    });
    renderSection({ unreviewedItems: [arrival], allItems: [arrival, evidence] });

    expect(screen.queryByRole('button', { name: /^Put sourdough bread in/ })).not.toBeInTheDocument();
  });

  it('respects a dismissed pairing', () => {
    const arrival = arrived({ itemId: 'a', itemName: 'sourdough bread' });
    const evidence = placed({
      itemId: 'p',
      itemName: 'sourdough bread rolls',
      locationId: 'loc-3',
      locationName: 'Bakery',
    });
    renderSection({
      unreviewedItems: [arrival],
      allItems: [arrival, evidence],
      dismissedItemIds: new Set(['p']),
    });

    expect(screen.queryByRole('button', { name: /^Put sourdough bread in/ })).not.toBeInTheDocument();
  });

  it('accepting a suggestion hands back the item and the stop it should go to', async () => {
    const arrival = arrived({ itemId: 'a', itemName: 'sourdough bread' });
    const evidence = placed({
      itemId: 'p',
      itemName: 'sourdough bread rolls',
      locationId: 'loc-3',
      locationName: 'Bakery',
    });
    const user = userEvent.setup();
    const { onAcceptSuggestion } = renderSection({
      unreviewedItems: [arrival],
      allItems: [arrival, evidence],
    });

    await user.click(screen.getByRole('button', { name: 'Put sourdough bread in Bakery' }));

    expect(onAcceptSuggestion).toHaveBeenCalledWith(arrival, 'loc-3');
  });
});
