import { supabase } from '@/shared/lib/supabase';
import type { CurrentPlan, WeeklyPlan } from '@/features/weekly-plan/types';

/** The most recently created weekly plan (locked or not), with its selections embedded. Null if none exists yet. */
export async function fetchCurrentPlan(): Promise<CurrentPlan | null> {
  const { data, error } = await supabase
    .from('weekly_plans')
    .select('*, weekly_plan_selections(*, dinners(*))')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as CurrentPlan | null;
}

/**
 * The plan whose `start_date` matches exactly (FR-11's week navigation) — null if that week
 * was skipped (no plan exists for it). If more than one plan somehow shares a start_date, the
 * most recently created one wins, same tie-break as `fetchCurrentPlan`.
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
