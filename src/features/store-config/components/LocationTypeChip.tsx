import { Center } from '@chakra-ui/react';

import { parseAisleNumber } from '@/features/store-config/location-name';

/**
 * The single element carrying the settled decision that aisles and sections are PEERS in one
 * sequence: same box, same position, same row height, differing only in what sits inside it.
 * An aisle holds its number (read from the name — never a second editable field); a section
 * holds a small four-square glyph.
 *
 * Never give the row a different background, nesting, or grouping based on this — the chip
 * communicates kind and nothing else.
 */
export function LocationTypeChip({ name }: { name: string }) {
  const aisleNumber = parseAisleNumber(name);

  if (aisleNumber !== null) {
    return (
      <Center
        w="28px"
        h="26px"
        flexShrink={0}
        borderRadius="control"
        bg="brand.100"
        color="brand.500"
        fontWeight={600}
        fontSize="meta"
        aria-hidden
      >
        {aisleNumber}
      </Center>
    );
  }

  return (
    <Center
      w="28px"
      h="26px"
      flexShrink={0}
      borderRadius="control"
      bg="paper.sunken"
      borderWidth="1px"
      borderColor="line.DEFAULT"
      color="ink.400"
      aria-hidden
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" focusable="false">
        <rect x="0" y="0" width="5" height="5" rx="1" />
        <rect x="7" y="0" width="5" height="5" rx="1" />
        <rect x="0" y="7" width="5" height="5" rx="1" />
        <rect x="7" y="7" width="5" height="5" rx="1" />
      </svg>
    </Center>
  );
}
