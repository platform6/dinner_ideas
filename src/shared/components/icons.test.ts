import { describe, expect, it } from 'vitest';
import { Beef, Fish, Milk, Salad, Utensils, UtensilsCrossed } from 'lucide-react';

import { categoryIcon, cuisineIcon, stepIcon } from '@/shared/components/icons';

describe('cuisineIcon', () => {
  it('returns the mapped icon for a known cuisine', () => {
    expect(cuisineIcon('Japanese')).toBe(Fish);
  });

  it('falls back to Utensils for an unknown cuisine', () => {
    expect(cuisineIcon('Klingon')).toBe(Utensils);
  });

  it('falls back to Utensils for null/undefined', () => {
    expect(cuisineIcon(null)).toBe(Utensils);
    expect(cuisineIcon(undefined)).toBe(Utensils);
  });
});

describe('categoryIcon', () => {
  it('returns the mapped icon for a known category', () => {
    expect(categoryIcon('Dairy')).toBe(Milk);
    expect(categoryIcon('Protein')).toBe(Beef);
  });

  it('falls back to the Other icon for an unrecognized category', () => {
    expect(categoryIcon('Spices')).toBe(categoryIcon('Other'));
  });
});

describe('stepIcon', () => {
  it('matches an oven/temperature instruction', () => {
    expect(stepIcon('Preheat the oven to 375°F.')).toBe(UtensilsCrossed);
  });

  it('matches a prep instruction', () => {
    expect(stepIcon('Chop the onion and dice the peppers.')).toBe(Salad);
  });

  it('checks rules in order — an instruction matching an earlier rule does not fall through to a later one', () => {
    // Contains both "oven" (rule 1) and "toss" (rule 2) — rule 1 should win.
    expect(stepIcon('Toss the vegetables, then heat the oven to 400°F.')).toBe(UtensilsCrossed);
  });

  it('falls back to Utensils when no keyword matches', () => {
    expect(stepIcon('Let it rest for five minutes.')).toBe(Utensils);
  });
});
