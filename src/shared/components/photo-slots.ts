/**
 * Whether the photo slots render (intent 025). Intent 002 drew them ahead of real photos: the
 * catalog card's 76px tile, the cooking view's 44px thumb and This week's three-across tile. No
 * dinner has a photo yet, so they're off. The markup stays behind this flag, so turning it back on
 * restores them unchanged once photos exist. See `ux-guide.md`, "Photo slots".
 */
export const SHOW_PHOTO_SLOTS = false;
