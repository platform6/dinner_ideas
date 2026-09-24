import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  HStack,
  IconButton,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';

import {
  moveStep,
  numberedSteps,
  problemFor,
  type DraftProblem,
  type DraftStep,
} from '@/features/recipe-entry/draft';
import { uiIcons } from '@/shared/components/icons';

interface CookingStepsEditorProps {
  steps: readonly DraftStep[];
  problems: readonly DraftProblem[];
  showProblems: boolean;
  onChange: (steps: DraftStep[]) => void;
  onAddStep: () => void;
}

/**
 * The cooking-step editor (story 004): an ordered list that can be added to, edited, removed from
 * and reordered.
 *
 * The displayed numbers come from `numberedSteps`, which derives them from array position. The
 * draft stores no `step_number` at all, so removing a middle step cannot leave a gap — there is no
 * second copy of the ordering to fall out of sync. `unique (dinner_id, step_number)` and
 * `check (step_number > 0)` are satisfied by construction rather than by remembering to renumber.
 */
export function CookingStepsEditor({
  steps,
  problems,
  showProblems,
  onChange,
  onAddStep,
}: CookingStepsEditorProps) {
  const problem = (field: string) => (showProblems ? problemFor(problems, field) : undefined);
  const numbered = numberedSteps(steps);

  return (
    <Stack gap={3}>
      <Text textStyle="faint">Four or five steps is the house norm — write as many as the dinner needs.</Text>

      {problem('steps') && (
        <Text color="red.500" fontSize="sm">
          {problem('steps')}
        </Text>
      )}

      <Stack gap={2}>
        {numbered.map((step, index) => {
          const stepProblem = problem(`steps.${step.id}`);

          return (
            // Phone: the controls sit below the textarea, so they can be 44px without squeezing it
            // (intent 024, FR-2). From md up the row is unchanged: controls to the right.
            <Stack
              key={step.id}
              direction={{ base: 'column', md: 'row' }}
              align={{ base: 'stretch', md: 'start' }}
              gap={2}
            >
              <HStack align="start" gap={2} flex="1">
                <Text textStyle="sectionLabel" minW="20px" pt={2} textAlign="right" aria-hidden="true">
                  {step.stepNumber}
                </Text>

                <FormControl isInvalid={Boolean(stepProblem)}>
                  <Textarea
                    rows={2}
                    size="sm"
                    aria-label={`Step ${step.stepNumber}`}
                    placeholder="Spread on a sheet pan and roast for 30 minutes, until cooked through."
                    value={step.instruction}
                    onChange={(event) =>
                      onChange(
                        steps.map((existing) =>
                          existing.id === step.id
                            ? { ...existing, instruction: event.target.value }
                            : existing,
                        ),
                      )
                    }
                  />
                  <FormErrorMessage fontSize="xs">{stepProblem}</FormErrorMessage>
                </FormControl>
              </HStack>

              {/*
                Remove is deliberately apart from the reorder pair (intent 024, FR-2): on a phone
                they are the two ends of this row, and at md+ it is last in the column. Position,
                not colour, so it reads the same to anyone.
              */}
              <Stack
                direction={{ base: 'row', md: 'column' }}
                gap={{ base: 2, md: 0.5 }}
                justify="space-between"
                align={{ base: 'center', md: 'start' }}
                pl={{ base: '28px', md: 0 }}
              >
                {/* The reorder pair: side by side on a phone, stacked at md+ as they always were. */}
                <Stack direction={{ base: 'row', md: 'column' }} gap={{ base: 2, md: 0.5 }}>
                  <IconButton
                    aria-label={`Move step ${step.stepNumber} up`}
                    icon={<uiIcons.collapse size={14} strokeWidth={2} />}
                    size="sm"
                    variant="ghost"
                    isDisabled={index === 0}
                    onClick={() => onChange(moveStep(steps, index, index - 1))}
                  />
                  <IconButton
                    aria-label={`Move step ${step.stepNumber} down`}
                    icon={<uiIcons.expand size={14} strokeWidth={2} />}
                    size="sm"
                    variant="ghost"
                    isDisabled={index === steps.length - 1}
                    onClick={() => onChange(moveStep(steps, index, index + 1))}
                  />
                </Stack>
                <IconButton
                  aria-label={`Remove step ${step.stepNumber}`}
                  icon={<uiIcons.remove size={14} strokeWidth={2} />}
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(steps.filter((existing) => existing.id !== step.id))}
                />
              </Stack>
            </Stack>
          );
        })}
      </Stack>

      <Box>
        <Button
          size="sm"
          variant="outline"
          leftIcon={<uiIcons.add size={14} strokeWidth={2} />}
          onClick={onAddStep}
        >
          Add a step
        </Button>
      </Box>
    </Stack>
  );
}
