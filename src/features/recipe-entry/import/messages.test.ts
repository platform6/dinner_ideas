import { describe, expect, it } from 'vitest';

import { ClaudeError, type ClaudeErrorCode } from '@/features/ai/api';
import type { ExtractionFailure } from '@/features/recipe-entry/import/parse';
import {
  messageForClaudeCode,
  messageForExtractionFailure,
  messageForThrown,
} from '@/features/recipe-entry/import/messages';

/** The five story 004 scopes, plus the two the app owns elsewhere — the map must be total. */
const ALL_CODES: ClaudeErrorCode[] = [
  'no_session',
  'no_household',
  'no_api_key',
  'rate_limited',
  'bad_request',
  'upstream_error',
  'timeout',
];

const ALL_REASONS: Array<ExtractionFailure | 'empty'> = [
  'empty',
  'no-recipe',
  'not-json',
  'bad-shape',
  'no-steps',
  'bad-values',
];

describe('messageForClaudeCode', () => {
  it.each(ALL_CODES)('has a message for %s', (code) => {
    expect(messageForClaudeCode(code).text.trim().length).toBeGreaterThan(0);
  });

  it('gives every code a DISTINCT message', () => {
    // The story's actual intent. Seven messages that all exist but three of which are identical
    // would pass a per-code "has a message" check while failing the point entirely: the user has
    // to be able to tell the situations apart, because they call for different actions.
    const texts = ALL_CODES.map((code) => messageForClaudeCode(code).text);

    expect(new Set(texts).size).toBe(ALL_CODES.length);
  });

  it.each(ALL_CODES)('never leaks the raw code %s into the message', (code) => {
    const message = messageForClaudeCode(code);

    expect(message.text).not.toContain(code);
    expect(message.text).not.toMatch(/\b[45]\d\d\b/); // no bare HTTP status either
  });

  describe('no_api_key is setup, not failure', () => {
    it('links to settings rather than describing where to go', () => {
      expect(messageForClaudeCode('no_api_key').link).toEqual({
        to: '/settings',
        label: expect.stringMatching(/settings/i),
      });
    });

    it('does not read as an error', () => {
      // Every household starts without a key. Calling that a failure tells a new user something
      // went wrong on their very first attempt, when nothing has.
      const { text } = messageForClaudeCode('no_api_key');

      expect(text).not.toMatch(/error|failed|failure|sorry|wrong/i);
    });
  });

  it('is the only code that carries a link — the others have nowhere to send anyone', () => {
    const withLinks = ALL_CODES.filter((code) => messageForClaudeCode(code).link);

    expect(withLinks).toEqual(['no_api_key']);
  });

  it('tells a rate-limited user to wait rather than implying a retry', () => {
    const { text } = messageForClaudeCode('rate_limited');

    expect(text).toMatch(/tomorrow/i);
    expect(text).not.toMatch(/try again|trying again/i);
  });

  it.each(['upstream_error', 'timeout'] as const)('invites a retry for %s', (code) => {
    expect(messageForClaudeCode(code).text).toMatch(/again/i);
  });

  it('owns bad_request as our bug rather than blaming the page', () => {
    const { text } = messageForClaudeCode('bad_request');

    expect(text).toMatch(/bug/i);
    expect(text).not.toMatch(/your page|your recipe is|you did/i);
  });
});

describe('messageForExtractionFailure', () => {
  it.each(ALL_REASONS)('has a message for %s', (reason) => {
    expect(messageForExtractionFailure(reason).text.trim().length).toBeGreaterThan(0);
  });

  it('gives every reason a DISTINCT message', () => {
    const texts = ALL_REASONS.map((reason) => messageForExtractionFailure(reason).text);

    expect(new Set(texts).size).toBe(ALL_REASONS.length);
  });

  it.each(ALL_REASONS)('never leaks the raw reason %s into the message', (reason) => {
    expect(messageForExtractionFailure(reason).text).not.toContain(reason);
  });

  it('separates "no recipe here" from "the answer was unreadable"', () => {
    // The distinction the live pass surfaced. One means nothing went wrong and this page will
    // never contain a recipe; the other means a retry may well work. Same message for both sends
    // half these users to retry a locked door.
    const noRecipe = messageForExtractionFailure('no-recipe').text;
    const malformed = messageForExtractionFailure('not-json').text;

    expect(noRecipe).toMatch(/no recipe on that page/i);
    expect(noRecipe).not.toMatch(/again/i);
    expect(malformed).toMatch(/again/i);
  });

  it('names what was missing when the steps are missing', () => {
    // "It didn't work" would hide the one fact worth knowing: a recipe DID come back, without its
    // method. That is the failure this whole unit is shaped around.
    expect(messageForExtractionFailure('no-steps').text).toMatch(/cooking steps/i);
  });
});

describe('messageForThrown', () => {
  it('maps a ClaudeError by its code', () => {
    const thrown = new ClaudeError('rate_limited', 'HTTP 429');

    expect(messageForThrown(thrown)).toEqual(messageForClaudeCode('rate_limited'));
  });

  it.each([
    ['a plain Error', new Error('kaboom')],
    ['a string', 'kaboom'],
    ['null', null],
    ['undefined', undefined],
  ])('still says something useful for %s', (_label, thrown) => {
    // `catch` hands you `unknown`, not a ClaudeError. A crash in our own code must not render as
    // a blank alert or, worse, as the exception text.
    const message = messageForThrown(thrown);

    expect(message.text.trim().length).toBeGreaterThan(0);
    expect(message.text).not.toContain('kaboom');
  });
});
