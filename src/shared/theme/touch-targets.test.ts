import { describe, expect, it } from 'vitest';

import { theme } from '@/shared/theme';

/**
 * Intent 024, FR-1: every control the household taps is at least 44px on a phone, and stays denser
 * from `md` up, where a pointer is precise.
 *
 * These read the built theme rather than a rendered page: jsdom has no layout, so a rendered height
 * proves nothing (NFR-3). The proof that the app obeys these values is the browser sweep recorded in
 * the bolt's walkthrough; this file is what stops the values drifting back.
 *
 * A responsive value is `[base, sm, md, …]`: index 0 is the phone, index 2 is `md` and up.
 */
const PHONE = 0;
const DESKTOP = 2;

/**
 * Chakra keeps some component styles as functions of the render props once themes are merged
 * (`Select`'s variants and `Tabs`' base style are), so resolve before reading.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolve(style: any): any {
  return typeof style === 'function'
    ? style({ theme, colorMode: 'light', colorScheme: 'gray', orientation: 'horizontal' })
    : style;
}

describe('touch targets on a phone (intent 024, FR-1)', () => {
  it('should make the small button 44px on a phone and 34px from md up', () => {
    const sm = theme.components.Button.sizes.sm;

    expect(sm.h[PHONE]).toBe('44px');
    expect(sm.minW[PHONE]).toBe('44px');
    expect(sm.h[DESKTOP]).toBe('34px');
    expect(sm.minW[DESKTOP]).toBe('34px');
  });

  it('should leave the text inside a small button alone', () => {
    expect(theme.components.Button.sizes.sm.fontSize).toBe('0.75rem');
    expect(theme.components.Button.sizes.sm.px).toBe(3);
  });

  it('should leave the medium and large buttons as they were, at every width', () => {
    expect(theme.components.Button.sizes.md).toMatchObject({ h: '44px', minW: '44px' });
    expect(theme.components.Button.sizes.lg).toMatchObject({ h: '52px' });
  });

  it('should make a select 44px on a phone and 38px from md up', () => {
    // A select takes its height from its variant, not from `size`.
    const field = resolve(theme.components.Select.variants.outline).field;

    expect(field.h[PHONE]).toBe('44px');
    expect(field.h[DESKTOP]).toBe('38px');
  });

  it('should give a tab a 44px minimum on a phone, and none from md up', () => {
    const tab = resolve(theme.components.Tabs.baseStyle).tab;

    expect(tab.minH[PHONE]).toBe('44px');
    expect(tab.minH[DESKTOP]).toBe('auto');
  });

  it('should give a menu item a 44px minimum on a phone, and none from md up', () => {
    // "Not interested" and "Remove…" on a catalog card are menu items.
    const item = resolve(theme.components.Menu.baseStyle).item;

    expect(item.minH[PHONE]).toBe('44px');
    expect(item.minH[DESKTOP]).toBe('auto');
  });

  it('should give a tag 44px in both directions on a phone', () => {
    // Every tag is a button: the entry form's chips toggle a tag on the draft. A short name
    // ("kim") was 38px wide until `minW` was added, which the browser sweep caught.
    const container = resolve(theme.components.Tag.baseStyle).container;

    expect(container.minH[PHONE]).toBe('44px');
    expect(container.minW[PHONE]).toBe('44px');
    expect(container.minH[DESKTOP]).toBe('auto');
    expect(container.minW[DESKTOP]).toBe('auto');
  });
});
