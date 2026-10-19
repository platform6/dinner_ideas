import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IngredientList } from '@/features/dinners/components/IngredientList';
import type { DinnerIngredient } from '@/features/dinners/types';

const ingredients: DinnerIngredient[] = [
  { id: 'i1', dinner_id: 'd1', name: 'Tortillas', quantity: 6, unit: 'each', category: 'Bakery' },
  { id: 'i2', dinner_id: 'd1', name: 'ground turkey', quantity: 1, unit: 'lb', category: 'Meat' },
];

describe('IngredientList (intent 026)', () => {
  it('should list each ingredient as quantity, unit and name, in the order given', () => {
    render(<IngredientList ingredients={ingredients} />);

    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual(['6 each Tortillas', '1 lb ground turkey']);
  });

  it('should say so when a dinner has no ingredients', () => {
    render(<IngredientList ingredients={[]} />);

    expect(screen.getByText('No ingredients recorded.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
