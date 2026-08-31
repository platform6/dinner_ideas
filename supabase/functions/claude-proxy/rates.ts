// Model allowlist, cost rates, and request limits for claude-proxy. (intent 007, bolt 038)

export const ALLOWLIST = ['claude-sonnet-5', 'claude-haiku-4-5', 'claude-opus-5'] as const;
export type ModelId = (typeof ALLOWLIST)[number];

/** USD per 1,000,000 tokens. */
export const MODEL_RATES: Record<ModelId, { input: number; output: number }> = {
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-opus-5': { input: 5, output: 25 },
};

export const FALLBACK_MODEL: ModelId = 'claude-sonnet-5';
export const MAX_TOKENS_CEILING = 4096;
export const DEFAULT_MAX_TOKENS = 1024;
export const MAX_INPUT_BYTES = 50_000;
export const MAX_FEATURE_LEN = 40;
export const DEFAULT_DAILY_LIMIT = 25;

export function isAllowedModel(m: unknown): m is ModelId {
  return typeof m === 'string' && (ALLOWLIST as readonly string[]).includes(m);
}

/** est_cost_usd rounded to 6 decimals; 0 for an unknown model. */
export function estCostUsd(model: string, usage: { input_tokens: number; output_tokens: number }): number {
  const rate = MODEL_RATES[model as ModelId];
  if (!rate) return 0;
  const raw = (usage.input_tokens / 1e6) * rate.input + (usage.output_tokens / 1e6) * rate.output;
  return Math.round(raw * 1e6) / 1e6;
}
