import { describe, expect, it } from 'vitest';

import { importQuantityNote } from '@/features/recipe-entry/components/import-quantity-note';

describe('importQuantityNote — what the review says about an import’s quantities', () => {
  it('says the page gave no count, when it gave none', () => {
    expect(importQuantityNote(null, 5)).toMatch(/didn’t say how many it serves.*NOT been adjusted to 5/);
  });

  it('says what the quantities are for, verbatim, when the page gave a yield', () => {
    // A range is shown as the page wrote it — never collapsed (intent 018, Checkpoint 2).
    expect(importQuantityNote('8–10', 5)).toBe(
      'These quantities are as the page wrote them — for 8–10. They have NOT been adjusted to 5.',
    );
  });

  it('says they already match, instead of "NOT adjusted", when the page serves the household size', () => {
    expect(importQuantityNote('Serves 5', 5)).toBe(
      'These quantities are as the page wrote them — for Serves 5, which matches your household.',
    );
  });

  it('never claims a match from a count of pieces', () => {
    // "Makes 5 muffins" is not 5 people. readYield says unknown, so it is not a match.
    expect(importQuantityNote('Makes 5 muffins', 5)).toMatch(/NOT been adjusted to 5/);
  });
});
