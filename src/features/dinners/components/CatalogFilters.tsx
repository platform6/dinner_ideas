import {
  Button,
  Checkbox,
  CheckboxGroup,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  Text,
  useDisclosure,
  Wrap,
} from '@chakra-ui/react';

import { metaIcons, uiIcons } from '@/shared/components/icons';

export interface CatalogFilterState {
  /** OR semantics: a dinner matches if its cuisine is any of these (see `filters.ts`). */
  cuisine: string[];
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

/**
 * Active-filter chip: the label is plain text, only the trailing ✕ (Lucide `X`) is a target,
 * so a chip can be read without being a button (FR / review polish 10).
 */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <HStack
      as="span"
      gap={0.5}
      h="34px"
      pl={3}
      pr={1}
      bg="brand.500"
      color="paper.base"
      borderRadius="chip"
      fontSize="0.75rem"
      fontWeight={600}
    >
      <Text as="span">{label}</Text>
      <IconButton
        aria-label={`Remove ${label} filter`}
        icon={<uiIcons.remove size={12} strokeWidth={2.5} />}
        onClick={onRemove}
        variant="unstyled"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        minW="24px"
        h="24px"
        color="paper.base"
        borderRadius="chip"
        _hover={{ bg: 'whiteAlpha.300' }}
      />
    </HStack>
  );
}

/**
 * Filter row as chips (FR-4): "All" + "Quickest" are always inline; the full cuisine list and
 * the tag list each live behind their own dropdown — "Cuisine" (FR-14) and "Tags" (FR-13) —
 * so the two kinds of filtering read as distinct controls. The theme's `Button` baseStyle
 * already sets `borderRadius: 'chip'`, so a plain solid/outline Button is the chip itself.
 */
export function CatalogFilters({ cuisines, availableTags, filters, onChange }: CatalogFiltersProps) {
  const cuisineMenu = useDisclosure();
  const tagMenu = useDisclosure();

  return (
    <Wrap gap={2} mb={4} align="center">
      <Button
        size="sm"
        variant={filters.cuisine.length === 0 ? 'solid' : 'outline'}
        leftIcon={<uiIcons.allCuisines size={14} strokeWidth={2} />}
        onClick={() => onChange({ ...filters, cuisine: [] })}
      >
        All
      </Button>

      <Button
        size="sm"
        variant={filters.sortByCookTime ? 'solid' : 'outline'}
        leftIcon={<metaIcons.cookTime size={14} strokeWidth={2} />}
        onClick={() => onChange({ ...filters, sortByCookTime: !filters.sortByCookTime })}
      >
        Quickest
      </Button>

      {filters.cuisine.map((cuisine) => (
        <FilterChip
          key={cuisine}
          label={cuisine}
          onRemove={() => onChange({ ...filters, cuisine: filters.cuisine.filter((c) => c !== cuisine) })}
        />
      ))}

      {filters.tags.map((tag) => (
        <FilterChip
          key={tag}
          label={tag}
          onRemove={() => onChange({ ...filters, tags: filters.tags.filter((t) => t !== tag) })}
        />
      ))}

      {cuisines.length > 0 && (
        <Menu isOpen={cuisineMenu.isOpen} onOpen={cuisineMenu.onOpen} onClose={cuisineMenu.onClose}>
          <MenuButton
            as={Button}
            size="sm"
            variant="outline"
            leftIcon={<uiIcons.allCuisines size={14} strokeWidth={2} />}
            aria-label="Cuisine"
          >
            Cuisine
          </MenuButton>
          <MenuList p={3} minW="14rem">
            <CheckboxGroup
              value={filters.cuisine}
              onChange={(values) => onChange({ ...filters, cuisine: values as string[] })}
            >
              <Wrap direction="column">
                {cuisines.map((cuisine) => (
                  <Checkbox key={cuisine} value={cuisine}>
                    {cuisine}
                  </Checkbox>
                ))}
              </Wrap>
            </CheckboxGroup>
          </MenuList>
        </Menu>
      )}

      {availableTags.length > 0 && (
        <Menu isOpen={tagMenu.isOpen} onOpen={tagMenu.onOpen} onClose={tagMenu.onClose}>
          <MenuButton
            as={Button}
            size="sm"
            variant="outline"
            leftIcon={<uiIcons.tag size={14} strokeWidth={2} />}
            aria-label="Tags"
          >
            Tags
          </MenuButton>
          <MenuList p={3} minW="14rem">
            <CheckboxGroup
              value={filters.tags}
              onChange={(tags) => onChange({ ...filters, tags: tags as string[] })}
            >
              <Wrap direction="column">
                {availableTags.map((tag) => (
                  <Checkbox key={tag} value={tag}>
                    {tag}
                  </Checkbox>
                ))}
              </Wrap>
            </CheckboxGroup>
          </MenuList>
        </Menu>
      )}
    </Wrap>
  );
}
