import { useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Link as ChakraLink,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';

import {
  useCurrentPlan,
  useLockPlan,
  useToggleSelection,
  useWeekByOffset,
} from '@/features/weekly-plan/hooks';
import { formatWeekRange } from '@/features/weekly-plan/date';
import { LockWeekControl } from '@/features/weekly-plan/components/LockWeekControl';
import { PickedDinnerDetails } from '@/features/weekly-plan/components/PickedDinnerDetails';
import { useDinnersPerWeek } from '@/features/settings/hooks';
import { uiIcons } from '@/shared/components/icons';
import { SHOW_PHOTO_SLOTS } from '@/shared/components/photo-slots';

/**
 * Copy that states the household's dinner count (intent 019, FR-1). Both render only once the
 * week holds all `dinnersPerWeek` picks, so the count here is always the number on the page.
 */
function lockHelpText(dinnersPerWeek: number): string {
  const locks =
    dinnersPerWeek === 1
      ? 'Locks this dinner and adds it to your history.'
      : `Locks these ${dinnersPerWeek} dinners and adds them to your history.`;
  return `${locks} You can still shop your list either way.`;
}

function allPickedText(dinnersPerWeek: number): string {
  const picked = dinnersPerWeek === 1 ? 'Your dinner is picked.' : `All ${dinnersPerWeek} dinners picked.`;
  return `${picked} Your shopping list is ready.`;
}

export function PlanPage() {
  const [offset, setOffset] = useState(0);
  // Intent 026: phone rows open one at a time (several may be open); the desktop cards open and
  // close together. Both reset when the week changes.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const week = useWeekByOffset(offset);
  const toggleSelection = useToggleSelection();
  const lockPlan = useLockPlan();
  // Only needed for the current week's pick/remove actions, which read the live plan snapshot
  // fresh each toggle (see `toggle-selection.ts`) rather than the possibly-stale `week.data`.
  const currentPlan = useCurrentPlan();
  // Intent 015: "full" is the household's number, not three.
  const dinnersPerWeek = useDinnersPerWeek().data ?? 3;
  const headingRef = useRef<HTMLHeadingElement>(null);

  const isCurrentWeek = offset === 0;
  const plan = week.data;
  const isLocked = plan?.locked_at != null;
  const selections = plan?.weekly_plan_selections ?? [];

  function changeWeek(delta: number) {
    setOffset((o) => o + delta);
    setExpandedIds(new Set());
    setAllExpanded(false);
  }

  function toggleRow(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleLock() {
    if (!plan) return;
    try {
      await lockPlan.mutateAsync(plan.id);
      headingRef.current?.focus();
    } catch {
      // Surfaced by the `lockPlan.isError` alert below; the control returns to idle.
    }
  }
  // md+ lays the picks side by side as vertical cards; phone keeps horizontal rows.
  const threeAcross = useBreakpointValue({ base: false, md: true }, { ssr: false }) ?? false;
  const isFull = isCurrentWeek && !isLocked && selections.length === dinnersPerWeek;

  if (week.isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (week.isError) {
    return (
      <Alert status="error" borderRadius="field">
        <AlertIcon />
        Couldn’t load this week’s plan. Try refreshing the page.
      </Alert>
    );
  }

  return (
    <Stack gap={4}>
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Text textStyle="eyebrow">{formatWeekRange(week.weekStartDate)}</Text>
          <Heading textStyle="pageTitle" as="h1" ref={headingRef} tabIndex={-1}>
            This week’s plan
          </Heading>
        </Box>
        <HStack gap={2}>
          <IconButton
            aria-label="Previous week"
            icon={<uiIcons.back size={16} strokeWidth={2} />}
            variant="ghost"
            size="sm"
            onClick={() => changeWeek(-1)}
          />
          <IconButton
            aria-label="Next week"
            icon={<uiIcons.nextWeek size={16} strokeWidth={2} />}
            variant="ghost"
            size="sm"
            isDisabled={isCurrentWeek}
            onClick={() => changeWeek(1)}
          />
          {!isCurrentWeek && isLocked && (
            <Badge variant="count">
              <HStack gap={1}>
                <uiIcons.eaten size={13} strokeWidth={2} />
                <Text as="span">Eaten</Text>
              </HStack>
            </Badge>
          )}
        </HStack>
      </HStack>

      {isCurrentWeek && !isLocked && selections.length >= 1 && selections.length < dinnersPerWeek && (
        <Text textStyle="faint">
          Pick {dinnersPerWeek} {dinnersPerWeek === 1 ? 'dinner' : 'dinners'} to lock in your week.
        </Text>
      )}

      {isCurrentWeek && !isLocked && selections.length === dinnersPerWeek && (
        <Stack gap={1}>
          <LockWeekControl
            key={selections.map((s) => s.dinner_id).join(',')}
            selectionCount={selections.length}
            dinnersPerWeek={dinnersPerWeek}
            isLocking={lockPlan.isPending}
            onLock={() => void handleLock()}
          />
          <Text textStyle="faint">{lockHelpText(dinnersPerWeek)}</Text>
        </Stack>
      )}

      {isCurrentWeek && lockPlan.isError && (
        <Alert status="error" borderRadius="field">
          <AlertIcon />
          Couldn’t lock this week, try again.
        </Alert>
      )}

      {isCurrentWeek && toggleSelection.isError && (
        <Alert status="error" borderRadius="field">
          <AlertIcon />
          Couldn’t save that change, try again.
        </Alert>
      )}

      {!plan && (
        <Box layerStyle="cardDashed" textAlign="center">
          <uiIcons.allDone size={20} strokeWidth={1.8} color="var(--chakra-colors-ink-300)" />
          <Text textStyle="faint" mt={2}>
            {isCurrentWeek ? (
              <>
                No plan yet.{' '}
                <ChakraLink as={RouterLink} to="/">
                  Pick dinners from the catalog
                </ChakraLink>{' '}
                to start this week’s plan.
              </>
            ) : (
              'No plan this week.'
            )}
          </Text>
        </Box>
      )}

      {plan && selections.length === 0 && isCurrentWeek && (
        <Box layerStyle="cardDashed" textAlign="center">
          <Text textStyle="faint">
            No dinners picked yet.{' '}
            <ChakraLink as={RouterLink} to="/">
              Browse the catalog
            </ChakraLink>{' '}
            to add some.
          </Text>
        </Box>
      )}

      {isCurrentWeek && isLocked && selections.length > 0 && (
        <Box>
          <Text textStyle="eyebrow">{formatWeekRange(week.weekStartDate)}</Text>
          <Text textStyle="faint">
            This week’s plan is locked in — saved to your history. Pick a dinner from the catalog to start
            next week’s plan.
          </Text>
        </Box>
      )}

      {selections.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 2, md: 3 }}>
          {selections.map((selection, index) => {
            const removeButton = isCurrentWeek && !isLocked && (
              <IconButton
                w="36px"
                h="36px"
                minW="36px"
                variant="outline"
                color="heart.500"
                aria-label={`Remove ${selection.dinners.name}`}
                icon={<uiIcons.remove size={15} strokeWidth={2} />}
                isLoading={
                  toggleSelection.isPending && toggleSelection.variables?.dinnerId === selection.dinner_id
                }
                onClick={(e) => {
                  // The bar around it toggles the dinner; removing shouldn't.
                  e.stopPropagation();
                  toggleSelection.mutate({
                    dinnerId: selection.dinner_id,
                    currentPlan: currentPlan.data ?? null,
                  });
                }}
              />
            );
            const badge = (
              <Center
                w={threeAcross ? '28px' : '34px'}
                h={threeAcross ? '28px' : '34px'}
                borderRadius="full"
                bg="brand.500"
                color="paper.base"
                fontWeight={600}
                fontSize="0.8125rem"
                flexShrink={0}
              >
                {index + 1}
              </Center>
            );
            const name = (
              <Text textStyle="cardTitle" fontSize="0.9375rem">
                {selection.dinners.name}
              </Text>
            );
            const meta = (
              <Text textStyle="meta">
                {selection.dinners.cuisine_type} · {selection.dinners.cook_time_minutes} min
              </Text>
            );
            const isExpanded = threeAcross ? allExpanded : expandedIds.has(selection.id);
            const toggle = () => (threeAcross ? setAllExpanded((open) => !open) : toggleRow(selection.id));
            // The bar toggles on click too, as a mouse and touch convenience. This button stays
            // the keyboard and screen-reader control, so the bar takes no role or tab stop.
            const barProps = { cursor: 'pointer', onClick: toggle };
            const cardHoverProps = {
              transition: 'border-color 0.12s ease',
              _hover: isExpanded ? undefined : { borderColor: 'line.brand' },
            };
            // A sibling of the remove button, never a wrapper, so neither triggers the other.
            const expandButton = (
              <IconButton
                w="36px"
                h="36px"
                minW="36px"
                variant="ghost"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${selection.dinners.name}`}
                icon={
                  isExpanded ? (
                    <uiIcons.collapse size={18} strokeWidth={2} />
                  ) : (
                    <uiIcons.expand size={18} strokeWidth={2} />
                  )
                }
                onClick={(e) => {
                  // Stop here, or the bar toggles it straight back.
                  e.stopPropagation();
                  toggle();
                }}
              />
            );
            const details = isExpanded && <PickedDinnerDetails dinnerId={selection.dinner_id} />;

            if (threeAcross) {
              return (
                <Stack key={selection.id} layerStyle="cardSelected" p={3.5} gap={2.5} {...cardHoverProps}>
                  <Stack gap={2.5} {...barProps}>
                    <HStack justify="space-between" align="flex-start">
                      {badge}
                      <HStack gap={1}>
                        {expandButton}
                        {removeButton}
                      </HStack>
                    </HStack>
                    {SHOW_PHOTO_SLOTS && (
                      <Box data-testid="photo-slot" h="76px" bg="paper.sunken" borderRadius="control" />
                    )}
                    <Box>
                      {name}
                      {meta}
                    </Box>
                  </Stack>
                  {details}
                </Stack>
              );
            }

            return (
              <Box key={selection.id} layerStyle="cardSelected" {...cardHoverProps}>
                <HStack justify="space-between" gap={2} {...barProps}>
                  <HStack gap={3} minW={0}>
                    {badge}
                    <Box minW={0}>
                      {name}
                      {meta}
                    </Box>
                  </HStack>
                  <HStack gap={1} flexShrink={0}>
                    {expandButton}
                    {removeButton}
                  </HStack>
                </HStack>
                {details && <Box mt={3}>{details}</Box>}
              </Box>
            );
          })}
        </SimpleGrid>
      )}

      {isFull && (
        <Box layerStyle="cardDashed" textAlign="center">
          <uiIcons.allDone size={20} strokeWidth={1.8} color="var(--chakra-colors-brand-500)" />
          <Text textStyle="faint" mt={2} mb={3}>
            {allPickedText(dinnersPerWeek)}
          </Text>
          <Button
            as={RouterLink}
            to="/shopping-list"
            leftIcon={<uiIcons.shoppingList size={16} strokeWidth={1.8} />}
          >
            See shopping list
          </Button>
        </Box>
      )}
    </Stack>
  );
}
