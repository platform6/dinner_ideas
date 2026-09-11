import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Link, Stack, Text, Textarea } from '@chakra-ui/react';

import { uiIcons } from '@/shared/components/icons';
import type { ImportMessage } from '@/features/recipe-entry/import/messages';

interface PasteImportPanelProps {
  isExtracting: boolean;
  /**
   * Why the last attempt failed, already in English (story 004). Only failures land here: a
   * success moves the user to the form tab, so a success notice on this panel would be talking to
   * nobody.
   */
  failure: ImportMessage | null;
  onExtract: (paste: string) => void;
}

/**
 * The paste box on the "Paste a recipe" tab (story 001).
 *
 * Bolt 059 shipped this tab inert on purpose, so that landing extraction adds behaviour rather
 * than restructuring the page. This fills it in.
 *
 * The pasted text is owned here and never cleared by a failure: every failure is retryable, and a
 * retry spends another metered call against the household's daily cap, so it is the user's call to
 * make rather than something that happens automatically.
 */
export function PasteImportPanel({ isExtracting, failure, onExtract }: PasteImportPanelProps) {
  const [paste, setPaste] = useState('');
  const isEmpty = paste.trim().length === 0;

  return (
    <Stack gap={4}>
      <Text>
        Paste a whole recipe page — the story around it is fine, it gets ignored. The recipe comes back as a
        filled-in form on the other tab for you to check before saving.
      </Text>

      <Textarea
        rows={10}
        aria-label="Pasted recipe page"
        placeholder="Paste the page here…"
        value={paste}
        onChange={(event) => setPaste(event.target.value)}
      />

      {failure && (
        <Alert layerStyle="notice" role="alert">
          <uiIcons.info size={16} strokeWidth={2} style={{ flexShrink: 0, marginRight: '8px' }} />
          <Text>
            {failure.text}
            {/*
              A link, not prose telling them where to go. `no_api_key` is the only case that has
              one, because it is the only case whose answer is "go and set something up" — and a
              household without a key is a normal starting state rather than a fault.
            */}
            {failure.link && (
              <>
                {' '}
                <Link as={RouterLink} to={failure.link.to} textDecoration="underline">
                  {failure.link.label}
                </Link>
              </>
            )}
          </Text>
        </Alert>
      )}

      <Box>
        {/*
          Disabled while empty so no request is made at all. An empty call would still spend a
          metered call against the daily cap — refusing here costs nothing and saves one.
        */}
        <Button
          onClick={() => onExtract(paste)}
          isDisabled={isEmpty}
          isLoading={isExtracting}
          loadingText="Reading the recipe"
        >
          Get the recipe
        </Button>
        {isEmpty && (
          <Text textStyle="faint" mt={2}>
            Paste a recipe page first.
          </Text>
        )}
      </Box>
    </Stack>
  );
}
