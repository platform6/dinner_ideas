import { Checkbox, HStack, Select } from '@chakra-ui/react';

export interface CatalogFilterState {
  cuisine: string | null;
  rosieApprovedOnly: boolean;
  sortByCookTime: boolean;
}

interface CatalogFiltersProps {
  cuisines: string[];
  filters: CatalogFilterState;
  onChange: (filters: CatalogFilterState) => void;
}

export function CatalogFilters({ cuisines, filters, onChange }: CatalogFiltersProps) {
  return (
    <HStack gap={4} mb={4} flexWrap="wrap">
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
        isChecked={filters.rosieApprovedOnly}
        onChange={(event) => onChange({ ...filters, rosieApprovedOnly: event.target.checked })}
      >
        Rosie-approved only
      </Checkbox>

      <Checkbox
        isChecked={filters.sortByCookTime}
        onChange={(event) => onChange({ ...filters, sortByCookTime: event.target.checked })}
      >
        Sort by cook time
      </Checkbox>
    </HStack>
  );
}
