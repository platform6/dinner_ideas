import { useState } from 'react';
import {
  Box,
  Button,
  HStack,
  Input,
  Stack,
  Tag,
  TagLabel,
  TagLeftIcon,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';

import { normalizeTagName } from '@/features/dinners/tags';
import { uiIcons } from '@/shared/components/icons';

interface TagEditorProps {
  /** Normalized names attached to the draft. Not ids — nothing exists in `tags` yet. */
  tagNames: readonly string[];
  /** The household's existing vocabulary, offered so it is reused rather than re-typed. */
  existingTagNames: readonly string[];
  onToggle: (rawName: string) => void;
}

/**
 * The tag editor (story 008). Attaches and creates only — it never renames or deletes from the
 * shared vocabulary.
 *
 * Nothing is written here. The draft carries tag NAMES and bolt 060 resolves them at save; a tag
 * row created as it is typed would outlive an abandoned draft in a household-wide vocabulary that
 * has no delete UI.
 *
 * `normalizeTagName` is reused rather than reimplemented, so "Quick" and "quick " both resolve to
 * the `quick` that already exists instead of creating a near-duplicate. Note that normalization is
 * lowercase-and-trim only — it does not hyphenate, so "Quick Meal" and `quick-meal` stay distinct.
 * That is why the existing vocabulary is shown first and prominently: picking beats retyping.
 */
export function TagEditor({ tagNames, existingTagNames, onToggle }: TagEditorProps) {
  const [typed, setTyped] = useState('');

  const normalizedTyped = normalizeTagName(typed);
  // Only a genuinely new name offers "create" — otherwise the button would duplicate a chip that
  // is already on screen.
  const canCreate = normalizedTyped.length > 0 && !existingTagNames.includes(normalizedTyped);

  function commitTyped() {
    if (!normalizedTyped) return;
    onToggle(normalizedTyped);
    setTyped('');
  }

  return (
    <Stack gap={3}>
      {existingTagNames.length === 0 ? (
        <Text textStyle="faint">No tags yet — the first one is yours to invent.</Text>
      ) : (
        <Wrap>
          {existingTagNames.map((name) => {
            const isAttached = tagNames.includes(name);
            return (
              <WrapItem key={name}>
                {/*
                  Selecting an attached tag detaches it. Attaching the same tag twice is made
                  impossible here rather than left to `unique (dinner_id, tag_id)` to reject.
                */}
                <Tag
                  as="button"
                  type="button"
                  size="md"
                  variant={isAttached ? 'solid' : 'outline'}
                  aria-pressed={isAttached}
                  onClick={() => onToggle(name)}
                >
                  {isAttached && <TagLeftIcon as={uiIcons.check} boxSize="12px" />}
                  <TagLabel>{name}</TagLabel>
                </Tag>
              </WrapItem>
            );
          })}
        </Wrap>
      )}

      {/* Names attached to this draft that are not yet in the household's vocabulary. */}
      {tagNames.some((name) => !existingTagNames.includes(name)) && (
        <Wrap>
          {tagNames
            .filter((name) => !existingTagNames.includes(name))
            .map((name) => (
              <WrapItem key={name}>
                <Tag
                  as="button"
                  type="button"
                  size="md"
                  variant="solid"
                  aria-pressed
                  onClick={() => onToggle(name)}
                >
                  <TagLeftIcon as={uiIcons.check} boxSize="12px" />
                  <TagLabel>{name}</TagLabel>
                </Tag>
              </WrapItem>
            ))}
        </Wrap>
      )}

      <HStack gap={2}>
        <Input
          size="sm"
          maxW="240px"
          aria-label="New tag"
          placeholder="weeknight"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitTyped();
            }
          }}
        />
        <Button size="sm" variant="outline" isDisabled={!canCreate} onClick={commitTyped}>
          Add tag
        </Button>
      </HStack>

      <Box>
        <Text textStyle="faint">
          Tags are optional. Without them, this dinner won’t show up in tag filters.
        </Text>
      </Box>
    </Stack>
  );
}
