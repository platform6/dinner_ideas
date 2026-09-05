import { useRef, useState } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AssignSheet } from '@/features/store-config/components/AssignSheet';
import { theme } from '@/shared/theme';
import type { Location, ResolvedItem } from '@/features/store-config/types';

/**
 * The similarity engine is deliberately NOT mocked here (story 007's technical note): these
 * fixtures are scored for real, so a change that breaks the cutoff or the candidate contract
 * fails this file rather than passing against a stub.
 */

/**
 * Fixtures default to REVIEWED because that is what production looks like after bolt 055's
 * backfill: every item that predates the feature is marked, and only newly registered ones
 * are null. A fixture defaulting to unreviewed would describe a state these suites never meet.
 */
const REVIEWED = '2026-09-05T00:00:00Z';

function location(id: string, name: string, position: number): Location {
  return {
    id,
    name,
    position,
    household_id: 'hh-1',
    store_id: 'store-1',
    type: name.toLowerCase().startsWith('aisle') ? 'aisle' : 'section',
    created_at: '2026-09-04T00:00:00Z',
  };
}

function item(overrides: Partial<ResolvedItem> & Pick<ResolvedItem, 'itemId' | 'itemName'>): ResolvedItem {
  return {
    nameKey: overrides.itemName.toLowerCase(),
    category: 'Pantry',
    state: 'unassigned',
    locationId: null,
    locationName: null,
    locationPosition: null,
    viaCategory: null,
    reviewedAt: REVIEWED,
    ...overrides,
  };
}

const locations = [location('loc-1', 'Produce', 1), location('loc-2', 'Aisle 2', 2)];

/** A placed item whose name genuinely scores above the cutoff against "Organic Black Beans". */
const placedTwin = item({
  itemId: 'twin',
  itemName: 'black beans',
  state: 'placed',
  locationId: 'loc-2',
  locationName: 'Aisle 2',
});

const unrelatedPlaced = item({
  itemId: 'other',
  itemName: 'olive oil',
  state: 'placed',
  locationId: 'loc-1',
  locationName: 'Produce',
});

function renderSheet(overrides: Partial<Parameters<typeof AssignSheet>[0]> = {}) {
  const props = {
    item: item({ itemId: 'q', itemName: 'Organic Black Beans' }),
    locations,
    allItems: [placedTwin, unrelatedPlaced],
    dismissedItemIds: new Set<string>(),
    isOpen: true,
    isSaving: false,
    onClose: vi.fn(),
    onPlace: vi.fn(),
    onUnplace: vi.fn(),
    onDismissSuggestion: vi.fn(),
    ...overrides,
  };

  const view = render(
    <ChakraProvider theme={theme}>
      <AssignSheet {...props} />
    </ChakraProvider>,
  );

  return { ...props, ...view };
}

describe('AssignSheet — the resolution line', () => {
  it('names an unplaced item in plain words', async () => {
    renderSheet({ item: item({ itemId: 'q', itemName: 'Cheddar', category: 'Dairy' }) });
    expect(await screen.findByText('Dairy · not placed')).toBeInTheDocument();
  });

  it('names where an explicitly placed item sits', async () => {
    renderSheet({
      item: item({
        itemId: 'q',
        itemName: 'Cheddar',
        category: 'Dairy',
        state: 'placed',
        locationId: 'loc-1',
        locationName: 'Produce',
      }),
    });
    expect(await screen.findByText('Dairy · placed in Produce')).toBeInTheDocument();
  });

  it('names the category an inherited item is following, and where that leads', async () => {
    renderSheet({
      item: item({
        itemId: 'q',
        itemName: 'Sourdough',
        category: 'Grains',
        state: 'inherited',
        locationId: 'loc-1',
        locationName: 'Bakery',
        viaCategory: 'Grains',
      }),
    });
    expect(await screen.findByText('Grains · following Grains to Bakery')).toBeInTheDocument();
  });
});

