import { callClaude } from '@/features/ai/api';
import {
  buildSystemPrompt,
  byteLength,
  pasteBudgetBytes,
  trimToBytes,
} from '@/features/recipe-entry/import/prompt';
import { parseExtraction, type ExtractionFailure } from '@/features/recipe-entry/import/parse';
import type { RecipeDraft } from '@/features/recipe-entry/draft';

/** Usage-log tag for this caller, alongside intent 007's `connection_test`. */
const FEATURE = 'recipe_import';

/** A recipe fits comfortably; the proxy's ceiling is 4096 and asking for more would be refused. */
const MAX_TOKENS = 4096;

export interface ExtractionSuccess {
  ok: true;
  draft: RecipeDraft;
  /**
   * False when the source stated no serving count, so quantities were taken as-is rather than
   * rescaled to 3. The user is told, so they correct rather than being silently given the wrong
   * amounts.
   */
  servingsStated: boolean;
  /** True when the paste was too large and its tail was dropped. Reported BEFORE the draft. */
  trimmed: boolean;
}

export interface ExtractionRejection {
  ok: false;
  reason: ExtractionFailure | 'empty';
  trimmed: boolean;
}

export type ExtractionOutcome = ExtractionSuccess | ExtractionRejection;

/**
 * Pasted page text in, a draft or a typed failure out (stories 001–003).
 *
 * Errors from the proxy itself are NOT caught here — a `ClaudeError` propagates so the caller can
 * map its code (`rate_limited`, `no_api_key`, …) to its own message. This function owns only what
 * the extraction can get wrong, not what the service can.
 *
 * The pasted text is never consumed or cleared: every failure is retryable by the user, and a
 * retry spends another metered call, so it is their choice to make.
 */
export async function extractRecipe(
  paste: string,
  vocabulary: readonly string[],
): Promise<ExtractionOutcome> {
  // Refused client-side with no call at all. An empty request would still spend a metered call
  // against the household's daily cap — the cheapest possible bug to avoid.
  if (!paste.trim()) {
    return { ok: false, reason: 'empty', trimmed: false };
  }

  const system = buildSystemPrompt(vocabulary);
  const { text: content, trimmed } = trimToBytes(paste, pasteBudgetBytes(system));

  const result = await callClaude({
    feature: FEATURE,
    system,
    messages: [{ role: 'user', content }],
    maxTokens: MAX_TOKENS,
  });

  const parsed = parseExtraction(result.text, vocabulary);
  if (!parsed.ok) return { ok: false, reason: parsed.reason, trimmed };

  return { ok: true, draft: parsed.draft, servingsStated: parsed.servingsStated, trimmed };
}

/**
 * What the request will weigh, by the proxy's own arithmetic
 * (`system + messages.map(m => m.content).join('')`, in UTF-8 bytes). Exported so a test can
 * assert the cap is respected rather than trusting that it is.
 */
export function requestBytes(paste: string, vocabulary: readonly string[]): number {
  const system = buildSystemPrompt(vocabulary);
  const { text } = trimToBytes(paste, pasteBudgetBytes(system));
  return byteLength(system) + byteLength(text);
}
