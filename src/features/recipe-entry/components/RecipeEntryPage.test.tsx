import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RecipeEntryPage } from '@/features/recipe-entry/components/RecipeEntryPage';
import { fetchActiveDinners, fetchAllTags } from '@/features/dinners/api';
import type { CatalogDinner, Tag } from '@/features/dinners/types';

vi.mock('@/features/dinners/api');

function dinner(name: string, cuisine: string): CatalogDinner {
  return {
    id: `id-${name}`,
    household_id: 'hh-test',
    name,
    cuisine_type: cuisine,
    cook_time_minutes: 30,
    is_active: true,
    instructions: '',
    created_at: '2026-01-01T00:00:00Z',
    dinner_ingredients: [],
    tags: [],
  };
}

function tag(name: string): Tag {
  return { id: `tag-${name}`, household_id: 'hh-test', name };
}

describe('RecipeEntryPage', () => {
  const mockedDinners = vi.mocked(fetchActiveDinners);
  const mockedTags = vi.mocked(fetchAllTags);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedDinners.mockResolvedValue([dinner('Tacos', 'Mexican'), dinner('Ramen', 'Japanese')]);
    mockedTags.mockResolvedValue([tag('quick'), tag('weeknight')]);
  });

  function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RecipeEntryPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  /**
   * The page's tag chips and cuisine suggestions both come from queries. `find*` resolves as soon
   * as an element EXISTS, which for this page is before either query has landed — the trap that
   * produced misleading results in three bolts running. Anything touching loaded data waits for
   * the data itself.
   */
  async function renderWithDataLoaded() {
    const view = renderPage();
    await screen.findByRole('button', { name: 'quick' });
    return view;
  }

  it('shows both ways in from the first render', async () => {
    renderPage();

    expect(await screen.findByRole('tab', { name: 'Type it in' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Paste a recipe' })).toBeInTheDocument();
  });

  it('says the paste path is not built yet rather than looking broken', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('tab', { name: 'Paste a recipe' }));

    expect(await screen.findByText(/Not built yet/)).toBeInTheDocument();
  });

  it('states the 3-serving convention where the quantities are typed', async () => {
    renderPage();
    expect(await screen.findByText(/Quantities are for 3 servings/)).toBeInTheDocument();
  });

  it('says the summary is not the cooking steps', async () => {
    renderPage();
    expect(await screen.findByText(/not the cooking steps/i)).toBeInTheDocument();
  });

  it('does NOT claim the summary appears on the catalog card', async () => {
    // `dinners.instructions` is rendered nowhere in the app. Saying otherwise would teach the
    // user something false about their own catalog.
    renderPage();
    await screen.findByText(/not the cooking steps/i);

    expect(screen.queryByText(/catalog card/i)).not.toBeInTheDocument();
  });

  it('offers the categories as a fixed choice, never as free text', async () => {
    renderPage();

    const category = await screen.findByLabelText('Part of the store');
    expect(category.tagName).toBe('SELECT');
    expect(
      within(category)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Produce', 'Protein', 'Dairy', 'Grains', 'Pantry']);
  });

  it('suggests cuisines from the catalog rather than a hardcoded list', async () => {
    const { container } = renderPage();
    await screen.findByLabelText(/^Kind of food/);

    await waitFor(() => {
      const options = [...container.querySelectorAll('#cuisine-suggestions option')];
      expect(options.map((o) => o.getAttribute('value'))).toEqual(['Japanese', 'Mexican']);
    });
  });

  describe('removing a line', () => {
    it('leaves every OTHER ingredient line holding its own values', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Add an ingredient' }));
      await user.click(screen.getByRole('button', { name: 'Add an ingredient' }));

      const names = screen.getAllByLabelText('Ingredient');
      expect(names).toHaveLength(3);
      await user.type(names[0], 'Chicken');
      await user.type(names[1], 'Peppers');
      await user.type(names[2], 'Onions');

      await user.click(screen.getByRole('button', { name: 'Remove Peppers' }));

      const remaining = screen.getAllByLabelText('Ingredient');
      expect(remaining).toHaveLength(2);
      expect(remaining.map((input) => (input as HTMLInputElement).value)).toEqual(['Chicken', 'Onions']);
    });

    it('keeps each surviving line on its OWN dom node when one is removed', async () => {
      // The case above cannot fail: the inputs are controlled, so React writes the correct value
      // back from state whatever the key is. Keys govern DOM node IDENTITY, not value — and that
      // identity is what carries focus, cursor position and in-progress IME composition.
      //
      // Keyed by id, the third line's input is the SAME element before and after the removal.
      // Keyed by index, React reuses the second line's element for the third line's data and
      // unmounts the last one, so the survivor is a different node wearing the same value.
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Add an ingredient' }));
      await user.click(screen.getByRole('button', { name: 'Add an ingredient' }));

      const names = screen.getAllByLabelText('Ingredient');
      await user.type(names[0], 'Chicken');
      await user.type(names[1], 'Peppers');
      await user.type(names[2], 'Onions');
      const onionsNode = screen.getAllByLabelText('Ingredient')[2];

      await user.click(screen.getByRole('button', { name: 'Remove Peppers' }));

      expect(screen.getAllByLabelText('Ingredient')[1]).toBe(onionsNode);
    });

    // A focus-retention case was tried here and removed: clicking the remove button moves focus
    // to that button, which then unmounts with its row, so focus is never on the input at the
    // moment of removal. The UI does not preserve the caret across a removal and does not claim
    // to. Node identity above is the assertion that actually discriminates.

    it('renumbers the steps contiguously from 1 when a middle one goes', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Add a step' }));
      await user.click(screen.getByRole('button', { name: 'Add a step' }));

      await user.type(screen.getByLabelText('Step 1'), 'Chop');
      await user.type(screen.getByLabelText('Step 2'), 'Roast');
      await user.type(screen.getByLabelText('Step 3'), 'Serve');

      await user.click(screen.getByRole('button', { name: 'Remove step 2' }));

      // Two steps, numbered 1 and 2 — no gap where step 2 was.
      expect(screen.getByLabelText('Step 1')).toHaveValue('Chop');
      expect(screen.getByLabelText('Step 2')).toHaveValue('Serve');
      expect(screen.queryByLabelText('Step 3')).not.toBeInTheDocument();
    });

    it('keeps the displayed order after a move', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Add a step' }));
      await user.type(screen.getByLabelText('Step 1'), 'Chop');
      await user.type(screen.getByLabelText('Step 2'), 'Roast');

      await user.click(screen.getByRole('button', { name: 'Move step 2 up' }));

      expect(screen.getByLabelText('Step 1')).toHaveValue('Roast');
      expect(screen.getByLabelText('Step 2')).toHaveValue('Chop');
    });
  });

  describe('validation', () => {
    it('says nothing until a save is attempted', async () => {
      renderPage();
      await screen.findByLabelText(/^Name/);

      expect(screen.queryByText(/Give the dinner a name/)).not.toBeInTheDocument();
    });

    it('names the fields that are wrong instead of saying the form is invalid', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Save dinner' }));

      expect(await screen.findByText('Give the dinner a name.')).toBeInTheDocument();
      expect(screen.getByText('Say what kind of food this is.')).toBeInTheDocument();
      expect(screen.getByText('Add a one-line summary of the dinner.')).toBeInTheDocument();
      expect(screen.getByText('Cook time must be more than zero minutes.')).toBeInTheDocument();
      expect(screen.getByText('Quantity must be more than zero.')).toBeInTheDocument();
    });

    it('refuses a cook time of zero before anything is sent', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(await screen.findByLabelText(/^Cook time/), '0');
      await user.click(screen.getByRole('button', { name: 'Save dinner' }));

      expect(await screen.findByText('Cook time must be more than zero minutes.')).toBeInTheDocument();
    });

    it('reports a complete draft as ready to save', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(await screen.findByLabelText(/^Name/), 'Fajitas');
      await user.type(screen.getByLabelText(/^Kind of food/), 'Mexican');
      await user.type(screen.getByLabelText(/^Cook time/), '30');
      await user.type(screen.getByLabelText(/^One-line summary/), 'Chicken and peppers.');
      await user.type(screen.getByLabelText('Quantity'), '1.5');
      await user.type(screen.getByLabelText('Ingredient'), 'Chicken thighs');
      await user.type(screen.getByLabelText('Step 1'), 'Roast for 30 minutes.');

      await user.click(screen.getByRole('button', { name: 'Save dinner' }));

      expect(await screen.findByRole('status')).toHaveTextContent(/ready to save/i);
    });

    it('clears the ready state when the draft is edited again', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(await screen.findByLabelText(/^Name/), 'Fajitas');
      await user.type(screen.getByLabelText(/^Kind of food/), 'Mexican');
      await user.type(screen.getByLabelText(/^Cook time/), '30');
      await user.type(screen.getByLabelText(/^One-line summary/), 'Chicken and peppers.');
      await user.type(screen.getByLabelText('Quantity'), '1.5');
      await user.type(screen.getByLabelText('Ingredient'), 'Chicken thighs');
      await user.type(screen.getByLabelText('Step 1'), 'Roast for 30 minutes.');
      await user.click(screen.getByRole('button', { name: 'Save dinner' }));
      await screen.findByRole('status');

      await user.type(screen.getByLabelText(/^Name/), ' Deluxe');

      await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    });
  });

  describe('tags', () => {
    it('offers the household vocabulary rather than a hardcoded list', async () => {
      await renderWithDataLoaded();

      expect(screen.getByRole('button', { name: 'quick' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'weeknight' })).toBeInTheDocument();
    });

    it('attaches on click and detaches on a second click', async () => {
      const user = userEvent.setup();
      await renderWithDataLoaded();

      const quick = screen.getByRole('button', { name: 'quick' });
      expect(quick).toHaveAttribute('aria-pressed', 'false');

      await user.click(quick);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'quick' })).toHaveAttribute('aria-pressed', 'true'),
      );

      await user.click(screen.getByRole('button', { name: 'quick' }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'quick' })).toHaveAttribute('aria-pressed', 'false'),
      );
    });

    it('creates a new name, normalized', async () => {
      const user = userEvent.setup();
      await renderWithDataLoaded();

      await user.type(screen.getByLabelText('New tag'), '  Sheet Pan  ');
      await user.click(screen.getByRole('button', { name: 'Add tag' }));

      expect(await screen.findByRole('button', { name: 'sheet pan' })).toBeInTheDocument();
    });

    it('will not offer to create a name that already exists', async () => {
      const user = userEvent.setup();
      await renderWithDataLoaded();

      await user.type(screen.getByLabelText('New tag'), 'QUICK');

      // Normalizes to `quick`, which is already in the vocabulary — creating it again would make
      // a near-duplicate of a chip already on screen.
      expect(screen.getByRole('button', { name: 'Add tag' })).toBeDisabled();
    });

    it('will not create a name that is only whitespace', async () => {
      const user = userEvent.setup();
      await renderWithDataLoaded();

      await user.type(screen.getByLabelText('New tag'), '   ');

      expect(screen.getByRole('button', { name: 'Add tag' })).toBeDisabled();
    });

    it('never writes a tag — the draft only carries names', async () => {
      const user = userEvent.setup();
      await renderWithDataLoaded();

      await user.click(screen.getByRole('button', { name: 'quick' }));
      await user.type(screen.getByLabelText('New tag'), 'sheet pan');
      await user.click(screen.getByRole('button', { name: 'Add tag' }));
      await screen.findByRole('button', { name: 'sheet pan' });

      // An abandoned draft must leave the shared vocabulary untouched. Bolt 060 owns the write.
      const api = await import('@/features/dinners/api');
      expect(vi.mocked(api.addTagToDinner)).not.toHaveBeenCalled();
    });

    it('renders with no vocabulary at all, and can still create one', async () => {
      mockedTags.mockResolvedValue([]);
      const user = userEvent.setup();
      renderPage();

      expect(await screen.findByText(/No tags yet/)).toBeInTheDocument();

      await user.type(screen.getByLabelText('New tag'), 'first');
      await user.click(screen.getByRole('button', { name: 'Add tag' }));

      expect(await screen.findByRole('button', { name: 'first' })).toBeInTheDocument();
    });
  });
});
