import { HStack, ListItem, Text, UnorderedList } from '@chakra-ui/react';

import type { DinnerIngredient } from '@/features/dinners/types';
import { categoryIcon } from '@/shared/components/icons';

/**
 * A dinner's ingredients, one per line: category icon, then `quantity unit name` (intent 026).
 * Shared by the catalog card's Details, This week and the Cook tab, so the three can't drift.
 * Callers supply their own "Ingredients" label.
 */
export function IngredientList({ ingredients }: { ingredients: DinnerIngredient[] }) {
  if (ingredients.length === 0) {
    return <Text textStyle="faint">No ingredients recorded.</Text>;
  }

  return (
    <UnorderedList styleType="none" ms={0} spacing={1}>
      {ingredients.map((ingredient) => {
        const CategoryIcon = categoryIcon(ingredient.category);
        return (
          <ListItem key={ingredient.id}>
            <HStack gap={2} fontSize="0.8125rem" color="ink.700">
              <CategoryIcon size={14} strokeWidth={1.8} color="var(--chakra-colors-ink-400)" />
              <Text as="span">
                {ingredient.quantity} {ingredient.unit} {ingredient.name}
              </Text>
            </HStack>
          </ListItem>
        );
      })}
    </UnorderedList>
  );
}
