import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
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
import { useDinnersPerWeek } from '@/features/settings/hooks';
import { CatalogFilters, type CatalogFilterState } from '@/features/dinners/components/CatalogFilters';
import { applyFilters } from '@/features/dinners/filters';
import { formatLastChosen } from '@/features/dinners/last-chosen';
import {
  useClearSelections,
  useCurrentPlan,
  useRestoreSelections,
  useToggleSelection,
  useLuckyPick,
} from '@/features/weekly-plan/hooks';
import { currentPlanningWeekStart, formatWeekRange } from '@/features/weekly-plan/date';
import { ClearPicksControl } from '@/features/weekly-plan/components/ClearPicksControl';
import { LuckyPickControl } from '@/features/weekly-plan/components/LuckyPickControl';
import { drawLucky } from '@/features/weekly-plan/lucky-draw';
import { useWeekStartDay } from '@/features/settings/hooks';
import { uiIcons } from '@/shared/components/icons';

const defaultFilters: CatalogFilterState = {
  cuisine: [],
  tags: [],
  sortByCookTime: false,
};

export function CatalogPage() {
  const [filters, setFilters] = useState<CatalogFilterState>(defaultFilters);

  const activeDinners = useDinners();
  const setDinnerActive = useSetDinnerActive();
  const currentPlan = useCurrentPlan();
  // Intent 015: the week fills at the household's number, not at three. This drives the badge,
  // the at-capacity notice, and whether unpicked cards are disabled.
  const dinnersPerWeek = useDinnersPerWeek().data ?? 3;
  const toggleSelection = useToggleSelection();
  const clearSelections = useClearSelections();
  const restoreSelections = useRestoreSelections();
  const luckyPick = useLuckyPick();
  const lastChosenDates = useLastChosenDates();
  const allTags = useAllTags();
  const weekStart = useWeekStartDay();

  // Which week these picks are for. Matches the /plan offset-0 label (both resolve to the
  // planning-week start now that plans are week-aligned). Neutral placeholder while loading.
  const weekLabel =
    weekStart.data != null ? formatWeekRange(currentPlanningWeekStart(weekStart.data)) : 'This week';

  const isLocked = currentPlan.data?.locked_at != null;

  // The dinner ids removed by the last "Clear picks" — drives the undo bar. Lives only here:
  // leaving the catalog drops it and the clear becomes permanent (intent 009, OQ-1).
  const [clearedIds, setClearedIds] = useState<string[] | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);

  async function handleClear() {
    try {
      const ids = await clearSelections.mutateAsync(currentPlan.data ?? null);
      setClearedIds(ids.length > 0 ? ids : null);
      if (ids.length > 0) requestAnimationFrame(() => undoRef.current?.focus());
    } catch {
      // Surfaced by the `clearSelections.isError` alert below; `clearedIds` stays null.
    }
  }

  async function handleUndo() {
    const planId = currentPlan.data?.id;
    try {
      if (planId && clearedIds) {
        await restoreSelections.mutateAsync({ planId, dinnerIds: clearedIds });
      }
      setClearedIds(null);
    } catch {
      // Surfaced by the `restoreSelections.isError` alert; leave `clearedIds` so Undo can retry.
    }
  }

  const selectedDinnerIds = useMemo(() => {
    const plan = currentPlan.data;
    if (!plan || plan.locked_at !== null) return new Set<string>();
    return new Set(plan.weekly_plan_selections.map((s) => s.dinner_id));
  }, [currentPlan.data]);

  /**
   * Who the draw may choose from. Suppressed dinners are excluded because `useDinners()` only
   * returns active ones — suppression is a user decision (intent 001 FR-7) and randomness must not
   * overrule it. Already-picked are excluded so no dinner appears twice in a week.
   */
  const luckyCandidates = useMemo(
    () =>
      (activeDinners.data ?? [])
        .filter((dinner) => !selectedDinnerIds.has(dinner.id))
        .map((dinner) => ({
          id: dinner.id,
          lastChosenDate: lastChosenDates.data?.get(dinner.id) ?? null,
        })),
    [activeDinners.data, selectedDinnerIds, lastChosenDates.data],
  );

  const slotsToFill = Math.max(0, dinnersPerWeek - selectedDinnerIds.size);

  function handleLuckyPick() {
    // Math.random() lives HERE, at the edge, not inside drawLucky — which takes its source as an
    // argument so its randomness and its bias can both be asserted (intent 016, story 003).
    const drawn = drawLucky(luckyCandidates, slotsToFill, Math.random);
    if (drawn.length === 0) return;
    luckyPick.mutate({ currentPlan: currentPlan.data ?? null, dinnerIds: drawn });
  }

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
        <Box>
          <Text textStyle="eyebrow">{weekLabel}</Text>
          <Heading textStyle="pageTitle" as="h1">
            Dinner catalog
          </Heading>
        </Box>
        <HStack gap={2}>
          <Badge variant={selectedDinnerIds.size >= dinnersPerWeek ? 'countFull' : 'count'}>
            <HStack gap={1}>
              <uiIcons.checkAll size={13} strokeWidth={2} />
              <Text as="span">
                {selectedDinnerIds.size} of {dinnersPerWeek}
              </Text>
            </HStack>
          </Badge>
          <LuckyPickControl
            slotsToFill={slotsToFill}
            candidateCount={luckyCandidates.length}
            isLocked={isLocked}
            isPicking={luckyPick.isPending}
            onPick={handleLuckyPick}
          />
          <ClearPicksControl
            key={[...selectedDinnerIds].sort().join(',')}
            count={selectedDinnerIds.size}
            isClearing={clearSelections.isPending}
            onClear={() => void handleClear()}
          />
          {/*
            Reads as "add", not "import" — importing is one of two ways in, not the headline
            (intent 014, story 001). Icon-only on a phone: the header already carries the count
            badge and three controls, and a sixth label does not fit at that width.
          */}
          <IconButton
            as={RouterLink}
            to="/dinners/new"
            aria-label="Add a dinner"
            icon={<uiIcons.add size={18} strokeWidth={1.8} />}
            variant="ghost"
            size="sm"
            display={{ base: 'inline-flex', md: 'none' }}
          />
          <Button
            as={RouterLink}
            to="/dinners/new"
            leftIcon={<uiIcons.add size={14} strokeWidth={2} />}
            variant="outline"
            size="sm"
            display={{ base: 'none', md: 'inline-flex' }}
          >
            Add dinner
          </Button>
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

      {clearedIds != null && !isLocked && (
        <HStack
          justify="space-between"
          bg="paper.subtle"
          borderWidth="1px"
          borderColor="line.subtle"
          borderRadius="field"
          px={3}
          py={2}
          mb={4}
          aria-live="polite"
        >
          <HStack gap={2}>
            <uiIcons.info size={15} strokeWidth={1.8} />
            <Text>
              {clearedIds.length === 1 ? '1 dinner cleared.' : `${clearedIds.length} dinners cleared.`}
            </Text>
          </HStack>
          <Button
            ref={undoRef}
            variant="outline"
            size="sm"
            leftIcon={<uiIcons.restore size={13} strokeWidth={2.2} />}
            isLoading={restoreSelections.isPending}
            onClick={() => void handleUndo()}
          >
            Undo
          </Button>
        </HStack>
      )}

      {(clearSelections.isError || restoreSelections.isError) && (
        <Alert status="error" borderRadius="field" mb={4}>
          <AlertIcon />
          {clearSelections.isError
            ? 'Couldn’t clear your picks, try again.'
            : 'Couldn’t undo that, try again.'}
        </Alert>
      )}

      {luckyPick.isError && (
        <Alert status="error" borderRadius="field" mb={4}>
          <AlertIcon />
          Couldn&rsquo;t pick for you, try again.
        </Alert>
      )}

      {luckyPick.isSuccess && luckyPick.data.added < (luckyPick.variables?.dinnerIds.length ?? 0) && (
        <Alert status="info" borderRadius="field" mb={4}>
          <AlertIcon />
          Added {luckyPick.data.added} of {luckyPick.variables?.dinnerIds.length} — the rest didn&rsquo;t
          save.
        </Alert>
      )}

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

      {/* One list-level at-capacity notice instead of the same line repeated on every
          locked card. selectedDinnerIds is empty when the plan is missing or locked,
          so size >= dinnersPerWeek already covers "don't show" for those cases. */}
      {selectedDinnerIds.size >= dinnersPerWeek && (
        <Alert status="info" borderRadius="field" mb={4}>
          <AlertIcon />
          You’ve picked {dinnersPerWeek} for this week — remove one to swap in another.
        </Alert>
      )}

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
        <SimpleGrid columns={{ base: 1, sm: 2, xl: 3 }} gap={4}>
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
                  (selectedDinnerIds.size >= dinnersPerWeek && !selectedDinnerIds.has(dinner.id)) ||
                  (toggleSelection.isPending && toggleSelection.variables?.dinnerId !== dinner.id) ||
                  clearSelections.isPending,
                isTogglingSelection:
                  toggleSelection.isPending && toggleSelection.variables?.dinnerId === dinner.id,
                onToggleSelect: (id) => {
                  // Picking again ends the "you just cleared" moment — drop the undo bar.
                  setClearedIds(null);
                  toggleSelection.mutate({ dinnerId: id, currentPlan: currentPlan.data ?? null });
                },
              }}
            />
          ))}
        </SimpleGrid>
      )}
    </>
  );
}
