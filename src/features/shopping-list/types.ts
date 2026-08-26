export interface ShoppingListItem {
  name: string;
  unit: string;
  quantity: number;
  category: string;
}

export interface ShoppingListGroup {
  category: string;
  items: ShoppingListItem[];
}
