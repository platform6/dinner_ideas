import { useState } from 'react';
import { Box, Button, HStack, Input, Text } from '@chakra-ui/react';

/**
 * The inline "Add an aisle or section" affordance (story 002) — a dashed row at the end of the
 * list, not a modal and not a wizard. It appends at the end because that is where a remembered
 * stop usually belongs; the arrows move it from there.
 *
 * There is no type selector: `type` is derived from the name the user types (see
 * `location-name.ts`), so "Aisle 4" becomes an aisle and anything else a section.
 */
export function AddStopRow({ isAdding, onAdd }: { isAdding: boolean; onAdd: (name: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName('');
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <Box
        as="button"
        type="button"
        w="100%"
        h="44px"
        borderWidth="1px"
        borderStyle="dashed"
        borderColor="line.DEFAULT"
        borderRadius="card"
        color="brand.500"
        onClick={() => setIsOpen(true)}
      >
        <Text fontWeight={500}>Add an aisle or section</Text>
      </Box>
    );
  }

  return (
    <HStack
      gap={2}
      p={2}
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="line.DEFAULT"
      borderRadius="card"
    >
      <Input
        size="sm"
        flex="1"
        autoFocus
        placeholder="Aisle 4, or Bakery"
        aria-label="Name of the new stop"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
          if (event.key === 'Escape') setIsOpen(false);
        }}
      />
      <Button size="sm" onClick={submit} isLoading={isAdding} isDisabled={!name.trim()}>
        Add
      </Button>
      <Button size="sm" variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
    </HStack>
  );
}
