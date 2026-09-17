import { useEffect, useRef, type ReactNode } from 'react';
import { Box } from '@chakra-ui/react';

import { TAB_BAR_HEIGHT_PX } from '@/shared/components/tab-bar';

/** Space kept between a focused control and the top of the footer. */
export const FOCUS_CLEARANCE_PX = 8;

/**
 * A phone footer that sticks just above the tab bar, and tells the browser how much of the bottom
 * of the screen it covers (intent 019, FR-6).
 *
 * Sticky, so it holds its own place at the end of the page: scrolled to the bottom, nothing is
 * underneath it. What sticky does NOT do is stop a focused control from being scrolled beneath it.
 * The browser only avoids what it knows about, so while this is mounted `scroll-padding-bottom` on
 * the document covers the tab bar plus this footer's current height. It is re-measured as the
 * footer's content changes, and removed on unmount, which includes the page moving these controls
 * into its header at md+.
 *
 * Content passing beneath it mid-scroll is expected; that is what a sticky footer is.
 */
export function StickyPhoneFooter({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const root = document.documentElement;

    const apply = () => {
      const covered = TAB_BAR_HEIGHT_PX + Math.ceil(node.getBoundingClientRect().height) + FOCUS_CLEARANCE_PX;
      root.style.scrollPaddingBottom = `${covered}px`;
    };

    apply();
    // jsdom and very old browsers have no ResizeObserver; one measurement is still correct until the
    // footer's content changes.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
    observer?.observe(node);

    return () => {
      observer?.disconnect();
      root.style.scrollPaddingBottom = '';
    };
  }, []);

  return (
    <Box
      ref={ref}
      position="sticky"
      bottom={`${TAB_BAR_HEIGHT_PX}px`}
      bg="paper.base"
      pt={3}
      borderTopWidth="1px"
      borderColor="line.subtle"
    >
      {children}
    </Box>
  );
}
