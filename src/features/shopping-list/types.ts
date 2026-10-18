/** One unit's total on a line. A line has one per distinct unit, never converted (FR-2). */
export interface ShoppingListAmount {
  unit: string;
  quantity: number;
}

export interface ShoppingListItem {
  /** The plain label: the first appearance's name without prep notes (FR-3). */
  name: string;
  /** In the order each unit first appears. */
  amounts: ShoppingListAmount[];
  category: string;
  /**
   * The distinct raw ingredient names merged into this line, in first-appearance order. Not
   * displayed; this is how a line can find the registry item a placement was made on.
   */
  sourceNames: string[];
}

export interface ShoppingListGroup {
  category: string;
  items: ShoppingListItem[];
}
