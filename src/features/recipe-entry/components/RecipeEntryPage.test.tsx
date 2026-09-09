import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RecipeEntryPage } from '@/features/recipe-entry/components/RecipeEntryPage';
import { fetchActiveDinners, fetchAllTags } from '@/features/dinners/api';
import { createDinner } from '@/features/recipe-entry/api';
import type { CatalogDinner, Tag } from '@/features/dinners/types';

vi.mock('@/features/dinners/api');
// `mapSaveError` is NOT mocked — it is the code under test for story 006's messages.
vi.mock('@/features/recipe-entry/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/recipe-entry/api')>()),
  createDinner: vi.fn(),
}));

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
  const mockedCreate = vi.mocked(createDinner);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedDinners.mockResolvedValue([dinner('Tacos', 'Mexican'), dinner('Ramen', 'Japanese')]);
    mockedTags.mockResolvedValue([tag('quick'), tag('weeknight')]);
    mockedCreate.mockResolvedValue('new-dinner-id');
  });

  /** Fills every required field with a valid recipe. */
  async function fillValidDraft(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByLabelText(/^Name/), 'Fajitas');
    await user.type(screen.getByLabelText(/^Kind of food/), 'Mexican');
    await user.type(screen.getByLabelText(/^Cook time/), '30');
    await user.type(screen.getByLabelText(/^One-line summary/), 'Chicken and peppers.');
    await user.type(screen.getByLabelText('Quantity'), '1.5');
    await user.type(screen.getByLabelText('Ingredient'), 'Chicken thighs');
    await user.type(screen.getByLabelText('Step 1'), 'Roast for 30 minutes.');
  }

  /**
   * Rendered through real routes, not bare. The page navigates to the catalog on a successful
   * save, and a bare render would leave it mounted at any location — so "it left the page" would
   * be unassertable, and the navigation untested.
   */
  function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dinners/new']}>
          <Routes>
            <Route path="/dinners/new" element={<RecipeEntryPage />} />
            <Route path="/" element={<h1>Dinner catalog</h1>} />
          </Routes>
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

    it('saves a complete draft', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillValidDraft(user);

      await user.click(screen.getByRole('button', { name: 'Save dinner' }));

      await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    });

    it('does NOT call the save when the draft is incomplete', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(await screen.findByRole('button', { name: 'Save dinner' }));
      await screen.findByText('Give the dinner a name.');

      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('clears a rejection when the draft is edited again', async () => {
      // A message about a name the user has since changed is worse than no message.
      mockedCreate.mockRejectedValue({ code: '23505' });
      const user = userEvent.setup();
      renderPage();
      await fillValidDraft(user);

      await user.click(screen.getByRole('button', { name: 'Save dinner' }));
      await screen.findByText(/already have a dinner called/i);

      await user.type(screen.getByLabelText(/^Name/), ' Deluxe');

      await waitFor(() =>
        expect(screen.queryByText(/already have a dinner called/i)).not.toBeInTheDocument(),
      );
    });
  });

  describe('saving', () => {
    it('sends the draft the user actually typed', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillValidDraft(user);

      await user.click(screen.getByRole('button', { name: 'Save dinner' }));

      await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fajitas',
          cuisineType: 'Mexican',
          cookTimeMinutes: '30',
          summary: 'Chicken and peppers.',
          steps: [expect.objectContaining({ instruction: 'Roast for 30 minutes.' })],
          ingredients: [expect.objectContaining({ name: 'Chicken thighs', quantity: '1.5' })],
        }),
      );
    });

    it('goes to the catalog once it saves', async () => {
      const user = userEvent.setup();
      renderPage();
      await fillValidDraft(user);

      await user.click(screen.getByRole('button', { name: 'Save dinner' }));

      expect(await screen.findByRole('heading', { name: 'Dinner catalog' })).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Name/)).not.toBeInTheDocument();
    });

    describe('a duplicate name', () => {
      beforeEach(() => {
        mockedCreate.mockRejectedValue({
          code: '23505',
          message: 'duplicate key value violates unique constraint "dinners_household_id_name_key"',
        });
      });

      it('says so in plain language', async () => {
        const user = userEvent.setup();
        renderPage();
        await fillValidDraft(user);

        await user.click(screen.getByRole('button', { name: 'Save dinner' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
          /You already have a dinner called .Fajitas./i,
        );
      });

      it('shows no raw Postgres text', async () => {
        const user = userEvent.setup();
        renderPage();
        await fillValidDraft(user);

        await user.click(screen.getByRole('button', { name: 'Save dinner' }));
        await screen.findByRole('alert');

        expect(screen.queryByText(/duplicate key|unique constraint|household_id/i)).not.toBeInTheDocument();
      });

      it('KEEPS the whole draft, so only the name needs changing', async () => {
        // The point of story 006: a clash costs one edit, not a re-entry of every ingredient
        // and step.
        const user = userEvent.setup();
        renderPage();
        await fillValidDraft(user);

        await user.click(screen.getByRole('button', { name: 'Save dinner' }));
        await screen.findByRole('alert');

        expect(screen.getByLabelText(/^Name/)).toHaveValue('Fajitas');
        expect(screen.getByLabelText(/^Kind of food/)).toHaveValue('Mexican');
        expect(screen.getByLabelText(/^One-line summary/)).toHaveValue('Chicken and peppers.');
        expect(screen.getByLabelText('Ingredient')).toHaveValue('Chicken thighs');
        expect(screen.getByLabelText('Quantity')).toHaveValue(1.5);
        expect(screen.getByLabelText('Step 1')).toHaveValue('Roast for 30 minutes.');
      });

      it('stays on the page', async () => {
        const user = userEvent.setup();
        renderPage();
        await fillValidDraft(user);

        await user.click(screen.getByRole('button', { name: 'Save dinner' }));
        await screen.findByRole('alert');

        expect(screen.getByRole('heading', { name: 'Add a dinner' })).toBeInTheDocument();
      });
    });

    it('reports a permission failure as permission, not as a retry', async () => {
      mockedCreate.mockRejectedValue({ code: '42501' });
      const user = userEvent.setup();
      renderPage();
      await fillValidDraft(user);

      await user.click(screen.getByRole('button', { name: 'Save dinner' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/permission/i);
    });

    it('reports an unknown failure without leaking the error', async () => {
      mockedCreate.mockRejectedValue(new Error('TypeError: fetch failed at line 3'));
      const user = userEvent.setup();
      renderPage();
      await fillValidDraft(user);

      await user.click(screen.getByRole('button', { name: 'Save dinner' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/connection/i);
      expect(alert).not.toHaveTextContent(/TypeError|fetch failed/);
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
