import { Alert, AlertIcon, Box, Center, Spinner, Stack, Text } from '@chakra-ui/react';

import { useDinnerFullDetails } from '@/features/dinners/hooks';
import { IngredientList } from '@/features/dinners/components/IngredientList';
import { StepList } from '@/features/dinners/components/StepList';

/**
 * A picked dinner's ingredients, then its steps, under an expanded This week row or card
 * (intent 026). The same lists and wording as the catalog card's Details, without tags. Mounted
 * only while expanded, so the details are fetched then, and shared with the catalog's cache.
 */
export function PickedDinnerDetails({ dinnerId }: { dinnerId: string }) {
  const details = useDinnerFullDetails(dinnerId, true);

  let content;
  if (details.isLoading) {
    content = (
      <Center py={3}>
        <Spinner size="sm" />
      </Center>
    );
  } else if (details.isError || !details.data) {
    content = (
      <Alert status="error" borderRadius="field" fontSize="sm">
        <AlertIcon />
        Couldn’t load details for this dinner.
      </Alert>
    );
  } else {
    content = (
      <>
        <Box>
          <Text textStyle="sectionLabel" mb={1.5}>
            Ingredients
          </Text>
          <IngredientList ingredients={details.data.dinner_ingredients} />
        </Box>

        <Box>
          <Text textStyle="sectionLabel" mb={1.5}>
            Steps
          </Text>
          <StepList steps={details.data.dinner_steps} />
        </Box>
      </>
    );
  }

  return (
    <Stack gap={3} pt={3} borderTopWidth="1px" borderColor="line.subtle">
      {content}
    </Stack>
  );
}
