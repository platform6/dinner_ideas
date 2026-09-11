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
  messageForExtractionFailure,
  messageForThrown,
  type ImportMessage,
} from '@/features/recipe-entry/import/messages';
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
  // Failure feedback belongs on the paste tab, where the user still is and their text still sits.
  const [importFailure, setImportFailure] = useState<ImportMessage | null>(null);
  // Success feedback belongs on the FORM tab, because that is where a successful import sends the
  // user — a notice left on the paste panel would be announcing itself to an empty room.
  const [importedSummary, setImportedSummary] = useState<string | null>(null);
  // True when the source stated no serving count, so quantities were taken as written. Lives here
  // rather than in the editor because it describes the DRAFT, and dies when the draft is replaced.
  const [quantitiesUnscaled, setQuantitiesUnscaled] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

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
   * Runs an extraction and lands the result (stories 004 and 005).
   *
   * On success the draft goes into the SAME form manual entry uses and the user is moved to it.
   * The form neither knows nor cares that its contents were extracted rather than typed, which is
   * what keeps unit 001 independent of unit 002.
   *
   * This function has no save to call. That is the structural guarantee behind FR-7: review cannot
   * be skipped because no path skips it.
   */
  async function handleExtract(paste: string) {
    setIsExtracting(true);
    setImportFailure(null);
    setImportedSummary(null);
    try {
      const outcome = await extractRecipe(paste, existingTagNames);
      if (!outcome.ok) {
        setImportFailure(messageForExtractionFailure(outcome.reason));
        return;
      }

      setDraft(outcome.draft);
      setQuantitiesUnscaled(!outcome.servingsStated);
      // A freshly imported draft is not the user's mistake, so nothing is painted red before they
      // have touched anything. And a rejection about a previous draft's name would now be a lie.
      setHasAttemptedSave(false);
      setRejection(null);
      setImportedSummary(
        `Read “${outcome.draft.name}” — ${outcome.draft.steps.length} steps, ${outcome.draft.ingredients.length} ingredients. Check it over before saving.` +
          (outcome.trimmed ? ' That page was long, so the end of it was trimmed.' : ''),
      );
      setTabIndex(0);
    } catch (error) {
      // A ClaudeError carries the code; anything else is a bug here rather than a service failure.
      // Either way the user gets something they can act on, and never a code string.
      setImportFailure(messageForThrown(error));
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

      {/* Controlled so a successful import can move the user to the form it just filled in. */}
      <Tabs variant="enclosed" size="sm" index={tabIndex} onChange={setTabIndex}>
        <TabList>
          <Tab>Type it in</Tab>
          <Tab>Paste a recipe</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0} pt={5}>
            <Stack gap={6}>
              {importedSummary && (
                <Alert layerStyle="notice" role="status">
                  <uiIcons.info size={16} strokeWidth={2} style={{ flexShrink: 0, marginRight: '8px' }} />
                  <Text>{importedSummary}</Text>
                </Alert>
              )}

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
                  quantitiesUnscaled={quantitiesUnscaled}
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
              failure={importFailure}
              onExtract={(paste) => void handleExtract(paste)}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
