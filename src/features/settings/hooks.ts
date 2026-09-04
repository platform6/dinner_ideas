import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchWeekStartDay, updateWeekStartDay } from '@/features/settings/api';

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
