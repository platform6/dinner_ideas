import { describe, expect, it } from 'vitest';

import { formatAmounts, formatShoppingListText } from '@/features/shopping-list/format';
import type { ShoppingListGroup } from '@/features/shopping-list/types';

describe('formatShoppingListText', () => {
  it('renders a category heading followed by one line per item', () => {
    const groups: ShoppingListGroup[] = [
      {
        category: 'Produce',
        items: [
          {
            name: 'onions',
            amounts: [{ unit: 'each', quantity: 2 }],
            category: 'Produce',
            sourceNames: ['onions'],
          },
          {
            name: 'spinach',
            amounts: [{ unit: 'lb', quantity: 1 }],
            category: 'Produce',
            sourceNames: ['spinach'],
          },
        ],
      },
    ];

    expect(formatShoppingListText(groups)).toBe('Produce\n- 2 each onions\n- 1 lb spinach');
  });

  it('separates multiple groups with a blank line', () => {
    const groups: ShoppingListGroup[] = [
      {
        category: 'Produce',
        items: [
          {
            name: 'onions',
            amounts: [{ unit: 'each', quantity: 2 }],
            category: 'Produce',
            sourceNames: ['onions'],
          },
        ],
      },
      {
        category: 'Dairy',
        items: [
          { name: 'milk', amounts: [{ unit: 'gal', quantity: 1 }], category: 'Dairy', sourceNames: ['milk'] },
        ],
      },
    ];

    expect(formatShoppingListText(groups)).toBe('Produce\n- 2 each onions\n\nDairy\n- 1 gal milk');
  });

  it('contains no markup/HTML', () => {
    const groups: ShoppingListGroup[] = [
      {
        category: 'Produce',
        items: [
          {
            name: 'onions',
            amounts: [{ unit: 'each', quantity: 2 }],
            category: 'Produce',
            sourceNames: ['onions'],
          },
        ],
      },
    ];

    expect(formatShoppingListText(groups)).not.toMatch(/[<>]/);
  });

  it('returns an empty string for no groups', () => {
    expect(formatShoppingListText([])).toBe('');
  });
});

describe('formatAmounts (intent 023, FR-2)', () => {
  it('should join several units with " + "', () => {
    expect(
      formatAmounts([
        { unit: 'lb', quantity: 2 },
        { unit: '', quantity: 4 },
      ]),
    ).toBe('2 lb + 4');
  });

  it('should print a unitless amount without a trailing space', () => {
    expect(formatAmounts([{ unit: ' ', quantity: 3 }])).toBe('3');
  });

  it('should keep a quantity of 0', () => {
    expect(formatAmounts([{ unit: 'tsp', quantity: 0 }])).toBe('0 tsp');
  });

  it('should write the same amounts into the clipboard text as on screen', () => {
    const amounts = [
      { unit: 'tbsp', quantity: 1 },
      { unit: 'tsp', quantity: 2 },
    ];
    const groups: ShoppingListGroup[] = [
      {
        category: 'Pantry',
        items: [{ name: 'olive oil', amounts, category: 'Pantry', sourceNames: ['olive oil'] }],
      },
    ];

    expect(formatShoppingListText(groups)).toBe(`Pantry\n- ${formatAmounts(amounts)} olive oil`);
    expect(formatShoppingListText(groups)).toBe('Pantry\n- 1 tbsp + 2 tsp olive oil');
  });
});
