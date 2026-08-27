import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addRow,
  assignCategory,
  deleteRow,
  fetchAssignments,
  fetchRows,
  reorderRow,
} from '@/features/store-config/api';
import { fetchDistinctIngredientCategories } from '@/features/dinners/api';

const rowsKey = ['store-config', 'rows'] as const;
const assignmentsKey = ['store-config', 'assignments'] as const;
const categoriesKey = ['store-config', 'categories'] as const;

export function useRows() {
  return useQuery({ queryKey: rowsKey, queryFn: fetchRows });
}

export function useAssignments() {
  return useQuery({ queryKey: assignmentsKey, queryFn: fetchAssignments });
}

/** Distinct ingredient categories to assign to rows — rarely changes, safe to treat as long-lived. */
export function useDistinctCategories() {
  return useQuery({ queryKey: categoriesKey, queryFn: fetchDistinctIngredientCategories });
}

export function useAddRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, currentRowCount }: { name: string; currentRowCount: number }) =>
      addRow(name, currentRowCount),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rowsKey });
    },
  });
}

export function useReorderRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rowId, newPosition }: { rowId: string; newPosition: number }) =>
      reorderRow(rowId, newPosition),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rowsKey });
    },
  });
}

export function useDeleteRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rowId: string) => deleteRow(rowId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rowsKey });
      void queryClient.invalidateQueries({ queryKey: assignmentsKey });
    },
  });
}

export function useAssignCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ category, rowId }: { category: string; rowId: string }) => assignCategory(category, rowId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assignmentsKey });
    },
  });
}
