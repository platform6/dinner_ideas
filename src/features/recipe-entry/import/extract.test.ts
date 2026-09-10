import { beforeEach, describe, expect, it, vi } from 'vitest';

import { callClaude, ClaudeError } from '@/features/ai/api';
import { extractRecipe, requestBytes } from '@/features/recipe-entry/import/extract';
import { byteLength } from '@/features/recipe-entry/import/prompt';

vi.mock('@/features/ai/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/ai/api')>()),
  callClaude: vi.fn(),
}));

const mockedCallClaude = vi.mocked(callClaude);

const VOCABULARY = ['bean sprouts', 'chicken', 'kim', 'noodles', 'shrimp'];

/** The proxy's own cap, `MAX_INPUT_BYTES` in `supabase/functions/claude-proxy/rates.ts`. */
const PROXY_CAP_BYTES = 50_000;

const GOOD_REPLY = JSON.stringify({
  name: 'Shrimp Noodle Bowls',
  cuisine: 'Thai',
  cookTimeMinutes: 25,
  summary: 'Fry the shrimp, boil the noodles, toss together.',
  servingsStated: true,
  ingredients: [{ quantity: 0.75, unit: 'lb', name: 'shrimp', category: 'Protein' }],
  steps: ['Fry the shrimp until pink.', 'Boil the noodles.', 'Toss together and serve.'],
  tags: ['shrimp'],
});

function replyWith(text: string) {
  mockedCallClaude.mockResolvedValue({
    text,
    model: 'claude-sonnet-5',
    usage: { inputTokens: 100, outputTokens: 200 },
    latencyMs: 1200,
  });
}

