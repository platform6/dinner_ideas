import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addSelection,
  createPlan,
  fetchCurrentPlan,
  fetchPlanByStartDate,
  lockPlan,
  removeSelection,
} from '@/features/weekly-plan/api';
import { decideToggleAction } from '@/features/weekly-plan/toggle-selection';
import { shiftWeek, todayIsoDate } from '@/features/weekly-plan/date';
import type { CurrentPlan } from '@/features/weekly-plan/types';

const currentPlanKey = ['weekly-plan', 'current'] as const;

export function useCurrentPlan() {
  return useQuery({ queryKey: currentPlanKey, queryFn: fetchCurrentPlan });
}

/**
 * Browses weekly plans by offset from the current/latest one (FR-11): `offset: 0` is today's
 * plan (reuses `useCurrentPlan`, no extra fetch); negative offsets look up the plan whose
 * `start_date` is exactly that many weeks earlier, returning `data: null` if that week has no
 * plan (a skipped week) rather than an error. The anchor falls back to today's date when no
 * plan exists yet at all.
 */
export function useWeekByOffset(offset: number) {
  const currentPlan = useCurrentPlan();
  const anchorDate = currentPlan.data?.start_date ?? todayIsoDate();
  const targetDate = offset === 0 ? anchorDate : shiftWeek(anchorDate, offset);

  const pastQuery = useQuery({
    queryKey: ['weekly-plan', 'by-date', targetDate] as const,
    queryFn: () => fetchPlanByStartDate(targetDate),
    enabled: offset !== 0 && !currentPlan.isLoading,
  });

  const active = offset === 0 ? currentPlan : pastQuery;

  return {
    data: active.data,
    isLoading: active.isLoading,
    isError: active.isError,
    weekStartDate: targetDate,
  };
}

interface ToggleSelectionArgs {
  dinnerId: string;
  /** The plan currently loaded by `useCurrentPlan()` — read once per toggle, not re-fetched here. */
  currentPlan: CurrentPlan | null;
}

/**
 * Adds or removes a dinner from the current plan's selections — see `decideToggleAction`
 * for which of those it does. Creating a fresh plan when needed is the only way a new week's
 * plan comes into existence; there's no separate "start new week" action.
 */
export function useToggleSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dinnerId, currentPlan }: ToggleSelectionArgs) => {
      const action = decideToggleAction(dinnerId, currentPlan);

      if (action.type === 'remove') {
        await removeSelection(action.selectionId);
        return;
      }

      const planId = action.type === 'create-and-add' ? (await createPlan(todayIsoDate())).id : action.planId;
      await addSelection(planId, dinnerId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currentPlanKey });
    },
  });
}

/** Locks a plan — see `weekly-plan/api.ts#lockPlan` for the idempotency contract. */
export function useLockPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => lockPlan(planId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currentPlanKey });
    },
  });
}
