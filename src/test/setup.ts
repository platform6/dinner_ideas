import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollTo/scrollIntoView — Chakra's Menu (and Popover/Drawer) call
// scrollTo on their content ref when opening, which otherwise throws inside a passive effect
// and gets reported as an uncaught error mid-test (introduced with 002-kitchen-table-theme's
// card overflow menu, bolt 015).
Element.prototype.scrollTo ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

// jsdom doesn't implement window.matchMedia — Chakra's useBreakpointValue / useBreakpoint read it
// and otherwise throw. Stub it to always report "no match", so responsive hooks resolve to their
// `base` value under test (introduced with 005-desktop-layout's single-nav rail render, bolt 032).
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
