import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchDinnersPerWeek,
  fetchServingsPerDinner,
  fetchWeekStartDay,
  updateDinnersPerWeek,
  updateServingsPerDinner,
  updateWeekStartDay,
} from '@/features/settings/api';

/** Query key for the household's planning-week-start weekday (intent 011). */
export const weekStartDayKey = ['household', 'week-start-day'] as const;

/** Reads `households.week_start_day` (0 = Sunday .. 6 = Saturday). */
export function useWeekStartDay() {
  return useQuery({ queryKey: weekStartDayKey, queryFn: fetchWeekStartDay });
}

/**
 * Owner-only write of the week-start weekday. On success it invalidates the setting itself
 * and every `['weekly-plan', …]` query, so the catalog / plan surfaces re-derive the current
 * planning window immediately after a mid-week change (unit 2).
 */
export function useUpdateWeekStartDay(householdId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekStartDay: number) => {
      if (!householdId) throw new Error('No household in context');
      return updateWeekStartDay(householdId, weekStartDay);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: weekStartDayKey });
      void queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
    },
  });
}

/** Query key for how many dinners the household plans per week (intent 015). */
export const dinnersPerWeekKey = ['household', 'dinners-per-week'] as const;

/** Reads `households.dinners_per_week` (1..7, default 3). */
export function useDinnersPerWeek() {
  return useQuery({ queryKey: dinnersPerWeekKey, queryFn: fetchDinnersPerWeek });
}

/**
 * Owner-only write of the plan size. Like `useUpdateWeekStartDay` it invalidates
 * `['weekly-plan', …]` as well as its own key, but for a different reason: this number decides
 * whether the current plan is FULL, which drives the lock control, the plan page's nudge, and the
 * shopping-list and cooking-view gates. Without that invalidation the setting would save while
 * four other screens carried on using the old number until something else happened to refetch.
 */
export function useUpdateDinnersPerWeek(householdId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dinnersPerWeek: number) => {
      if (!householdId) throw new Error('No household in context');
      return updateDinnersPerWeek(householdId, dinnersPerWeek);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dinnersPerWeekKey });
      void queryClient.invalidateQueries({ queryKey: ['weekly-plan'] });
    },
  });
}

/** Query key for how many people the household cooks a dinner for (intent 018). */
export const servingsPerDinnerKey = ['household', 'servings-per-dinner'] as const;

/** Reads `households.servings_per_dinner` (1..12, default 3). */
export function useServingsPerDinner() {
  return useQuery({ queryKey: servingsPerDinnerKey, queryFn: fetchServingsPerDinner });
}

/**
 * Owner-only write of the serving size. Unlike `useUpdateDinnersPerWeek` it invalidates ONLY its
 * own key, and that is the point (ADR-14): no stored dinner, plan or shopping list depends on this
 * number, so nothing else has to refetch. If this ever needs to invalidate dinner data, something
 * has started treating stored quantities as "for N people" — read ADR-14 first.
 */
export function useUpdateServingsPerDinner(householdId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (servingsPerDinner: number) => {
      if (!householdId) throw new Error('No household in context');
      return updateServingsPerDinner(householdId, servingsPerDinner);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: servingsPerDinnerKey });
    },
  });
}
