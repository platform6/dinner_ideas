import { describe, expect, it } from 'vitest';

import { normalizeTagName } from '@/features/dinners/tags';

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