describe('extractRecipe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    replyWith(GOOD_REPLY);
  });

  describe('an empty paste never reaches the proxy', () => {
    it.each([
      ['an empty string', ''],
      ['spaces', '   '],
      ['newlines and tabs', '\n\t \n'],
    ])('refuses %s without calling the API at all', async (_label, paste) => {
      const outcome = await extractRecipe(paste, VOCABULARY);

      // A call with nothing in it still spends one against the household's daily cap. This is the
      // cheapest possible bug to avoid, so it is asserted rather than assumed.
      expect(mockedCallClaude).not.toHaveBeenCalled();
      expect(outcome).toEqual({ ok: false, reason: 'empty', trimmed: false });
    });
  });

  describe('the request the proxy receives', () => {
    it('sends the pasted text as the user message', async () => {
      await extractRecipe('Grandma’s shrimp noodles: fry, boil, toss.', VOCABULARY);

      expect(mockedCallClaude).toHaveBeenCalledTimes(1);
      expect(mockedCallClaude.mock.calls[0][0].messages).toEqual([
        { role: 'user', content: 'Grandma’s shrimp noodles: fry, boil, toss.' },
      ]);
    });

    it('tags its usage so the log can tell this caller from the connection test', async () => {
      await extractRecipe('a recipe', VOCABULARY);

      expect(mockedCallClaude.mock.calls[0][0].feature).toBe('recipe_import');
    });

    it('stays inside the proxy max_tokens ceiling of 4096', async () => {
      await extractRecipe('a recipe', VOCABULARY);

      const { maxTokens } = mockedCallClaude.mock.calls[0][0];
      expect(maxTokens).toBeGreaterThan(0);
      expect(maxTokens).toBeLessThanOrEqual(4096);
    });

    it('carries the household vocabulary in the system prompt', async () => {
      await extractRecipe('a recipe', VOCABULARY);

      expect(mockedCallClaude.mock.calls[0][0].system).toContain('shrimp');
    });
  });

  describe('the size cap, computed the proxy’s way', () => {
    it('sends a normal recipe page whole', async () => {
      const page = 'Ingredients and method. '.repeat(500); // ~12 KB, a long blog post

      const outcome = await extractRecipe(page, VOCABULARY);

      expect(outcome.trimmed).toBe(false);
      expect(mockedCallClaude.mock.calls[0][0].messages[0].content).toBe(page);
    });

    it('never exceeds 50,000 bytes, even for a paste far over it', async () => {
      const huge = 'x'.repeat(200_000);

      await extractRecipe(huge, VOCABULARY);

      const call = mockedCallClaude.mock.calls[0][0];
      const weighed = byteLength(call.system ?? '') + byteLength(call.messages[0].content);
      expect(weighed).toBeLessThan(PROXY_CAP_BYTES);
    });

    it('never exceeds the cap when the paste is all multi-byte characters', async () => {
      // The case a character-count budget would get wrong: 60,000 characters is 180,000 bytes.
      // These are the pages the feature exists for — ½, °, —, curly quotes everywhere.
      const huge = '—'.repeat(60_000);

      await extractRecipe(huge, VOCABULARY);

      const call = mockedCallClaude.mock.calls[0][0];
      const weighed = byteLength(call.system ?? '') + byteLength(call.messages[0].content);
      expect(weighed).toBeLessThan(PROXY_CAP_BYTES);
    });

    it('trims the END, keeping the recipe and dropping the comments', async () => {
      // The recipe half alone overruns the budget, so nothing of the tail can survive.
      const recipe = 'RECIPE START. ' + 'ingredients and steps. '.repeat(3_000);
      const comments = ' COMMENTS-TAIL-MARKER '.repeat(2_000);

      await extractRecipe(recipe + comments, VOCABULARY);

      const sent = mockedCallClaude.mock.calls[0][0].messages[0].content;
      expect(sent).toContain('RECIPE START.');
      expect(sent).not.toContain('COMMENTS-TAIL-MARKER');
    });

    it('reports the trim, so the user is told the input was shortened', async () => {
      const outcome = await extractRecipe('x'.repeat(200_000), VOCABULARY);

      expect(outcome.trimmed).toBe(true);
    });

    it('reports the trim on a FAILURE too, so a trim is never lost behind an error', async () => {
      replyWith('I cannot help with that.');

      const outcome = await extractRecipe('x'.repeat(200_000), VOCABULARY);

      expect(outcome).toEqual({ ok: false, reason: 'not-json', trimmed: true });
    });
  });

  describe('requestBytes', () => {
    it.each([
      ['a short paste', 'a recipe'],
      ['a long ASCII paste', 'x'.repeat(200_000)],
      ['a long multi-byte paste', '🍤'.repeat(50_000)],
      ['a paste sitting right on the boundary', '—'.repeat(16_000)],
    ])('stays under the proxy cap for %s', (_label, paste) => {
      // Exported precisely so the cap is asserted rather than trusted. Story 001 is absolute: the
      // proxy must never answer this caller with `bad_request` for size.
      expect(requestBytes(paste, VOCABULARY)).toBeLessThan(PROXY_CAP_BYTES);
    });
  });

  describe('the outcome', () => {
    it('returns a draft when the model plays along', async () => {
      const outcome = await extractRecipe('a recipe page', VOCABULARY);

      expect(outcome.ok).toBe(true);
      expect(outcome.ok && outcome.draft.name).toBe('Shrimp Noodle Bowls');
      expect(outcome.ok && outcome.draft.steps).toHaveLength(3);
    });

    it('passes servingsStated through, so the user can be told to check quantities', async () => {
      replyWith(GOOD_REPLY.replace('"servingsStated":true', '"servingsStated":false'));

      const outcome = await extractRecipe('a recipe page', VOCABULARY);

      expect(outcome.ok && outcome.servingsStated).toBe(false);
    });

    it.each([
      ['a refusal', 'I am not able to help with that.', 'not-json'],
      ['a page with no recipe', '{"error": "no recipe found"}', 'no-recipe'],
      ['a reply with no steps', GOOD_REPLY.replace(/"steps":\[[^\]]*\]/, '"steps":[]'), 'no-steps'],
    ])('turns %s into a typed failure', async (_label, text, reason) => {
      replyWith(text);

      const outcome = await extractRecipe('a recipe page', VOCABULARY);

      expect(outcome).toEqual({ ok: false, reason, trimmed: false });
    });
  });

  describe('errors from the service itself', () => {
    it.each(['rate_limited', 'no_api_key', 'timeout'] as const)(
      'lets a %s ClaudeError propagate for the caller to map',
      async (code) => {
        // This function owns what the EXTRACTION can get wrong, not what the SERVICE can.
        // Turning these codes into English is story 004, bolt 062 — swallowing them here would
        // flatten "you are out of calls today" into "that page could not be read".
        mockedCallClaude.mockRejectedValue(new ClaudeError(code, 'nope'));

        await expect(extractRecipe('a recipe page', VOCABULARY)).rejects.toThrow(ClaudeError);
      },
    );
  });
});
