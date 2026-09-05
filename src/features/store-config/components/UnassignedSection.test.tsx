import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UnassignedSection } from '@/features/store-config/components/UnassignedSection';
import { theme } from '@/shared/theme';
import type { ResolvedItem } from '@/features/store-config/types';

/**
 * Fixtures default to REVIEWED because that is what production looks like after bolt 055's
 * backfill: every item that predates the feature is marked, and only newly registered ones
 * are null. A fixture defaulting to unreviewed would describe a state these suites never meet.
 */
const REVIEWED = '2026-09-05T00:00:00Z';

function item(name: string, category: string | null = 'Produce'): ResolvedItem {
  return {
    itemId: `id-${name}`,
    itemName: name,
    nameKey: name.toLowerCase(),
    category,
    state: 'unassigned',
    locationId: null,
    locationName: null,
    locationPosition: null,
    viaCategory: null,
    reviewedAt: REVIEWED,
  };
}

/** In a recipe; the default scope shows these. */
const inRecipe = [item('kale'), item('cheddar', 'Dairy')];
/** In the registry but used by no active recipe — reachable only through search. */
const orphan = item('quince paste', 'Pantry');

function renderSection(overrides: Partial<Parameters<typeof UnassignedSection>[0]> = {}) {
  const props = {
    unassignedItems: [...inRecipe, orphan],
    inRecipeNameKeys: new Set(inRecipe.map((entry) => entry.nameKey)),
    onPlace: vi.fn(),
    ...overrides,
  };

  render(
    <ChakraProvider theme={theme}>
      <UnassignedSection {...props} />
    </ChakraProvider>,
  );

  return props;
}

async function expand() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /not on the path yet/i }));
  return user;
}

describe('UnassignedSection', () => {
  it('states the consequence rather than the condition, and counts only the default scope', () => {
    renderSection();

    expect(screen.getByText('Not on the path yet')).toBeInTheDocument();
    // 2 in-recipe items, not 3 — the orphan is out of the default scope.
    expect(screen.getByText('2 groceries sort to the end')).toBeInTheDocument();
  });

  it('uses the singular when exactly one grocery is affected', () => {
    renderSection({
      unassignedItems: [inRecipe[0]],
      inRecipeNameKeys: new Set([inRecipe[0].nameKey]),
    });

    expect(screen.getByText('1 grocery sorts to the end')).toBeInTheDocument();
  });

  it('is collapsed by default', () => {
    renderSection();
    expect(screen.queryByRole('textbox', { name: /search all groceries/i })).not.toBeInTheDocument();
  });

  it('lists only in-recipe items when expanded with no search term', async () => {
    renderSection();
    await expand();

    expect(screen.getByText('kale')).toBeInTheDocument();
    expect(screen.getByText('cheddar')).toBeInTheDocument();
    expect(screen.queryByText('quince paste')).not.toBeInTheDocument();
  });

  it('shows each result with its category and a Place action', async () => {
    renderSection();
    await expand();

    expect(screen.getByText('Dairy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /place kale/i })).toBeInTheDocument();
  });

  it('search reaches past the default scope into the full catalog', async () => {
    renderSection();
    const user = await expand();

    await user.type(screen.getByRole('textbox', { name: /search all groceries/i }), 'quince');

    // An item used in zero recipes is still findable — the search field is what widens the scope.
    expect(screen.getByText('quince paste')).toBeInTheDocument();
    expect(screen.queryByText('kale')).not.toBeInTheDocument();
  });

  it('reads calmly when everything already has a spot', async () => {
    renderSection({ unassignedItems: [], inRecipeNameKeys: new Set() });
    await expand();

    expect(screen.getByText('Everything has a spot on the path.')).toBeInTheDocument();
  });

  it('quotes an unmatched search term back rather than warning', async () => {
    renderSection();
    const user = await expand();

    await user.type(screen.getByRole('textbox', { name: /search all groceries/i }), 'saffron');

    expect(screen.getByText(/nothing matching/i)).toHaveTextContent('saffron');
  });

  it('opens the assign flow for the chosen item', async () => {
    const { onPlace } = renderSection();
    const user = await expand();

    await user.click(screen.getByRole('button', { name: /place cheddar/i }));

    expect(onPlace).toHaveBeenCalledWith(expect.objectContaining({ itemName: 'cheddar' }), expect.anything());
  });
});
