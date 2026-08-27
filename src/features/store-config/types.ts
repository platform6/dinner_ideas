import type { Database } from '@/shared/lib/database.types';

export type GroceryStoreRow = Database['public']['Tables']['grocery_store_rows']['Row'];
export type CategoryRowAssignment = Database['public']['Tables']['category_row_assignments']['Row'];
