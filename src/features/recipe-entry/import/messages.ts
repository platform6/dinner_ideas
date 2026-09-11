import { ClaudeError, type ClaudeErrorCode } from '@/features/ai/api';
import type { ExtractionFailure } from '@/features/recipe-entry/import/parse';

/**
 * What went wrong, in English, plus whether the user should do something about it (story 004).
 *
 * The story's point is not that a failure has *a* message — it is that the user learns whether to
 * retry, wait, or go and set something up. Those are three different actions, so a message that
 * cannot be told apart from its neighbour has failed even if it is perfectly polite.
 */
export interface ImportMessage {
  text: string;
  /**
   * Where the user has to go, when the answer is "go set something up". Only `no_api_key` has one:
   * a household with no key is a normal starting state, not a failure, and the useful response is
   * a link rather than prose telling them to go and find the page.
   */
  link?: { to: string; label: string };
}

/**
 * Proxy failures — the five codes reachable from this caller.
 *
 * `no_session` and `no_household` are the app's existing concern (the user is signed out, or their
 * account is half-provisioned) and are not import problems; they fall through to the default,
 * which is deliberately vague rather than wrong.
 */
const CLAUDE_MESSAGES: Record<ClaudeErrorCode, ImportMessage> = {
  no_api_key: {
    // NOT an error. This is how every household starts, and it should not read like a fault.
    text: 'Reading recipes needs a Claude API key, and this household doesn’t have one set up yet.',
    link: { to: '/settings', label: 'Set one up in Settings' },
  },
  rate_limited: {
    // Distinct from a transient failure on purpose: retrying achieves nothing, and a message that
    // invites a retry here wastes the user's time on a door that is locked until tomorrow.
    text: 'That’s all the recipe reading for today — the household’s daily limit is used up. It resets tomorrow. You can still type this one in.',
  },
  upstream_error: {
    text: 'Claude couldn’t be reached just now. Your text is still here, so trying again is worth a go.',
  },
  timeout: {
    text: 'Claude took too long to answer. Your text is still here, so trying again is worth a go.',
  },
  bad_request: {
    // Our bug, not theirs. Sizing is handled in story 001 and should make this unreachable; if a
    // user ever sees it, blaming their page would send them off editing something that is fine.
    text: 'Something went wrong on our side sending that page to Claude — that’s a bug here, not a problem with your recipe. Typing it in will work.',
  },
  no_session: {
    text: 'Your session has expired. Sign in again and the recipe will still be here.',
  },
  no_household: {
    text: 'This account isn’t attached to a household yet, so recipes can’t be read.',
  },
};

/**
 * Extraction failures — bolt 061's typed reasons.
 *
 * `no-recipe` is deliberately separated from the malformed family. They are not the same event:
 * one means nothing went wrong and that page simply has no recipe on it, the other means the
 * answer came back unreadable and a retry may well work. Collapsing them sends half of these users
 * to retry a page that will never contain a recipe.
 */
const EXTRACTION_MESSAGES: Record<ExtractionFailure | 'empty', ImportMessage> = {
  empty: {
    text: 'Paste a recipe page first.',
  },
  'no-recipe': {
    text: 'There’s no recipe on that page as far as Claude can tell. Check you copied the whole page — or try a different one.',
  },
  'not-json': {
    text: 'Claude’s answer couldn’t be read as a recipe. Your text is still here, so trying again is worth a go.',
  },
  'bad-shape': {
    text: 'Claude’s answer came back incomplete. Your text is still here, so trying again is worth a go.',
  },
  'no-steps': {
    // The failure this whole unit is shaped around. Say what was missing, because "it didn't work"
    // would hide the one thing worth knowing: a recipe did come back, without its method.
    text: 'Claude read that page but didn’t come back with any cooking steps, so there’s nothing to check. Trying again is worth a go.',
  },
  'bad-values': {
    text: 'Claude’s answer had quantities or a cook time that don’t make sense, so it wasn’t used. Trying again is worth a go.',
  },
};

export function messageForExtractionFailure(reason: ExtractionFailure | 'empty'): ImportMessage {
  return EXTRACTION_MESSAGES[reason];
}

export function messageForClaudeCode(code: ClaudeErrorCode): ImportMessage {
  return CLAUDE_MESSAGES[code];
}

/**
 * Anything thrown out of the extraction, turned into something a person can act on.
 *
 * Takes `unknown` rather than `ClaudeError` because that is what a `catch` actually hands you. A
 * non-`ClaudeError` here means a bug rather than a service failure, and it gets a message that
 * does not blame the user's page for it.
 */
export function messageForThrown(error: unknown): ImportMessage {
  if (error instanceof ClaudeError) return messageForClaudeCode(error.code);
  return {
    text: 'Something went wrong reading that page. Your text is still here, so trying again is worth a go.',
  };
}
