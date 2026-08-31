// Thin wrapper over @anthropic-ai/sdk for a single non-streaming messages.create call.
// (intent 007, bolt 038). Version is pinned in ./deno.json.
import Anthropic from '@anthropic-ai/sdk';

import { ProxyFailure } from './errors.ts';

export interface AnthropicResult {
  text: string;
  usage: { input_tokens: number; output_tokens: number };
}

export type Message = { role: 'user' | 'assistant'; content: string };

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
  const client = new Anthropic({ apiKey, maxRetries: 1 });
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
    const name = String((err as { name?: unknown })?.name ?? '');
    const msg = String((err as { message?: unknown })?.message ?? '');
    if (/timeout/i.test(name) || /timed?\s*out/i.test(msg)) {
      throw new ProxyFailure('timeout', 'Claude request timed out', 502);
    }
    throw new ProxyFailure('upstream_error', 'Claude upstream error', 502);
  }
}
