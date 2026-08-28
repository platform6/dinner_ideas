import {
  Button,
  Checkbox,
  CheckboxGroup,
  Menu,
  MenuButton,
  MenuList,
  useDisclosure,
  Wrap,
} from '@chakra-ui/react';

import { metaIcons, uiIcons } from '@/shared/components/icons';

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
        variant={filters.cuisine === null ? 'solid' : 'outline'}
        leftIcon={<uiIcons.allCuisines size={14} strokeWidth={2} />}
        onClick={() => onChange({ ...filters, cuisine: null })}
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

      {filters.cuisine !== null && (
        <Button size="sm" variant="solid" onClick={() => onChange({ ...filters, cuisine: null })}>
          {filters.cuisine} ✕
        </Button>
      )}

      {filters.tags.map((tag) => (
        <Button
          key={tag}
          size="sm"
          variant="solid"
          onClick={() => onChange({ ...filters, tags: filters.tags.filter((t) => t !== tag) })}
        >
          {tag} ✕
        </Button>
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
              value={filters.cuisine ? [filters.cuisine] : []}
              onChange={(values) =>
                onChange({ ...filters, cuisine: (values[values.length - 1] as string) ?? null })
              }
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
