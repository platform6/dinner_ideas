import { Checkbox, CheckboxGroup, HStack, Select, Stack, Text, Wrap } from '@chakra-ui/react';

export interface CatalogFilterState {
  cuisine: string | null;
  /** OR semantics: a dinner matches if it has any of these tags (see `filters.ts`). */
  tags: string[];
  sortByCookTime: boolean;
}

interface CatalogFiltersProps {
  cuisines: string[];
  /** Full tag vocabulary (from `useAllTags`), for the tag filter — not just tags on visible dinners. */
  availableTags: string[];
  filters: CatalogFilterState;
  onChange: (filters: CatalogFilterState) => void;
}

export function CatalogFilters({ cuisines, availableTags, filters, onChange }: CatalogFiltersProps) {
  return (
    <Stack gap={3} mb={4}>
      <HStack gap={4} flexWrap="wrap">
        <Select
          maxW="14rem"
          placeholder="All cuisines"
          value={filters.cuisine ?? ''}
          onChange={(event) =>
            onChange({ ...filters, cuisine: event.target.value === '' ? null : event.target.value })
          }
        >
          {cuisines.map((cuisine) => (
            <option key={cuisine} value={cuisine}>
              {cuisine}
            </option>
          ))}
        </Select>

        <Checkbox
          isChecked={filters.sortByCookTime}
          onChange={(event) => onChange({ ...filters, sortByCookTime: event.target.checked })}
        >
          Sort by cook time
        </Checkbox>
      </HStack>

      {availableTags.length > 0 && (
        <HStack align="start" gap={3}>
          <Text fontSize="sm" color="gray.600" pt={1} flexShrink={0}>
            Tags:
          </Text>
          <CheckboxGroup
            value={filters.tags}
            onChange={(tags) => onChange({ ...filters, tags: tags as string[] })}
          >
            <Wrap>
              {availableTags.map((tag) => (
                <Checkbox key={tag} value={tag}>
                  {tag}
                </Checkbox>
              ))}
            </Wrap>
          </CheckboxGroup>
        </HStack>
      )}
    </Stack>
  );
}
