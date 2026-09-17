import { describe, expect, it } from 'vitest';

import { CARD_MENU_GAP_PX, cardMenuDistance } from '@/features/dinners/components/card-menu-offset';

describe('cardMenuDistance (intent 019, FR-7)', () => {
  it('should open a bottom menu below the whole header block, plus the gap', () => {
    // Button 20–54px; a four-line title makes the header end at 197px.
    expect(cardMenuDistance('bottom-end', 54, 197)).toBe(197 - 54 + CARD_MENU_GAP_PX);
    expect(cardMenuDistance('bottom-start', 54, 197)).toBe(197 - 54 + CARD_MENU_GAP_PX);
    expect(cardMenuDistance('bottom', 54, 197)).toBe(197 - 54 + CARD_MENU_GAP_PX);
  });

  it('should keep the normal gap when the menu flips above the button', () => {
    expect(cardMenuDistance('top-end', 600, 760)).toBe(CARD_MENU_GAP_PX);
    expect(cardMenuDistance('top', 600, 760)).toBe(CARD_MENU_GAP_PX);
  });

  it('should never be closer than the normal gap, even if the header ends above the button', () => {
    expect(cardMenuDistance('bottom-end', 54, 40)).toBe(CARD_MENU_GAP_PX);
    expect(cardMenuDistance('bottom-end', 54, 54)).toBe(CARD_MENU_GAP_PX);
  });

  it('should fall back to the normal gap when either element is unmeasured', () => {
    expect(cardMenuDistance('bottom-end', null, 197)).toBe(CARD_MENU_GAP_PX);
    expect(cardMenuDistance('bottom-end', 54, null)).toBe(CARD_MENU_GAP_PX);
  });
});
