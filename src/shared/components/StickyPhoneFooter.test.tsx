import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FOCUS_CLEARANCE_PX, StickyPhoneFooter } from '@/shared/components/StickyPhoneFooter';
import { TAB_BAR_HEIGHT_PX } from '@/shared/components/tab-bar';
import { theme } from '@/shared/theme';

/** A rendered size for the footer, standing in for the browser's layout. */
function rect(height: number): DOMRect {
  return { height, width: 0, top: 0, left: 0, right: 0, bottom: height, x: 0, y: 0, toJSON: () => ({}) };
}

/** Every element reports this height; the footer is the only one the component measures. */
function footerHeightIs(height: number) {
  return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(height));
}

function renderFooter() {
  return render(
    <ChakraProvider theme={theme}>
      <StickyPhoneFooter>
        <button type="button">Copy shopping list</button>
      </StickyPhoneFooter>
    </ChakraProvider>,
  );
}

const padding = () => document.documentElement.style.scrollPaddingBottom;

describe('StickyPhoneFooter (intent 019, FR-6)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.style.scrollPaddingBottom = '';
  });

  it('should render its content, sticky above the tab bar', () => {
    renderFooter();
    const footer = screen.getByRole('button', { name: 'Copy shopping list' }).parentElement!;

    expect(getComputedStyle(footer).position).toBe('sticky');
    expect(getComputedStyle(footer).bottom).toBe(`${TAB_BAR_HEIGHT_PX}px`);
  });

  it('should reserve the tab bar, its own height and the clearance as bottom scroll padding', () => {
    footerHeightIs(98);
    renderFooter();

    expect(padding()).toBe(`${TAB_BAR_HEIGHT_PX + 98 + FOCUS_CLEARANCE_PX}px`);
    expect(padding()).toBe('176px');
  });

  it('should re-measure when its content changes size', () => {
    let notify: (() => void) | undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const height = footerHeightIs(98);
    renderFooter();
    expect(padding()).toBe('176px');

    // The lock nudge goes away and the footer shrinks.
    height.mockReturnValue(rect(52));
    notify?.();

    expect(padding()).toBe(`${TAB_BAR_HEIGHT_PX + 52 + FOCUS_CLEARANCE_PX}px`);
  });

  it('should still measure once where ResizeObserver does not exist', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    footerHeightIs(40);
    renderFooter();

    expect(padding()).toBe(`${TAB_BAR_HEIGHT_PX + 40 + FOCUS_CLEARANCE_PX}px`);
  });

  it('should remove the padding when it unmounts', () => {
    footerHeightIs(98);
    const { unmount } = renderFooter();
    expect(padding()).not.toBe('');

    unmount();

    expect(padding()).toBe('');
  });
});
