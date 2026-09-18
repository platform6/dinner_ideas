import type { ComponentProps } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DinnerCard } from '@/features/dinners/components/DinnerCard';
import {
  addTagToDinner,
  fetchDinnerFullDetails,
  fetchRemovalImpact,
  removeDinner,
  removeTagFromDinner,
} from '@/features/dinners/api';
import type { CatalogDinner, DinnerFullDetails } from '@/features/dinners/types';
import { theme } from '@/shared/theme';

vi.mock('@/features/dinners/api');

const mockedFetchDetails = vi.mocked(fetchDinnerFullDetails);
const mockedAddTag = vi.mocked(addTagToDinner);
const mockedRemoveTag = vi.mocked(removeTagFromDinner);

const dinner: CatalogDinner = {
  id: 'd1',
  household_id: 'hh-test',
  name: 'Tacos',
  cuisine_type: 'Mexican',
  cook_time_minutes: 25,
  is_active: true,
  instructions: '',
  created_at: '2026-01-01T00:00:00Z',
  dinner_ingredients: [],
  tags: ['kid-friendly'],
};

const details: DinnerFullDetails = {
  dinner_steps: [{ id: 's1', dinner_id: 'd1', step_number: 1, instruction: 'Cook the meat.' }],
  dinner_ingredients: [
    { id: 'i1', dinner_id: 'd1', name: 'Tortillas', quantity: 6, unit: 'each', category: 'Bakery' },
  ],
  tags: [{ id: 't1', name: 'kid-friendly' }],
};

function renderCard(
  onSuppress = vi.fn(),
  selectionOverrides: Partial<ComponentProps<typeof DinnerCard>['selection']> = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DinnerCard
        dinner={dinner}
        onSuppress={onSuppress}
        isMutating={false}
        selection={{
          isSelected: false,
          selectionDisabled: false,
          isTogglingSelection: false,
          onToggleSelect: vi.fn(),
          ...selectionOverrides,
        }}
      />
    </QueryClientProvider>,
  );
}

describe('DinnerCard details section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchDetails.mockResolvedValue(details);
    mockedAddTag.mockResolvedValue(undefined);
    mockedRemoveTag.mockResolvedValue(undefined);
  });

  it('does not fetch details until expanded', async () => {
    renderCard();
    expect(await screen.findByText('Tacos')).toBeInTheDocument();
    expect(mockedFetchDetails).not.toHaveBeenCalled();
  });

  it('expands to show steps, ingredients, and tags on click', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /details/i }));

    expect(await screen.findByText('Cook the meat.')).toBeInTheDocument();
    expect(screen.getByText(/Tortillas/)).toBeInTheDocument();
    expect(mockedFetchDetails).toHaveBeenCalledWith('d1');
  });

  it('collapses again on a second click', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /details/i }));
    await screen.findByText('Cook the meat.');
    await user.click(screen.getByRole('button', { name: /details/i }));

    expect(screen.queryByText('Cook the meat.')).not.toBeInTheDocument();
  });

  it('adds a new tag', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /details/i }));
    await screen.findByText('Cook the meat.');

    await user.type(screen.getByLabelText('New tag name'), 'spicy');
    await user.click(screen.getByRole('button', { name: '+' }));

    expect(mockedAddTag).toHaveBeenCalledWith('d1', 'spicy');
  });

  it('removes an existing tag', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /details/i }));
    await screen.findByText('Cook the meat.');

    await user.click(screen.getByRole('button', { name: 'Remove tag kid-friendly' }));

    expect(mockedRemoveTag).toHaveBeenCalledWith('d1', 't1');
  });
});

