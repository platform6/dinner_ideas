import { describe, expect, it } from 'vitest';

import { formatShoppingListText } from '@/features/shopping-list/format';
import type { ShoppingListGroup } from '@/features/shopping-list/types';

describe('formatShoppingListText', () => {
  it('renders a category heading followed by one line per item', () => {
    const groups: ShoppingListGroup[] = [
      {
        category: 'Produce',
        items: [
          { name: 'onions', unit: 'each', quantity: 2, category: 'Produce' },
          { name: 'spinach', unit: 'lb', quantity: 1, category: 'Produce' },
        ],
      },
    ];

    expect(formatShoppingListText(groups)).toBe('Produce\n- 2 each onions\n- 1 lb spinach');
  });

  it('separates multiple groups with a blank line', () => {
    const groups: ShoppingListGroup[] = [
      { category: 'Produce', items: [{ name: 'onions', unit: 'each', quantity: 2, category: 'Produce' }] },
      { category: 'Dairy', items: [{ name: 'milk', unit: 'gal', quantity: 1, category: 'Dairy' }] },
    ];

    expect(formatShoppingListText(groups)).toBe('Produce\n- 2 each onions\n\nDairy\n- 1 gal milk');
  });

  it('contains no markup/HTML', () => {
    const groups: ShoppingListGroup[] = [
      { category: 'Produce', items: [{ name: 'onions', unit: 'each', quantity: 2, category: 'Produce' }] },
    ];

    expect(formatShoppingListText(groups)).not.toMatch(/[<>]/);
  });

  it('returns an empty string for no groups', () => {
    expect(formatShoppingListText([])).toBe('');
  });
});
