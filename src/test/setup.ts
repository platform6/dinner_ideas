import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollTo/scrollIntoView — Chakra's Menu (and Popover/Drawer) call
// scrollTo on their content ref when opening, which otherwise throws inside a passive effect
// and gets reported as an uncaught error mid-test (introduced with 002-kitchen-table-theme's
// card overflow menu, bolt 015).
Element.prototype.scrollTo ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