describe('AssignSheet — suggestions', () => {
  it('offers a real suggestion above the picker, crediting the user’s own past decision', async () => {
    renderSheet();

    expect(await screen.findByText('You put something like it here')).toBeInTheDocument();
    expect(screen.getByText('black beans')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /same spot/i })).toBeInTheDocument();
    // With a suggestion present, the picker is still offered — just secondary.
    expect(screen.getByText('Or pick a spot')).toBeInTheDocument();
  });

  it('never considers an inherited item as evidence — only explicit placements', async () => {
    // The same twin, but inherited rather than placed: it must not seed a suggestion.
    renderSheet({
      allItems: [{ ...placedTwin, state: 'inherited', viaCategory: 'Pantry' }, unrelatedPlaced],
    });

    await screen.findByText('Pick a spot');
    expect(screen.queryByText('You put something like it here')).not.toBeInTheDocument();
  });

  it('renders no suggestion block and no empty-state copy when nothing clears the cutoff', async () => {
    renderSheet({ item: item({ itemId: 'q', itemName: 'Paprika' }) });

    expect(await screen.findByText('Pick a spot')).toBeInTheDocument();
    expect(screen.queryByText('You put something like it here')).not.toBeInTheDocument();
    expect(screen.queryByText(/no suggestions/i)).not.toBeInTheDocument();
  });

  it('accepting a suggestion places the item at that location', async () => {
    const user = userEvent.setup();
    const { onPlace } = renderSheet();

    await user.click(await screen.findByRole('button', { name: /same spot/i }));

    expect(onPlace).toHaveBeenCalledWith('loc-2');
  });

  it('dismissing records the pairing and does not place anything', async () => {
    const user = userEvent.setup();
    const { onDismissSuggestion, onPlace } = renderSheet();

    await user.click(await screen.findByRole('button', { name: /not like black beans/i }));

    expect(onDismissSuggestion).toHaveBeenCalledWith('twin');
    expect(onPlace).not.toHaveBeenCalled();
  });

  it('suppresses a dismissed pairing when the sheet is reopened', async () => {
    renderSheet({ dismissedItemIds: new Set(['twin']) });

    expect(await screen.findByText('Pick a spot')).toBeInTheDocument();
    expect(screen.queryByText('You put something like it here')).not.toBeInTheDocument();
  });
});

describe('AssignSheet — the picker', () => {
  it('lists the full path in order and marks the current explicit location', async () => {
    renderSheet({
      item: item({
        itemId: 'q',
        itemName: 'Cheddar',
        state: 'placed',
        locationId: 'loc-2',
        locationName: 'Aisle 2',
      }),
    });

    expect(await screen.findByRole('button', { name: /put cheddar in produce/i })).toBeInTheDocument();
    const current = screen.getByRole('button', { name: /put cheddar in aisle 2/i });
    expect(current).toHaveAttribute('aria-current', 'true');
  });

  it('places the item when a picker row is chosen', async () => {
    const user = userEvent.setup();
    const { onPlace } = renderSheet();

    await user.click(await screen.findByRole('button', { name: /put organic black beans in produce/i }));

    expect(onPlace).toHaveBeenCalledWith('loc-1');
  });

  it('offers "Take it off the path" only for an explicit placement', async () => {
    const user = userEvent.setup();
    const { onUnplace } = renderSheet({
      item: item({
        itemId: 'q',
        itemName: 'Cheddar',
        state: 'placed',
        locationId: 'loc-1',
        locationName: 'Produce',
      }),
    });

    await user.click(await screen.findByRole('button', { name: /take it off the path/i }));
    expect(onUnplace).toHaveBeenCalled();
  });

  it('does not offer "Take it off the path" for an inherited item — there is nothing explicit to remove', async () => {
    renderSheet({
      item: item({
        itemId: 'q',
        itemName: 'Sourdough',
        state: 'inherited',
        locationId: 'loc-1',
        locationName: 'Produce',
        viaCategory: 'Grains',
      }),
    });

    await screen.findByText('Pick a spot');
    expect(screen.queryByRole('button', { name: /take it off the path/i })).not.toBeInTheDocument();
  });
});

describe('AssignSheet — accessibility', () => {
  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderSheet();

    await screen.findByText('Organic Black Beans');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('traps focus inside the sheet', async () => {
    const user = userEvent.setup();
    render(
      <ChakraProvider theme={theme}>
        <button type="button">outside</button>
        <AssignSheet
          item={item({ itemId: 'q', itemName: 'Organic Black Beans' })}
          locations={locations}
          allItems={[placedTwin, unrelatedPlaced]}
          dismissedItemIds={new Set()}
          isOpen
          isSaving={false}
          onClose={vi.fn()}
          onPlace={vi.fn()}
          onUnplace={vi.fn()}
          onDismissSuggestion={vi.fn()}
        />
      </ChakraProvider>,
    );

    const dialog = await screen.findByRole('dialog');
    // Tab repeatedly; focus must never escape to the button rendered outside the sheet.
    for (let i = 0; i < 12; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('returns focus to the control that opened it', async () => {
    const user = userEvent.setup();

    /** Mirrors how the page drives the sheet: a real trigger, real open/close state. */
    function Harness() {
      const openerRef = useRef<HTMLButtonElement>(null);
      const [isOpen, setIsOpen] = useState(false);

      return (
        <ChakraProvider theme={theme}>
          <button type="button" ref={openerRef} onClick={() => setIsOpen(true)}>
            opener
          </button>
          <AssignSheet
            item={item({ itemId: 'q', itemName: 'Cheddar' })}
            locations={locations}
            allItems={[]}
            dismissedItemIds={new Set()}
            isOpen={isOpen}
            isSaving={false}
            finalFocusRef={openerRef}
            onClose={() => setIsOpen(false)}
            onPlace={vi.fn()}
            onUnplace={vi.fn()}
            onDismissSuggestion={vi.fn()}
          />
        </ChakraProvider>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'opener' });

    await user.click(opener);
    await screen.findByRole('dialog');
    expect(opener).not.toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
