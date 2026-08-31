import { supabase } from '@/shared/lib/supabase';

/**
 * Typed client for the `claude-proxy` Supabase Edge Function (intent 007, bolt 038).
 * The browser never holds an Anthropic key — this sends the caller's Supabase session token
 * and the function does the rest. See `supabase/functions/claude-proxy/README.md` for the
 * frozen request/response contract.
 */

export type ClaudeErrorCode =
  | 'no_session'
  | 'no_household'
  | 'no_api_key'
  | 'rate_limited'
  | 'bad_request'
  | 'upstream_error'
  | 'timeout';

export class ClaudeError extends Error {
  constructor(
    readonly code: ClaudeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ClaudeError';
  }
}

export type ClaudeModel = 'claude-sonnet-5' | 'claude-haiku-4-5' | 'claude-opus-5';

export interface CallClaudeArgs {
  /** Short tag stored on the usage-log row, e.g. `'connection_test'`. */
  feature: string;
  system?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  model?: ClaudeModel;
  maxTokens?: number;
}

export interface CallClaudeResult {
  text: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

const KNOWN_CODES: ClaudeErrorCode[] = [
  'no_household',
  'no_api_key',
  'rate_limited',
  'bad_request',
  'upstream_error',
  'timeout',
];

function functionUrl(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  return `${base.replace(/\/$/, '')}/functions/v1/claude-proxy`;
}

export async function callClaude(args: CallClaudeArgs): Promise<CallClaudeResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new ClaudeError('no_session', 'You are not signed in.');
  }

  let res: Response;
  try {
    res = await fetch(functionUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        feature: args.feature,
        system: args.system,
        messages: args.messages,
        model: args.model,
        max_tokens: args.maxTokens,
      }),
    });
  } catch {
    throw new ClaudeError('upstream_error', 'Could not reach the AI service.');
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // fall through — handled by the shape checks below
  }

  if (res.status === 401) {
    throw new ClaudeError('no_session', 'Your session has expired — sign in again.');
  }

  if (!res.ok) {
    const raw = (body as { error_code?: string } | null)?.error_code ?? '';
    const code: ClaudeErrorCode = (KNOWN_CODES as string[]).includes(raw)
      ? (raw as ClaudeErrorCode)
      : 'upstream_error';
    const message = (body as { message?: string } | null)?.message ?? `AI request failed (${res.status}).`;
    throw new ClaudeError(code, message);
  }

  const ok = body as {
    text?: unknown;
    model?: unknown;
    usage?: { input_tokens?: number; output_tokens?: number };
    latency_ms?: number;
  } | null;
  if (!ok || typeof ok.text !== 'string' || typeof ok.model !== 'string') {
    throw new ClaudeError('upstream_error', 'The AI service returned an unexpected response.');
  }

  return {
    text: ok.text,
    model: ok.model,
    usage: {
      inputTokens: ok.usage?.input_tokens ?? 0,
      outputTokens: ok.usage?.output_tokens ?? 0,
    },
    latencyMs: ok.latency_ms ?? 0,
  };
}
