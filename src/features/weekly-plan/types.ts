import type { Database } from '@/shared/lib/database.types';
import type { Dinner } from '@/features/dinners/types';

export type WeeklyPlan = Database['public']['Tables']['weekly_plans']['Row'];
export type WeeklyPlanSelection = Database['public']['Tables']['weekly_plan_selections']['Row'];

export interface SelectionWithDinner extends WeeklyPlanSelection {
  dinners: Dinner;
}

/** The most recent weekly plan, with its (up to 3) selections and their dinner details embedded. */
export interface CurrentPlan extends WeeklyPlan {
  weekly_plan_selections: SelectionWithDinner[];
}
