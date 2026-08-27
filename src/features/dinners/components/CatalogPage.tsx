import { useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Center,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Switch,
  Text,
} from '@chakra-ui/react';

import {
  useDinners,
  useLastChosenDates,
  useSetDinnerActive,
  useSuppressedDinners,
} from '@/features/dinners/hooks';
import { DinnerCard } from '@/features/dinners/components/DinnerCard';
import { CatalogFilters, type CatalogFilterState } from '@/features/dinners/components/CatalogFilters';
import { applyFilters } from '@/features/dinners/filters';
import { formatLastChosen } from '@/features/dinners/last-chosen';
import { useCurrentPlan, useToggleSelection } from '@/features/weekly-plan/hooks';

const defaultFilters: CatalogFilterState = {
  cuisine: null,
  rosieApprovedOnly: false,
  sortByCookTime: false,
};

export function CatalogPage() {
  const [filters, setFilters] = useState<CatalogFilterState>(defaultFilters);
  const [showSuppressed, setShowSuppressed] = useState(false);

  const activeDinners = useDinners();
  const suppressedDinners = useSuppressedDinners(showSuppressed);
  const setDinnerActive = useSetDinnerActive();
  const currentPlan = useCurrentPlan();
  const toggleSelection = useToggleSelection();
  const lastChosenDates = useLastChosenDates();

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
    const source = showSuppressed ? (suppressedDinners.data ?? []) : (activeDinners.data ?? []);
    return applyFilters(source, filters, lastChosenDates.data ?? new Map());
  }, [showSuppressed, suppressedDinners.data, activeDinners.data, filters, lastChosenDates.data]);

  const isLoading = showSuppressed ? suppressedDinners.isLoading : activeDinners.isLoading;
  const isError = showSuppressed ? suppressedDinners.isError : activeDinners.isError;

  return (
    <>
      <HStack justify="space-between" mb={4} flexWrap="wrap" gap={3}>
        <Heading size="lg">{showSuppressed ? 'Suppressed dinners' : 'Dinner catalog'}</Heading>
        <HStack>
          {!showSuppressed && <Text color="gray.600">{selectedDinnerIds.size}/3 selected</Text>}
          <Text fontSize="sm" id="show-suppressed-label">
            Show suppressed
          </Text>
          <Switch
            aria-labelledby="show-suppressed-label"
            isChecked={showSuppressed}
            onChange={(event) => setShowSuppressed(event.target.checked)}
          />
        </HStack>
      </HStack>

      {toggleSelection.isError && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          Couldn’t save that change, try again.
        </Alert>
      )}

      {setDinnerActive.isError && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          Couldn’t update that dinner, try again.
        </Alert>
      )}

      {!showSuppressed && <CatalogFilters cuisines={cuisines} filters={filters} onChange={setFilters} />}

      {isLoading && (
        <Center py={12}>
          <Spinner size="lg" />
        </Center>
      )}

      {isError && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          Couldn’t load dinners. Try refreshing the page.
        </Alert>
      )}

      {!isLoading && !isError && visibleDinners.length === 0 && (
        <Text color="gray.600">
          {showSuppressed ? 'No suppressed dinners.' : 'No dinners match these filters.'}
        </Text>
      )}

      {!isLoading && !isError && visibleDinners.length > 0 && (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
          {visibleDinners.map((dinner) => (
            <DinnerCard
              key={dinner.id}
              dinner={dinner}
              variant={showSuppressed ? 'suppressed' : 'active'}
              isMutating={setDinnerActive.isPending && setDinnerActive.variables?.id === dinner.id}
              onSuppress={(id) => setDinnerActive.mutate({ id, isActive: false })}
              onUnsuppress={(id) => setDinnerActive.mutate({ id, isActive: true })}
              lastChosenText={formatLastChosen(lastChosenDates.data?.get(dinner.id) ?? null)}
              selection={
                showSuppressed
                  ? undefined
                  : {
                      isSelected: selectedDinnerIds.has(dinner.id),
                      selectionDisabled: selectedDinnerIds.size >= 3 && !selectedDinnerIds.has(dinner.id),
                      isTogglingSelection:
                        toggleSelection.isPending && toggleSelection.variables?.dinnerId === dinner.id,
                      onToggleSelect: (id) =>
                        toggleSelection.mutate({ dinnerId: id, currentPlan: currentPlan.data ?? null }),
                    }
              }
            />
          ))}
        </SimpleGrid>
      )}
    </>
  );
}
