import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CatalogFilters, type CatalogFilterState } from '@/features/dinners/components/CatalogFilters';

const baseFilters: CatalogFilterState = {
  cuisine: null,
  tags: [],
  sortByCookTime: false,
};

function renderFilters(
  overrides: {
    cuisines?: string[];
    availableTags?: string[];
    filters?: Partial<CatalogFilterState>;
  } = {},
) {
  const onChange = vi.fn();
  render(
    <CatalogFilters
      cuisines={overrides.cuisines ?? ['Italian', 'Mexican']}
      availableTags={overrides.availableTags ?? ['kid-friendly', 'one-pot', 'vegetarian']}
      filters={{ ...baseFilters, ...overrides.filters }}
      onChange={onChange}
    />,
  );
  return { onChange };
}

describe('CatalogFilters', () => {
  it('renders separate "Cuisine" and "Tags" dropdowns, and no "More" control (FR-13, FR-14)', () => {
    renderFilters();

    expect(screen.getByRole('button', { name: 'Cuisine' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tags' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^more/i })).not.toBeInTheDocument();
  });

  it('lists only cuisines in the Cuisine dropdown and reports the pick via onChange', async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters();

    await user.click(screen.getByRole('button', { name: 'Cuisine' }));

    expect(await screen.findByRole('checkbox', { name: 'Italian' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Mexican' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'kid-friendly' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Mexican' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cuisine: 'Mexican', tags: [] }));
  });

  it('lists only tags in the Tags dropdown and reports an OR-set of tags via onChange', async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters();

    await user.click(screen.getByRole('button', { name: 'Tags' }));

    expect(await screen.findByRole('checkbox', { name: 'kid-friendly' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'vegetarian' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Italian' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'kid-friendly' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['kid-friendly'], cuisine: null }));
  });

  it('shows active tags as chips that clear the tag on click', async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters({ filters: { tags: ['one-pot'] } });

    const chip = screen.getByRole('button', { name: 'one-pot ✕' });
    await user.click(chip);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }));
  });

  it('shows the active cuisine as a chip that clears the cuisine on click', async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilters({ filters: { cuisine: 'Italian' } });

    await user.click(screen.getByRole('button', { name: 'Italian ✕' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cuisine: null }));
  });

  it('hides the Tags dropdown when the tag vocabulary is empty', () => {
    renderFilters({ availableTags: [] });

    expect(screen.getByRole('button', { name: 'Cuisine' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tags' })).not.toBeInTheDocument();
  });

  it('hides the Cuisine dropdown when there are no cuisines', () => {
    renderFilters({ cuisines: [] });

    expect(screen.getByRole('button', { name: 'Tags' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cuisine' })).not.toBeInTheDocument();
  });

  it('keeps the always-inline "All" and "Quickest" controls', () => {
    renderFilters();

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quickest' })).toBeInTheDocument();
  });
});
