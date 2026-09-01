// Thin wrapper over @anthropic-ai/sdk for a single non-streaming messages.create call.
// (intent 007, bolt 038; hardened in intent 008, bolt 041 — FR-4). Version pinned in ./deno.json.
import Anthropic from '@anthropic-ai/sdk';

import { ProxyFailure } from './errors.ts';

export interface AnthropicResult {
  text: string;
  usage: { input_tokens: number; output_tokens: number };
}

export type Message = { role: 'user' | 'assistant'; content: string };

/**
 * Hard ceiling on one Claude call. Must stay well under the Supabase Edge Function
 * wall-clock limit (~150 s) so `callAnthropic` throws a `timeout` ProxyFailure *before* the
 * platform kills the function — otherwise the timeout path is unreachable and no
 * `ai_usage_log` row is written. Retries are DISABLED (`maxRetries: 0`): the SDK retries
 * timeouts by default, which would stack multiples of this value onto the wall clock.
 */
export const ANTHROPIC_TIMEOUT_MS = 45_000;

/**
 * Map any error thrown by the Anthropic SDK to a typed ProxyFailure. A timeout-shaped error
 * (SDK `APIConnectionTimeoutError` / `APIUserAbortError`, or a "timed out" message) →
 * `timeout`; everything else → `upstream_error`. A ProxyFailure is passed through unchanged.
 * Extracted so the timeout branch is unit-testable without the network.
 */
export function mapAnthropicError(err: unknown): ProxyFailure {
  if (err instanceof ProxyFailure) return err;
  const name = String((err as { name?: unknown })?.name ?? '');
  const msg = String((err as { message?: unknown })?.message ?? '');
  if (/timeout/i.test(name) || /abort/i.test(name) || /timed?\s*out/i.test(msg)) {
    return new ProxyFailure('timeout', 'Claude request timed out', 502);
  }
  return new ProxyFailure('upstream_error', 'Claude upstream error', 502);
}

/**
 * One non-streaming Claude call. Throws ProxyFailure("timeout" | "upstream_error") on any
 * failure — never a raw SDK error. A `stop_reason: "refusal"` is NOT an error: it returns
 * 200 with whatever text (possibly empty).
 */
export async function callAnthropic(
  apiKey: string,
  model: string,
  maxTokens: number,
  system: string | undefined,
  messages: Message[],
): Promise<AnthropicResult> {
  const client = new Anthropic({ apiKey, timeout: ANTHROPIC_TIMEOUT_MS, maxRetries: 0 });
  try {
    // deno-lint-ignore no-explicit-any
    const msg: any = await client.messages.create({
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages,
    });
    const text: string = (msg.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('');
    return {
      text,
      usage: {
        input_tokens: msg.usage?.input_tokens ?? 0,
        output_tokens: msg.usage?.output_tokens ?? 0,
      },
    };
  } catch (err) {
    throw mapAnthropicError(err);
  }
}
