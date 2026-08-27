import { useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Center,
  HStack,
  Heading,
  Input,
  ListItem,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  OrderedList,
  Spinner,
  Stack,
  Text,
  Tooltip,
  UnorderedList,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';

import { useAddTag, useDinnerFullDetails, useRemoveTag } from '@/features/dinners/hooks';
import type { CatalogDinner } from '@/features/dinners/types';
import { uiIcons } from '@/shared/components/icons';

interface SelectionProps {
  isSelected: boolean;
  /** True when 3 dinners are already selected and this one isn't one of them. */
  selectionDisabled: boolean;
  isTogglingSelection: boolean;
  onToggleSelect: (id: string) => void;
}

interface DinnerCardProps {
  dinner: CatalogDinner;
  /** Suppress ("Not interested") lives in this card's overflow menu, per FR-5 — not a persistent
   * button. Suppressed dinners no longer render through this component at all; they get their
   * own row layout on `SuppressedPage`. */
  onSuppress: (id: string) => void;
  isMutating: boolean;
  selection: SelectionProps;
  /** "Last made 2 weeks ago" / "Never made" — see `last-chosen.ts#formatLastChosen`. */
  lastChosenText?: string;
}

/** Expandable "Details" section (FR-10): ordered steps, ingredients, and tag management (FR-9). */
function DinnerCardDetails({ dinnerId }: { dinnerId: string }) {
  const details = useDinnerFullDetails(dinnerId, true);
  const addTag = useAddTag();
  const removeTag = useRemoveTag();
  const [newTagName, setNewTagName] = useState('');

  function handleAddTag() {
    const name = newTagName.trim();
    if (!name) return;
    addTag.mutate({ dinnerId, tagName: name });
    setNewTagName('');
  }

  if (details.isLoading) {
    return (
      <Center py={3}>
        <Spinner size="sm" />
      </Center>
    );
  }

  if (details.isError || !details.data) {
    return (
      <Alert status="error" borderRadius="md" fontSize="sm">
        <AlertIcon />
        Couldn’t load details for this dinner.
      </Alert>
    );
  }

  const { dinner_steps, dinner_ingredients, tags } = details.data;

  return (
    <Stack gap={3} pt={2} borderTopWidth="1px" mt={2}>
      <Box>
        <Text fontWeight="medium" fontSize="sm" mb={1}>
          Ingredients
        </Text>
        {dinner_ingredients.length === 0 ? (
          <Text fontSize="sm" color="gray.600">
            No ingredients recorded.
          </Text>
        ) : (
          <UnorderedList fontSize="sm" spacing={0.5}>
            {dinner_ingredients.map((ingredient) => (
              <ListItem key={ingredient.id}>
                {ingredient.quantity} {ingredient.unit} {ingredient.name}
              </ListItem>
            ))}
          </UnorderedList>
        )}
      </Box>

      <Box>
        <Text fontWeight="medium" fontSize="sm" mb={1}>
          Steps
        </Text>
        {dinner_steps.length === 0 ? (
          <Text fontSize="sm" color="gray.600">
            No steps recorded.
          </Text>
        ) : (
          <OrderedList fontSize="sm" spacing={0.5}>
            {dinner_steps.map((step) => (
              <ListItem key={step.id}>{step.instruction}</ListItem>
            ))}
          </OrderedList>
        )}
      </Box>

      <Box>
        <Text fontWeight="medium" fontSize="sm" mb={1}>
          Tags
        </Text>
        <Wrap mb={2}>
          {tags.map((tag) => (
            <WrapItem key={tag.id}>
              <Badge display="flex" alignItems="center" gap={1}>
                {tag.name}
                <CloseButton
                  size="sm"
                  aria-label={`Remove tag ${tag.name}`}
                  isDisabled={removeTag.isPending}
                  onClick={() => removeTag.mutate({ dinnerId, tagId: tag.id })}
                />
              </Badge>
            </WrapItem>
          ))}
        </Wrap>
        <HStack>
          <Input
            size="sm"
            maxW="10rem"
            placeholder="Add a tag"
            aria-label="New tag name"
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleAddTag();
            }}
          />
          <Button
            size="sm"
            onClick={handleAddTag}
            isLoading={addTag.isPending}
            isDisabled={!newTagName.trim()}
          >
            +
          </Button>
        </HStack>
        {addTag.isError && (
          <Text fontSize="xs" color="red.500" mt={1}>
            Couldn’t add that tag, try again.
          </Text>
        )}
      </Box>
    </Stack>
  );
}

export function DinnerCard({ dinner, onSuppress, isMutating, selection, lastChosenText }: DinnerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <HStack justify="space-between" align="start" mb={2}>
        <Heading size="sm">{dinner.name}</Heading>
        {/* FR-5: "Not interested" lives here, not as a persistent button on the card face —
            a rare, destructive-feeling action shouldn't sit next to the primary pick action. */}
        <Menu placement="bottom-end">
          <MenuButton
            as={Button}
            variant="ghost"
            size="sm"
            aria-label={`More actions for ${dinner.name}`}
            isLoading={isMutating}
          >
            <uiIcons.overflowMenu size={17} strokeWidth={2} />
          </MenuButton>
          <MenuList>
            <MenuItem onClick={() => onSuppress(dinner.id)}>Not interested</MenuItem>
          </MenuList>
        </Menu>
      </HStack>
      <Text fontSize="sm" color="gray.600" mb={1}>
        {dinner.cuisine_type} · {dinner.cook_time_minutes} min
      </Text>
      {dinner.tags.length > 0 && (
        <Wrap mb={1}>
          {dinner.tags.map((tag) => (
            <WrapItem key={tag}>
              <Badge colorScheme="purple">{tag}</Badge>
            </WrapItem>
          ))}
        </Wrap>
      )}
      {lastChosenText && (
        <Text fontSize="xs" color="gray.500" mb={3}>
          {lastChosenText}
        </Text>
      )}
      <Stack gap={2} align="start">
        <Tooltip label="Already have 3 picked — remove one first" isDisabled={!selection.selectionDisabled}>
          <Checkbox
            isChecked={selection.isSelected}
            isDisabled={selection.selectionDisabled || selection.isTogglingSelection}
            onChange={() => selection.onToggleSelect(dinner.id)}
            aria-label={`Pick ${dinner.name} for this week`}
          >
            Pick for this week
          </Checkbox>
        </Tooltip>
        <Button size="sm" variant="ghost" onClick={() => setIsExpanded((prev) => !prev)}>
          Details {isExpanded ? '▴' : '▾'}
        </Button>
      </Stack>
      {isExpanded && <DinnerCardDetails dinnerId={dinner.id} />}
    </Box>
  );
}
