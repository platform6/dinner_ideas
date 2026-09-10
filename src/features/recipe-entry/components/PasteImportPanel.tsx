import { useState } from 'react';
import { Alert, Box, Button, Stack, Text, Textarea } from '@chakra-ui/react';

import { uiIcons } from '@/shared/components/icons';

interface PasteImportPanelProps {
  isExtracting: boolean;
  /** Shown after an attempt. Bolt 062 supplies the wording; this panel only renders it. */
  notice: { tone: 'info' | 'error'; message: string } | null;
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
export function PasteImportPanel({ isExtracting, notice, onExtract }: PasteImportPanelProps) {
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

      {notice && (
        <Alert layerStyle="notice" role={notice.tone === 'error' ? 'alert' : 'status'}>
          <uiIcons.info size={16} strokeWidth={2} style={{ flexShrink: 0, marginRight: '8px' }} />
          <Text>{notice.message}</Text>
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
