import type { Database } from '@/shared/lib/database.types';

export type Store = Database['public']['Tables']['stores']['Row'];
export type Location = Database['public']['Tables']['locations']['Row'];
export type Item = Database['public']['Tables']['items']['Row'];
export type ItemPlacement = Database['public']['Tables']['item_placements']['Row'];
export type CategoryPlacement = Database['public']['Tables']['category_placements']['Row'];
export type SuggestionDismissal = Database['public']['Tables']['suggestion_dismissals']['Row'];

/** How an item came to sit where it sits (FR-6). */
export type PlacementState = 'placed' | 'inherited' | 'unassigned';

/**
 * One row of the `item_location_resolution` view (unit 1, story 004) — the single definition of
 * explicit → inherited → unassigned, which this page and the shopping-list sort both read.
 *
 * The generated view type has every column nullable (Postgres cannot prove otherwise for a
 * view), so `mapResolvedItem` in `api.ts` narrows it to this shape and drops any row missing an
 * identity. `locationId` stays nullable because it is genuinely null for an unassigned item.
 */
export interface ResolvedItem {
  itemId: string;
  itemName: string;
  nameKey: string;
  category: string | null;
  state: PlacementState;
  locationId: string | null;
  locationName: string | null;
  locationPosition: number | null;
  /** The category an inherited placement came through — populated only when `state` is `inherited`. */
  viaCategory: string | null;
  /**
   * When someone last confirmed or corrected where this item sits; `null` = nobody has looked.
   *
   * Distinct from `state`: an item can be `inherited` and reviewed (the category default is
   * right, and someone said so) or `inherited` and unreviewed (it just arrived). That
   * distinction is the whole reason the column exists — `unassigned` cannot serve as
   * "needs attention" because it is unreachable for anything but a registry orphan
   * (intent 013, bolt 055).
   */
  reviewedAt: string | null;
}

/** A walking-path stop with the resolved items that currently point at it. */
export interface PathStop {
  location: Location;
  items: ResolvedItem[];
}
