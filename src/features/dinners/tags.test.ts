import { describe, expect, it } from 'vitest';

import { isRosieApproved, normalizeTagName } from '@/features/dinners/tags';

describe('normalizeTagName', () => {
  it('lowercases the name', () => {
    expect(normalizeTagName('Kid-Friendly')).toBe('kid-friendly');
  });

  it('trims leading/trailing whitespace', () => {
    expect(normalizeTagName('  spicy  ')).toBe('spicy');
  });

  it('trims and lowercases together', () => {
    expect(normalizeTagName('  Freezer-Friendly  ')).toBe('freezer-friendly');
  });

  it('reduces a whitespace-only name to an empty string', () => {
    expect(normalizeTagName('   ')).toBe('');
  });

  it('leaves an already-normalized name unchanged', () => {
    expect(normalizeTagName('kid-friendly')).toBe('kid-friendly');
  });
});

describe('isRosieApproved', () => {
  it('is true when the tag list includes rosie-approved', () => {
    expect(isRosieApproved(['kid-friendly', 'rosie-approved'])).toBe(true);
  });

  it('is false when the tag list has other tags but not rosie-approved', () => {
    expect(isRosieApproved(['kid-friendly', 'spicy'])).toBe(false);
  });

  it('is false for an empty tag list', () => {
    expect(isRosieApproved([])).toBe(false);
  });

  it('is false for null/undefined tags', () => {
    expect(isRosieApproved(null)).toBe(false);
    expect(isRosieApproved(undefined)).toBe(false);
  });

  it('does not match a similarly-named tag', () => {
    expect(isRosieApproved(['rosie-approved-ish'])).toBe(false);
  });
});
