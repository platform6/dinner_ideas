import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Divider,
  HStack,
  Heading,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react';

import { CookingStepsEditor } from '@/features/recipe-entry/components/CookingStepsEditor';
import { DinnerFieldsForm } from '@/features/recipe-entry/components/DinnerFieldsForm';
import { IngredientLinesEditor } from '@/features/recipe-entry/components/IngredientLinesEditor';
import { TagEditor } from '@/features/recipe-entry/components/TagEditor';
import { PasteImportPanel } from '@/features/recipe-entry/components/PasteImportPanel';
import { extractRecipe } from '@/features/recipe-entry/import/extract';
import {
  createEmptyDraft,
  createIngredientLine,
  createStep,
  toggleTagName,
  validateDraft,
  type DraftIngredient,
  type DraftStep,
  type RecipeDraft,
} from '@/features/recipe-entry/draft';
import { useAllTags, useDinners } from '@/features/dinners/hooks';
import { useSaveDinner } from '@/features/recipe-entry/hooks';
import { mapSaveError, type SaveRejection } from '@/features/recipe-entry/api';
import { uiIcons } from '@/shared/components/icons';

/** A titled block, so the four editors read as one form rather than four widgets. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={3}>
      <Heading as="h2" textStyle="sectionLabel" fontSize="sm">
        {title}
      </Heading>
      {children}
    </Stack>
  );
}

/**
 * `/dinners/new` — the page that makes the catalog writable (intent 014, unit 001).
 *
 * Both ways in are visible from the first render: type it, or paste it. The paste tab is inert
 * until unit 002 lands, and it is here now so that landing it adds behaviour rather than
 * restructuring the page.
 *
 * Saving goes through `fn_create_dinner` — one RPC, one transaction, four tables (ADR-13). The
 * draft survives a rejection, so a duplicate name costs one edit rather than a re-entry.
 */
