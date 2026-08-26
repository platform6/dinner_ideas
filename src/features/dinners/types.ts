import type { Database } from '@/shared/lib/database.types';

export type Dinner = Database['public']['Tables']['dinners']['Row'];
export type DinnerIngredient = Database['public']['Tables']['dinner_ingredients']['Row'];
export type DinnerStep = Database['public']['Tables']['dinner_steps']['Row'];

export interface DinnerWithIngredients extends Dinner {
  dinner_ingredients: DinnerIngredient[];
}

export interface DinnerWithSteps extends Dinner {
  dinner_steps: DinnerStep[];
}
