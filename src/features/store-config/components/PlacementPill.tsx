import { forwardRef } from 'react';
import { Button, HStack, Text } from '@chakra-ui/react';

import { uiIcons } from '@/shared/components/icons';
import type { ResolvedItem } from '@/features/store-config/types';

/**
 * The three placement states as one pill shape, differing only in border and fill (FR-6).
 *
 * The difference must read as *who decided this* rather than *how good this is*: no red, no
 * amber, no icon implying a problem. `heart.*` appears nowhere in this set — "not placed" is a
 * normal resting state, not an error.
 *
 * Placement is never conveyed by border style alone; every variant carries text, per the
 * accessibility notes in `storeconfig.md`.
 *
 * The whole pill is the tap target that opens the assign flow, so an override is always one tap
 * from wherever the item is visible. It forwards its ref so the sheet can return focus here on
 * close (story 003).
 */
export const PlacementPill = forwardRef<HTMLButtonElement, { item: ResolvedItem; onOpen: () => void }>(
  function PlacementPill({ item, onOpen }, ref) {
    const label =
      item.state === 'placed'
        ? 'Placed here'
        : item.state === 'inherited'
          ? `via ${item.viaCategory ?? item.locationName ?? ''}`
          : 'Not placed';

    const variantProps =
      item.state === 'placed'
        ? { borderColor: 'line.brand', borderStyle: 'solid', bg: 'paper.base', color: 'brand.500' }
        : item.state === 'inherited'
          ? { borderColor: 'line.DEFAULT', borderStyle: 'dashed', bg: 'transparent', color: 'ink.500' }
          : { borderColor: 'transparent', borderStyle: 'solid', bg: 'paper.sunken', color: 'ink.400' };

    return (
      <Button
        ref={ref}
        onClick={onOpen}
        variant="unstyled"
        h="auto"
        minH="32px"
        px={2.5}
        py={1}
        borderWidth="1px"
        borderRadius="control"
        fontWeight={400}
        aria-label={`Where do you find ${item.itemName}? ${label}`}
        {...variantProps}
      >
        <HStack gap={1} justify="center">
          {item.state === 'placed' && <uiIcons.check size={12} strokeWidth={2.5} aria-hidden />}
          <Text textStyle="meta" color="inherit">
            {label}
          </Text>
        </HStack>
      </Button>
    );
  },
);
