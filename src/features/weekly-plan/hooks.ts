import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addSelection,
  createPlan,
  fetchCurrentPlan,
  lockPlan,
  removeSelection,
} from '@/features/weekly-plan/api';
import { decideToggleAction } from '@/features/weekly-plan/toggle-selection';
import type { CurrentPlan } from '@/features/weekly-plan/types';

const currentPlanKey = ['weekly-plan', 'current'] as const;

export function useCurrentPlan() {
  return useQuery({ queryKey: currentPlanKey, queryFn: fetchCurrentPlan });
}

/**
 * Today's date as `YYYY-MM-DD` in the browser's local timezone, for a new plan's
 * `start_date`. Deliberately not `toISOString().slice(0, 10)`, which gives the UTC date —
 * wrong for any household west of UTC once local time has passed midnight UTC.
 */
function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