describe('DinnerCard in the catalog grid (intent 019, FR-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchDetails.mockResolvedValue(details);
  });

  /**
   * The card root's computed `grid-column`, spaces removed. The root is the catalog grid's item.
   * Emotion writes `1 / -1` as `1/-1`, and an unset span computes to `''`, so comparing the value
   * (rather than `toHaveStyle`) makes the collapsed case a real assertion too.
   */
  function gridColumnOf(container: HTMLElement): string {
    const root = container.firstElementChild;
    if (!(root instanceof HTMLElement)) throw new Error('expected the card to render a root element');
    return getComputedStyle(root).gridColumn.replace(/\s/g, '');
  }

  it('should take one column and report collapsed while Details is closed', () => {
    const { container } = renderCard();

    expect(gridColumnOf(container)).toBe('');
    expect(screen.getByRole('button', { name: /details/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('should span the whole row while Details is open, and return to one column when closed', async () => {
    const user = userEvent.setup();
    const { container } = renderCard();
    const toggle = screen.getByRole('button', { name: /details/i });

    await user.click(toggle);
    expect(gridColumnOf(container)).toBe('1/-1');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);
    expect(gridColumnOf(container)).toBe('');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('should keep focus on the same Details toggle through expand and collapse', async () => {
    const user = userEvent.setup();
    renderCard();
    const toggle = screen.getByRole('button', { name: /details/i });

    await user.click(toggle);
    await screen.findByText('Cook the meat.');
    expect(screen.getByRole('button', { name: /details/i })).toBe(toggle);
    expect(toggle).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
  });
});

describe('DinnerCard pick pill size (intent 024, FR-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchDetails.mockResolvedValue(details);
  });

  /**
   * With the theme provider, unlike the other cases in this file. A responsive value only becomes
   * media queries when Chakra knows the breakpoints; without the provider the array collapses and
   * this would assert nothing.
   */
  function renderThemedCard() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <DinnerCard
            dinner={dinner}
            onSuppress={vi.fn()}
            isMutating={false}
            selection={{
              isSelected: false,
              selectionDisabled: false,
              isTogglingSelection: false,
              onToggleSelect: vi.fn(),
            }}
          />
        </QueryClientProvider>
      </ChakraProvider>,
    );
    const label = screen.getByRole('checkbox', { name: 'Pick Tacos for this week' }).closest('label');
    const pill = label?.querySelector('span span');
    if (!(pill instanceof HTMLElement)) throw new Error('expected the pill inside the label');
    return pill;
  }

  it('should be 44px tall on a phone', () => {
    // jsdom applies the base rule and not the min-width query, so a computed height here is the
    // phone value. What jsdom cannot show is the md+ value, which the next case reads from the CSS.
    expect(getComputedStyle(renderThemedCard()).height).toBe('44px');
  });

  it('should keep the denser 34px from md up, behind a min-width query', () => {
    // jsdom never applies that query (above), so this reads the generated CSS instead. The measured
    // proof at both widths is the browser sweep recorded in the bolt's walkthrough (NFR-3).
    const pill = renderThemedCard();
    const className = [...pill.classList].find((c) => c.startsWith('css-'));
    const css = [...document.querySelectorAll('style')].map((sheet) => sheet.textContent ?? '').join('\n');
    const own = css.split('}').filter((rule) => className && rule.includes(className));

    expect(own.some((rule) => /height:\s*44px/.test(rule))).toBe(true);
    expect(css).toMatch(/@media screen and \(min-width: 48em\)[^@]*height:\s*34px/);
  });
});

describe('DinnerCard at capacity (story 017)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchDetails.mockResolvedValue(details);
  });

  it('shows the "Full" pill but no per-card "already picked 3" notice when locked', () => {
    renderCard(vi.fn(), { selectionDisabled: true, isSelected: false });

    expect(screen.getByText('Full')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Pick Tacos for this week' })).toBeDisabled();
    expect(screen.queryByText(/already have 3 picked/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/remove one/i)).not.toBeInTheDocument();
  });

  it('is unchanged for a picked card at capacity', () => {
    renderCard(vi.fn(), { selectionDisabled: true, isSelected: true });

    expect(screen.getByText('Picked')).toBeInTheDocument();
    expect(screen.queryByText(/already have 3 picked/i)).not.toBeInTheDocument();
  });
});

describe('DinnerCard overflow menu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetchDetails.mockResolvedValue(details);
  });

  it('is not a persistent button on the card face', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: /not interested/i })).not.toBeInTheDocument();
  });

  it('should open from the keyboard and close on Escape, back on its button (intent 019, FR-7)', async () => {
    const user = userEvent.setup();
    renderCard();
    const button = screen.getByRole('button', { name: `More actions for ${dinner.name}` });

    button.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('menuitem', { name: /not interested/i })).toBeVisible();
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'false'));
    expect(button).toHaveFocus();
  });

  it('suppresses the dinner via the overflow menu (FR-5)', async () => {
    const user = userEvent.setup();
    const onSuppress = vi.fn();
    renderCard(onSuppress);

    await user.click(screen.getByRole('button', { name: `More actions for ${dinner.name}` }));
    await user.click(await screen.findByRole('menuitem', { name: /not interested/i }));

    expect(onSuppress).toHaveBeenCalledWith('d1');
  });
});

describe('DinnerCard removal (intent 018, bolt 072)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchRemovalImpact).mockResolvedValue({
      historyCount: 0,
      pastPlanCount: 0,
      inCurrentDraft: false,
      inCurrentLockedPlan: false,
    });
  });

  it('offers Remove… BELOW Not interested, as a separate, visibly different action', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'More actions for Tacos' }));
    const items = await screen.findAllByRole('menuitem');

    expect(items.map((item) => item.textContent)).toEqual(['Not interested', 'Remove…']);
  });

  it('opens the confirmation instead of removing — nothing is deleted from the menu itself', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: 'More actions for Tacos' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Remove…' }));

    expect(await screen.findByText('Remove “Tacos”?')).toBeInTheDocument();
    expect(vi.mocked(removeDinner)).not.toHaveBeenCalled();
  });

  it('routes "Not interested instead" in the dialog to the same reversible hide', async () => {
    const onSuppress = vi.fn();
    const user = userEvent.setup();
    renderCard(onSuppress);

    await user.click(screen.getByRole('button', { name: 'More actions for Tacos' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Remove…' }));
    await user.click(await screen.findByRole('button', { name: 'Not interested instead' }));

    expect(onSuppress).toHaveBeenCalledWith('d1');
    expect(vi.mocked(removeDinner)).not.toHaveBeenCalled();
  });
});
