import type { CurrentPlan } from '@/features/weekly-plan/types';

export type ToggleAction =
  { type: 'remove'; selectionId: string } | { type: 'create-and-add' } | { type: 'add'; planId: string };

/**
 * Decides what picking/unpicking `dinnerId` should do against the current plan —
 * the riskiest branching in the pick-3 flow (see `implementation-plan.md`'s Technical Approach).
 *
 * - No plan, or the current one is locked → a new plan needs creating first (checked *before*
 *   looking for an existing selection — a dinner that happens to appear in a just-locked plan
 *   must still be re-pickable, not misread as "already selected, remove it").
 * - Already selected in the current *unlocked* plan → remove it.
 * - Otherwise → add to the existing unlocked plan.
 */
export function decideToggleAction(dinnerId: string, currentPlan: CurrentPlan | null): ToggleAction {
  const isUsable = currentPlan !== null && currentPlan.locked_at === null;
  if (!isUsable) return { type: 'create-and-add' };

  const existing = currentPlan.weekly_plan_selections.find((s) => s.dinner_id === dinnerId);
  if (existing) return { type: 'remove', selectionId: existing.id };

  return { type: 'add', planId: currentPlan.id };
}
