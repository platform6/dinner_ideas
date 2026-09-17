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
import { scaleDraft } from '@/features/recipe-entry/scale';
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
import { useServingsPerDinner } from '@/features/settings/hooks';
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
  // Set when the draft came from an import: what the page said it serves or makes, verbatim, or null
  // if it said nothing. Since bolt 070 an import's quantities are ALWAYS the page's own, so this is
  // what they are for. Null here means "typed in by hand". Lives on the page, not the draft, because
  // the draft is what gets saved and a yield never is (ADR-14).
  const [importSource, setImportSource] = useState<{ sourceYield: string | null } | null>(null);
  // Set when the user chooses to scale an import (bolt 071). `before` is the page's own ingredients,
  // kept for undo; it becomes null the moment the user edits an ingredient, because from then on
  // restoring it would silently throw their edit away. Nothing sets this except the user's click
  // (FR-4) — never on arrival, never because the household size is known.
  const [scaling, setScaling] = useState<{
    from: number;
    to: number;
    before: DraftIngredient[] | null;
  } | null>(null);
  const [tabIndex, setTabIndex] = useState(0);

  const dinners = useDinners();
  const tags = useAllTags();
  // How many people the household cooks for (intent 018). The fallback mirrors the column's
  // default so the form is usable before the query lands; it is not a second source of truth.
  const servingsPerDinner = useServingsPerDinner().data ?? 3;
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
      setImportSource({ sourceYield: outcome.sourceYield });
      setScaling(null);
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

  /**
   * Scales the imported draft from the page's servings to the household's (bolt 071). Only ever
   * called by the user pressing the control. `scaleDraft` is non-destructive, so the current
   * ingredients ARE the undo snapshot.
   */
  function handleScale(fromServings: number) {
    setScaling({ from: fromServings, to: servingsPerDinner, before: draft.ingredients });
    setDraft((current) => scaleDraft(current, fromServings, servingsPerDinner));
  }

  function handleUndoScale() {
    const before = scaling?.before;
    if (!before) return;
    setDraft((current) => ({ ...current, ingredients: before }));
    setScaling(null);
  }

  /** After an ingredient edit the scaled numbers are the user's own; undo would discard that edit. */
  function endUndoAfterEdit() {
    setScaling((current) => (current ? { ...current, before: null } : current));
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
                  onChange={(ingredients: DraftIngredient[]) => {
                    patchDraft({ ingredients });
                    endUndoAfterEdit();
                  }}
                  onAddLine={() => {
                    patchDraft({ ingredients: [...draft.ingredients, createIngredientLine()] });
                    endUndoAfterEdit();
                  }}
                  servingsPerDinner={servingsPerDinner}
                  importSource={importSource}
                  scaled={
                    scaling ? { from: scaling.from, to: scaling.to, canUndo: scaling.before !== null } : null
                  }
                  onScale={handleScale}
                  onUndoScale={handleUndoScale}
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
