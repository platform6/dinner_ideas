/** Chakra's default gap between a menu and its button, kept wherever the title isn't at risk. */
export const CARD_MENU_GAP_PX = 8;

/**
 * How far below (or above) its "⋮" button a catalog card's action menu opens (intent 019, FR-7).
 *
 * The button sits at the top right of the card's header row, beside the title. A title that wraps,
 * which most do on a phone and many do at three columns, runs below the button, so a menu dropping
 * straight down lands on it. Opening below the whole header block (icon, title and meta) keeps the
 * dinner's name readable, so it's clear which dinner "Not interested" or "Remove…" acts on.
 *
 * When there's no room below and the menu flips above the button, the normal gap is right: the
 * title starts level with the button, so a menu above the button can't cover it. The same applies
 * if either element hasn't been measured.
 *
 * Positions are viewport pixels (`getBoundingClientRect().bottom`).
 */
export function cardMenuDistance(
  placement: string,
  buttonBottom: number | null,
  headerBottom: number | null,
): number {
  if (!placement.startsWith('bottom') || buttonBottom === null || headerBottom === null) {
    return CARD_MENU_GAP_PX;
  }
  return Math.max(CARD_MENU_GAP_PX, headerBottom - buttonBottom + CARD_MENU_GAP_PX);
}
