import { useState } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Input,
  Select,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';

import {
  useAddRow,
  useAssignCategory,
  useAssignments,
  useDeleteRow,
  useDistinctCategories,
  useReorderRow,
  useRows,
} from '@/features/store-config/hooks';

/**
 * Lets the wife define her store's row order and assign ingredient categories to rows (FR-12),
 * so the shopping list reads in the order she actually walks the store. Up/Down buttons, not
 * drag-and-drop — matches this app's existing low-fuss interaction style (per `ux-guide.md`).
 */
export function StoreConfigPage() {
  const rows = useRows();
  const assignments = useAssignments();
  const categories = useDistinctCategories();
  const addRow = useAddRow();
  const reorderRow = useReorderRow();
  const deleteRow = useDeleteRow();
  const assignCategory = useAssignCategory();

  const [newRowName, setNewRowName] = useState('');

  if (rows.isLoading || assignments.isLoading || categories.isLoading) {
    return (
      <Center py={12}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (rows.isError || assignments.isError || categories.isError) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        Couldn’t load your store configuration. Try refreshing the page.
      </Alert>
    );
  }

  const rowList = rows.data ?? [];
  const assignmentByCategory = new Map((assignments.data ?? []).map((a) => [a.category, a.row_id]));

  function handleAddRow() {
    const name = newRowName.trim();
    if (!name) return;
    addRow.mutate({ name, currentRowCount: rowList.length });
    setNewRowName('');
  }

  return (
    <Stack gap={6}>
      <Heading size="lg">Grocery Store Setup</Heading>

      <Box>
        <Heading size="md" mb={3}>
          Rows
        </Heading>
        <Text fontSize="sm" color="gray.600" mb={3}>
          List your store's sections in the order you walk them — first row is where you start shopping.
        </Text>

        {rowList.length === 0 ? (
          <Text color="gray.600" mb={3}>
            No rows configured yet — the shopping list will use alphabetical order until you add some.
          </Text>
        ) : (
          <Stack gap={2} mb={3}>
            {rowList.map((row, index) => (
              <HStack key={row.id} justify="space-between" borderWidth="1px" borderRadius="md" p={3}>
                <Text>{row.name}</Text>
                <HStack>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Move ${row.name} up`}
                    isDisabled={index === 0 || reorderRow.isPending}
                    onClick={() =>
                      reorderRow.mutate({ rowId: row.id, newPosition: rowList[index - 1].position })
                    }
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Move ${row.name} down`}
                    isDisabled={index === rowList.length - 1 || reorderRow.isPending}
                    onClick={() =>
                      reorderRow.mutate({ rowId: row.id, newPosition: rowList[index + 1].position })
                    }
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="red"
                    isLoading={deleteRow.isPending && deleteRow.variables === row.id}
                    onClick={() => deleteRow.mutate(row.id)}
                  >
                    Delete
                  </Button>
                </HStack>
              </HStack>
            ))}
          </Stack>
        )}

        <HStack>
          <Input
            size="sm"
            maxW="14rem"
            placeholder="New row name"
            aria-label="New row name"
            value={newRowName}
            onChange={(event) => setNewRowName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleAddRow();
            }}
          />
          <Button
            size="sm"
            onClick={handleAddRow}
            isLoading={addRow.isPending}
            isDisabled={!newRowName.trim()}
          >
            Add row
          </Button>
        </HStack>
      </Box>

      <Box>
        <Heading size="md" mb={3}>
          Category Assignments
        </Heading>
        <Text fontSize="sm" color="gray.600" mb={3}>
          Assign each ingredient category to a row. Unassigned categories appear after your rows,
          alphabetically.
        </Text>

        {(categories.data ?? []).length === 0 ? (
          <Text color="gray.600">No ingredient categories found yet.</Text>
        ) : (
          <Stack gap={2}>
            {(categories.data ?? []).map((category) => (
              <HStack key={category} justify="space-between">
                <Text>{category}</Text>
                <Select
                  size="sm"
                  maxW="12rem"
                  aria-label={`Row for ${category}`}
                  placeholder="Unassigned"
                  value={assignmentByCategory.get(category) ?? ''}
                  isDisabled={rowList.length === 0}
                  onChange={(event) => {
                    const rowId = event.target.value;
                    if (rowId) assignCategory.mutate({ category, rowId });
                  }}
                >
                  {rowList.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </Select>
              </HStack>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
