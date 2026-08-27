import { useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Center,
  Heading,
  HStack,
  IconButton,
  SimpleGrid,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

import { useAllTags, useDinners, useLastChosenDates, useSetDinnerActive } from '@/features/dinners/hooks';
import { DinnerCard } from '@/features/dinners/components/DinnerCard';
import { CatalogFilters, type CatalogFilterState } from '@/features/dinners/components/CatalogFilters';
import { applyFilters } from '@/features/dinners/filters';
import { formatLastChosen } from '@/features/dinners/last-chosen';
import { useCurrentPlan, useToggleSelection } from '@/features/weekly-plan/hooks';
import { uiIcons } from '@/shared/components/icons';

const defaultFilters: CatalogFilterState = {
  cuisine: null,
  tags: [],
  sortByCookTime: false,
};

export function CatalogPage() {
  const [filters, setFilters] = useState<CatalogFilterState>(defaultFilters);

  const activeDinners = useDinners();
  const setDinnerActive = useSetDinnerActive();
  const currentPlan = useCurrentPlan();
  const toggleSelection = useToggleSelection();
  const lastChosenDates = useLastChosenDates();
  const allTags = useAllTags();

  const selectedDinnerIds = useMemo(() => {
    const plan = currentPlan.data;
    if (!plan || plan.locked_at !== null) return new Set<string>();
    return new Set(plan.weekly_plan_selections.map((s) => s.dinner_id));
  }, [currentPlan.data]);

  const cuisines = useMemo(() => {
    if (!activeDinners.data) return [];
    return [...new Set(activeDinners.data.map((dinner) => dinner.cuisine_type))].sort();
  }, [activeDinners.data]);

  const visibleDinners = useMemo(() => {
    return applyFilters(activeDinners.data ?? [], filters, lastChosenDates.data ?? new Map());
  }, [activeDinners.data, filters, lastChosenDates.data]);

  return (
    <>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={3}>
        <Heading textStyle="pageTitle" as="h1">
          Dinner catalog
        </Heading>
        <HStack gap={2}>
          {selectedDinnerIds.size > 0 && <Text color="ink.500">{selectedDinnerIds.size}/3 selected</Text>}
          <IconButton
            as={RouterLink}
            to="/suppressed"
            aria-label="Not interested dinners"
            icon={<uiIcons.suppress size={18} strokeWidth={1.8} />}
            variant="ghost"
            size="sm"
          />
        </HStack>
      </HStack>

      {toggleSelection.isError && (
        <Alert status="error" borderRadius="field" mb={4}>
          <AlertIcon />
          Couldn’t save that change, try again.
        </Alert>
      )}

      {setDinnerActive.isError && (
        <Alert status="error" borderRadius="field" mb={4}>
          <AlertIcon />
          Couldn’t update that dinner, try again.
        </Alert>
      )}

      <CatalogFilters
        cuisines={cuisines}
        availableTags={(allTags.data ?? []).map((tag) => tag.name)}
        filters={filters}
        onChange={setFilters}
      />

      {activeDinners.isLoading && (
        <Center py={12}>
          <Spinner size="lg" />
        </Center>
      )}

      {activeDinners.isError && (
        <Alert status="error" borderRadius="field">
          <AlertIcon />
          Couldn’t load dinners. Try refreshing the page.
        </Alert>
      )}

      {!activeDinners.isLoading && !activeDinners.isError && visibleDinners.length === 0 && (
        <Text color="ink.400">No dinners match these filters.</Text>
      )}

      {!activeDinners.isLoading && !activeDinners.isError && visibleDinners.length > 0 && (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
          {visibleDinners.map((dinner) => (
            <DinnerCard
              key={dinner.id}
              dinner={dinner}
              isMutating={setDinnerActive.isPending && setDinnerActive.variables?.id === dinner.id}
              onSuppress={(id) => setDinnerActive.mutate({ id, isActive: false })}
              lastChosenText={formatLastChosen(lastChosenDates.data?.get(dinner.id) ?? null)}
              selection={{
                isSelected: selectedDinnerIds.has(dinner.id),
                // Also disabled (not just this card's own spinner) while any pick is in
                // flight — clicking a second dinner before the first mutation settles
                // would decide its add/remove/create-plan action from the same stale
                // currentPlan snapshot, risking two plans getting created at once.
                selectionDisabled:
                  (selectedDinnerIds.size >= 3 && !selectedDinnerIds.has(dinner.id)) ||
                  (toggleSelection.isPending && toggleSelection.variables?.dinnerId !== dinner.id),
                isTogglingSelection:
                  toggleSelection.isPending && toggleSelection.variables?.dinnerId === dinner.id,
                onToggleSelect: (id) =>
                  toggleSelection.mutate({ dinnerId: id, currentPlan: currentPlan.data ?? null }),
              }}
            />
          ))}
        </SimpleGrid>
      )}
    </>
  );
}
