import { describe, expect, it } from 'vitest';

/**
 * Intent 019, FR-5: the action is "Add a dinner" everywhere it is named. The catalog button once
 * said "Add dinner" while its aria-label and the page it opens said "Add a dinner".
 *
 * Scans source rather than rendering, so a new screen can't reintroduce the old wording unnoticed.
 * It matches JSX text (after `>`) and string literals, not comments.
 */
const sources = import.meta.glob<string>(['/src/**/*.tsx', '!/src/**/*.test.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const OLD_WORDING = /(>\s*|['"`])Add dinner\b/;

describe('"Add a dinner" wording guard', () => {
  it('should scan the app source', () => {
    expect(Object.keys(sources)).toContain('/src/features/dinners/components/CatalogPage.tsx');
  });

  it('should detect the old wording as JSX text or a string literal, but not in a comment', () => {
    expect(OLD_WORDING.test('<Button>\n  Add dinner\n</Button>')).toBe(true);
    expect(OLD_WORDING.test("aria-label='Add dinner'")).toBe(true);
    expect(OLD_WORDING.test('// the old "Add a dinner" vs Add dinner mismatch')).toBe(false);
    expect(OLD_WORDING.test('<Button>Add a dinner</Button>')).toBe(false);
  });

  it('should find no user-facing "Add dinner" in src/', () => {
    const offenders = Object.entries(sources)
      .filter(([, source]) => OLD_WORDING.test(source))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
