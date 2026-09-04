import { supabase } from '@/shared/lib/supabase';
import type { CurrentPlan, WeeklyPlan } from '@/features/weekly-plan/types';

/**
 * The plan for the current planning week — the `weekly_plans` row whose `start_date` is
 * `startDate` (the household's planning-week start, computed client-side in local time,
 * intent 011), with its selections embedded. Null if that week has no plan yet.
 *
 * Was "the most recently created plan"; that made stale picks from an old week look current.
 * Delegates to `fetchPlanByStartDate` — same query, kept as its own name so callers/tests that
 * think in terms of "the current plan" have a stable entry point.
 */
export function fetchCurrentPlan(startDate: string): Promise<CurrentPlan | null> {
  return fetchPlanByStartDate(startDate);
}

/**
 * The plan whose `start_date` matches exactly (FR-11's week navigation) — null if that week
 * was skipped (no plan exists for it). If more than one plan somehow shares a start_date, the
 * most recently created one wins.
 */
export async function fetchPlanByStartDate(startDate: string): Promise<CurrentPlan | null> {
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*, weekly_plan_selections(*, dinners(*))')
    .eq('start_date', startDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as CurrentPlan | null;
}

/** Starts a new draft plan. Used when there's no current plan, or the current one is locked. */
export async function createPlan(startDate: string): Promise<WeeklyPlan> {
  const { data, error } = await supabase
    .from('weekly_plans')
    .insert({ start_date: startDate })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addSelection(planId: string, dinnerId: string): Promise<void> {
  const { error } = await supabase
    .from('weekly_plan_selections')
    .insert({ weekly_plan_id: planId, dinner_id: dinnerId });

  if (error) throw error;
}

export async function removeSelection(selectionId: string): Promise<void> {
  const { error } = await supabase.from('weekly_plan_selections').delete().eq('id', selectionId);
  if (error) throw error;
}

/** Locks a plan via the DB's `lock_weekly_plan` RPC. Idempotent — locking an already-locked plan is a no-op success. */
export async function lockPlan(planId: string): Promise<WeeklyPlan> {
  const { data, error } = await supabase.rpc('lock_weekly_plan', { p_plan_id: planId });
  if (error) throw error;
  return data;
}
