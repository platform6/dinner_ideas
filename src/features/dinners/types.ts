import type { Database } from '@/shared/lib/database.types';

export type Dinner = Database['public']['Tables']['dinners']['Row'];
export type DinnerIngredient = Database['public']['Tables']['dinner_ingredients']['Row'];
export type DinnerStep = Database['public']['Tables']['dinner_steps']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];

export interface DinnerWithIngredients extends Dinner {
  dinner_ingredients: DinnerIngredient[];
}

export interface DinnerWithSteps extends Dinner {
  dinner_steps: DinnerStep[];
}

/** A dinner as shown in the catalog list: ingredients (for aggregation elsewhere) plus its tag names (FR-9). */
export interface CatalogDinner extends DinnerWithIngredients {
  tags: string[];
}

/**
 * Everything the catalog card's expanded "Details" section needs (FR-10): ordered steps, the
 * full ingredient list, and tags — with ids, since removing a tag needs `tag_id`, not just its name.
 * Fetched lazily per-dinner on first expand, not embedded in the main catalog list query.
 */
export interface DinnerFullDetails {
  dinner_steps: DinnerStep[];
  dinner_ingredients: DinnerIngredient[];
  tags: Array<Pick<Tag, 'id' | 'name'>>;
}