export function RecipeEntryPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<RecipeDraft>(createEmptyDraft);
  // Nothing is red before a save is attempted. Validating on every keystroke would mark a form
  // invalid while the user is still filling in its first field.
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [rejection, setRejection] = useState<SaveRejection | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [importNotice, setImportNotice] = useState<{ tone: 'info' | 'error'; message: string } | null>(null);

  const dinners = useDinners();
  const tags = useAllTags();
  const saveDinner = useSaveDinner();

  // The same derivation the catalog already uses for its cuisine filter — read from the data, so
  // the list stays true as dinners are added, rather than hardcoded.
  const cuisineSuggestions = useMemo(() => {
    if (!dinners.data) return [];
    return [...new Set(dinners.data.map((dinner) => dinner.cuisine_type))].sort();
  }, [dinners.data]);

  const existingTagNames = useMemo(() => (tags.data ?? []).map((tag) => tag.name), [tags.data]);

  const problems = useMemo(() => validateDraft(draft), [draft]);

  function patchDraft(patch: Partial<RecipeDraft>) {
    // Any edit clears the last rejection: a message about a name that has since been changed is
    // worse than no message.
    setRejection(null);
    setDraft((current) => ({ ...current, ...patch }));
  }

  /**
   * Runs an extraction (bolt 061). The draft does NOT land in the form yet — that is story 005,
   * bolt 062 — and neither does per-reason error copy, which is story 004. The wording below is a
   * deliberate placeholder: honest about what happened, and clearly not the finished messages.
   */
  async function handleExtract(paste: string) {
    setIsExtracting(true);
    setImportNotice(null);
    try {
      const outcome = await extractRecipe(paste, existingTagNames);
      if (outcome.ok) {
        setImportNotice({
          tone: 'info',
          message: `Read “${outcome.draft.name}” — ${outcome.draft.steps.length} steps, ${outcome.draft.ingredients.length} ingredients.${outcome.trimmed ? ' The page was long, so the end was trimmed.' : ''}${outcome.servingsStated ? '' : ' The page gave no serving count, so quantities are as written — check them.'} Review in the form arrives in the next step of the build.`,
        });
      } else {
        setImportNotice({
          tone: 'error',
          message:
            'Couldn’t read a recipe from that page. Your text is still here — try again, or type it in.',
        });
      }
    } catch {
      // A ClaudeError (rate_limited, no_api_key, …) lands here. Mapping its code to English is
      // story 004, bolt 062.
      setImportNotice({
        tone: 'error',
        message: 'The AI service couldn’t be reached. Your text is still here.',
      });
    } finally {
      setIsExtracting(false);
    }
  }

  function handleSubmit() {
    setHasAttemptedSave(true);
    setRejection(null);
    if (problems.length > 0) return;

    saveDinner.mutate(draft, {
      // The draft is deliberately NOT cleared on failure — a duplicate name costs one edit, not a
      // re-entry of every ingredient and step (story 006).
      onError: (error) => setRejection(mapSaveError(error, draft.name)),
      onSuccess: () => navigate('/'),
    });
  }

  return (
    <Stack gap={6} pb={10}>
      <Box>
        <Button
          as={RouterLink}
          to="/"
          size="sm"
          variant="ghost"
          leftIcon={<uiIcons.back size={16} strokeWidth={2} />}
          mb={2}
          pl={0}
        >
          Catalog
        </Button>
        <Heading textStyle="pageTitle" as="h1">
          Add a dinner
        </Heading>
      </Box>

      <Tabs variant="enclosed" size="sm">
        <TabList>
          <Tab>Type it in</Tab>
          <Tab>Paste a recipe</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0} pt={5}>
            <Stack gap={6}>
              <DinnerFieldsForm
                draft={draft}
                cuisineSuggestions={cuisineSuggestions}
                problems={problems}
                showProblems={hasAttemptedSave}
                onChange={patchDraft}
              />

              <Divider />

              <Section title="Ingredients">
                <IngredientLinesEditor
                  lines={draft.ingredients}
                  problems={problems}
                  showProblems={hasAttemptedSave}
                  onChange={(ingredients: DraftIngredient[]) => patchDraft({ ingredients })}
                  onAddLine={() =>
                    patchDraft({ ingredients: [...draft.ingredients, createIngredientLine()] })
                  }
                />
              </Section>

              <Divider />

              <Section title="How to cook it">
                <CookingStepsEditor
                  steps={draft.steps}
                  problems={problems}
                  showProblems={hasAttemptedSave}
                  onChange={(steps: DraftStep[]) => patchDraft({ steps })}
                  onAddStep={() => patchDraft({ steps: [...draft.steps, createStep()] })}
                />
              </Section>

              <Divider />

              <Section title="Tags">
                <TagEditor
                  tagNames={draft.tagNames}
                  existingTagNames={existingTagNames}
                  onToggle={(rawName) => patchDraft({ tagNames: toggleTagName(draft.tagNames, rawName) })}
                />
              </Section>

              <Divider />

              {hasAttemptedSave && problems.length > 0 && (
                <Alert layerStyle="notice" role="alert">
                  <uiIcons.info size={16} strokeWidth={2} style={{ flexShrink: 0, marginRight: '8px' }} />
                  <Text>
                    {problems.length === 1
                      ? 'One thing still needs fixing — see above.'
                      : `${problems.length} things still need fixing — see above.`}
                  </Text>
                </Alert>
              )}

              {rejection && (
                <Alert layerStyle="notice" role="alert">
                  <uiIcons.info size={16} strokeWidth={2} style={{ flexShrink: 0, marginRight: '8px' }} />
                  <Text>{rejection.message}</Text>
                </Alert>
              )}

              <HStack>
                {/*
                  Disabled while in flight so a second press cannot make a second dinner. A
                  courtesy only: `unique (household_id, name)` is the actual guarantee, and a UI
                  guard alone would not survive two devices.
                */}
                <Button onClick={handleSubmit} isLoading={saveDinner.isPending} loadingText="Saving">
                  Save dinner
                </Button>
                <Button as={RouterLink} to="/" variant="ghost">
                  Cancel
                </Button>
              </HStack>
            </Stack>
          </TabPanel>

          <TabPanel px={0} pt={5}>
            <PasteImportPanel
              isExtracting={isExtracting}
              notice={importNotice}
              onExtract={(paste) => void handleExtract(paste)}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
