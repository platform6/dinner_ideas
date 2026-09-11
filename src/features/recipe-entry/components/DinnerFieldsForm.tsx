import {
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  SimpleGrid,
  Stack,
  Textarea,
} from '@chakra-ui/react';

import { problemFor, type DraftProblem, type RecipeDraft } from '@/features/recipe-entry/draft';

interface DinnerFieldsFormProps {
  draft: RecipeDraft;
  /** Cuisines already in the catalog, offered as suggestions. Free text stays allowed. */
  cuisineSuggestions: readonly string[];
  problems: readonly DraftProblem[];
  /** Problems are hidden until a save has been attempted — nothing is red before you have typed. */
  showProblems: boolean;
  onChange: (patch: Partial<RecipeDraft>) => void;
}

/**
 * The dinner-level fields (story 002): name, cuisine, cook time, and the one-line summary.
 * Nothing else lives at this level — ingredients, steps and tags each have their own editor.
 */
export function DinnerFieldsForm({
  draft,
  cuisineSuggestions,
  problems,
  showProblems,
  onChange,
}: DinnerFieldsFormProps) {
  const problem = (field: string) => (showProblems ? problemFor(problems, field) : undefined);

  return (
    <Stack gap={4}>
      <FormControl isRequired isInvalid={Boolean(problem('name'))}>
        <FormLabel>Name</FormLabel>
        <Input
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Sheet Pan Chicken Fajitas"
        />
        <FormErrorMessage>{problem('name')}</FormErrorMessage>
      </FormControl>

      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
        <FormControl isRequired isInvalid={Boolean(problem('cuisineType'))}>
          <FormLabel>Kind of food</FormLabel>
          {/*
            A datalist, not a select: `dinners.cuisine_type` is deliberately free text so a new
            cuisine never needs a migration. Suggestions converge the vocabulary; they do not
            constrain it.
          */}
          <Input
            list="cuisine-suggestions"
            value={draft.cuisineType}
            onChange={(event) => onChange({ cuisineType: event.target.value })}
            placeholder="Mexican"
          />
          <datalist id="cuisine-suggestions">
            {cuisineSuggestions.map((cuisine) => (
              <option key={cuisine} value={cuisine} />
            ))}
          </datalist>
          <FormErrorMessage>{problem('cuisineType')}</FormErrorMessage>
        </FormControl>

        <FormControl isRequired isInvalid={Boolean(problem('cookTimeMinutes'))}>
          <FormLabel>Cook time</FormLabel>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={draft.cookTimeMinutes}
            onChange={(event) => onChange({ cookTimeMinutes: event.target.value })}
            placeholder="30"
          />
          <FormHelperText>Minutes.</FormHelperText>
          <FormErrorMessage>{problem('cookTimeMinutes')}</FormErrorMessage>
        </FormControl>
      </SimpleGrid>

      <FormControl isRequired isInvalid={Boolean(problem('summary'))}>
        <FormLabel>One-line summary</FormLabel>
        <Textarea
          rows={2}
          value={draft.summary}
          onChange={(event) => onChange({ summary: event.target.value })}
          placeholder="Chicken, peppers and onions roasted together on one pan."
        />
        {/*
          Deliberately does NOT say "shown on the catalog card". `dinners.instructions` is required
          by the schema but is currently rendered nowhere in the app, and telling the user
          otherwise would be teaching them something false. What it must convey is the distinction
          that matters: this is not the method.
        */}
        <FormHelperText>A short description of the dinner — not the cooking steps.</FormHelperText>
        <FormErrorMessage>{problem('summary')}</FormErrorMessage>
      </FormControl>
    </Stack>
  );
}
