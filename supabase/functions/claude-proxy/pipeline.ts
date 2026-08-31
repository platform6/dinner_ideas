// The testable core of claude-proxy: auth -> household -> rate-limit -> key -> validate ->
// Anthropic -> meter -> respond. No I/O of its own — everything is injected via `Deps`.
// (intent 007, bolt 038, story 003)

import { ProxyFailure, type ErrorCode } from './errors.ts';
import type { Message } from './anthropic.ts';
import {
  DEFAULT_DAILY_LIMIT,
  DEFAULT_MAX_TOKENS,
  FALLBACK_MODEL,
  isAllowedModel,
  ALLOWLIST,
  MAX_FEATURE_LEN,
  MAX_INPUT_BYTES,
  MAX_TOKENS_CEILING,
  estCostUsd,
} from './rates.ts';

export interface ProxyRequest {
  feature?: unknown;
  system?: unknown;
  messages?: unknown;
  model?: unknown;
  max_tokens?: unknown;
}

export interface UsageRow {
  household_id: string;
  profile_id: string;
  feature: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  est_cost_usd: number;
  ok: boolean;
  error_code: ErrorCode | null;
  latency_ms: number;
}

export interface Deps {
  getUser(authHeader: string | null): Promise<{ id: string } | null>;
  resolveHousehold(profileId: string): Promise<string | null>;
  loadConfig(
    householdId: string,
  ): Promise<{ model_override: string | null; daily_call_limit: number } | null>;
  countToday(householdId: string): Promise<number>;
  resolveKey(householdId: string): Promise<string | null>;
  callAnthropic(
    key: string,
    model: string,
    maxTokens: number,
    system: string | undefined,
    messages: Message[],
  ): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }>;
  insertUsage(row: UsageRow): Promise<void>;
  now(): number;
  envModel: string | undefined;
  envDailyLimit: number | undefined;
}

export interface PipelineResult {
  status: number;
  body: unknown;
}

interface ValidRequest {
  feature: string;
  system: string | undefined;
  messages: Message[];
  model: string | undefined;
  maxTokens: number | undefined;
}

function validate(body: ProxyRequest): ValidRequest {
  const { feature } = body;
  if (typeof feature !== 'string' || feature.length === 0 || feature.length > MAX_FEATURE_LEN) {
    throw new ProxyFailure('bad_request', "invalid 'feature'", 400);
  }

  const system = body.system === undefined ? undefined : String(body.system);

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ProxyFailure('bad_request', "'messages' must be a non-empty array", 400);
  }
  const messages: Message[] = body.messages.map((m) => {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || content.length === 0) {
      throw new ProxyFailure(
        'bad_request',
        "each message needs role 'user'|'assistant' and non-empty string content",
        400,
      );
    }
    return { role, content };
  });

  let model: string | undefined;
  if (body.model !== undefined) {
    if (!isAllowedModel(body.model)) {
      throw new ProxyFailure('bad_request', `model must be one of: ${ALLOWLIST.join(', ')}`, 400);
    }
    model = body.model;
  }

  let maxTokens: number | undefined;
  if (body.max_tokens !== undefined) {
    const n = Number(body.max_tokens);
    if (!Number.isInteger(n) || n < 1 || n > MAX_TOKENS_CEILING) {
      throw new ProxyFailure('bad_request', `max_tokens must be an integer 1..${MAX_TOKENS_CEILING}`, 400);
    }
    maxTokens = n;
  }

  const bytes = new TextEncoder().encode((system ?? '') + messages.map((m) => m.content).join('')).length;
  if (bytes > MAX_INPUT_BYTES) {
    throw new ProxyFailure('bad_request', `input too large (> ${MAX_INPUT_BYTES} bytes)`, 400);
  }

  return { feature, system, messages, model, maxTokens };
}

function safeFeature(raw: string): string {
  try {
    const f = (JSON.parse(raw) as { feature?: unknown }).feature;
    return typeof f === 'string' && f.length > 0 && f.length <= MAX_FEATURE_LEN ? f : 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function handleProxy(
  rawBody: string,
  authHeader: string | null,
  deps: Deps,
): Promise<PipelineResult> {
  const t0 = deps.now();

  // ── Authentication — no usage row on failure ──────────────────────────────
  const user = await deps.getUser(authHeader);
  if (!user) {
    return {
      status: 401,
      body: { error_code: 'unauthenticated', message: 'sign in required' },
    };
  }

  const householdId = await deps.resolveHousehold(user.id);
  if (!householdId) {
    return {
      status: 403,
      body: {
        error_code: 'no_household',
        message: 'your account is not attached to a household',
      },
    };
  }

  // ── From here: exactly one ai_usage_log row per request ───────────────────
  let logged = false;
  const write = async (r: {
    feature: string;
    model: string;
    ok: boolean;
    error_code: ErrorCode | null;
    input_tokens?: number;
    output_tokens?: number;
    est_cost_usd?: number;
  }) => {
    if (logged) return;
    logged = true;
    await deps.insertUsage({
      household_id: householdId,
      profile_id: user.id,
      feature: r.feature,
      model: r.model,
      input_tokens: r.input_tokens ?? null,
      output_tokens: r.output_tokens ?? null,
      est_cost_usd: r.est_cost_usd ?? 0,
      ok: r.ok,
      error_code: r.error_code,
      latency_ms: deps.now() - t0,
    });
  };

  const fallbackModel = deps.envModel ?? FALLBACK_MODEL;

  try {
    let parsed: ProxyRequest;
    try {
      parsed = JSON.parse(rawBody) as ProxyRequest;
    } catch {
      throw new ProxyFailure('bad_request', 'body is not valid JSON', 400);
    }
    const v = validate(parsed);

    const cfg = (await deps.loadConfig(householdId)) ?? {
      model_override: null,
      daily_call_limit: deps.envDailyLimit ?? DEFAULT_DAILY_LIMIT,
    };
    const model = v.model ?? cfg.model_override ?? fallbackModel;

    const used = await deps.countToday(householdId);
    if (used >= cfg.daily_call_limit) {
      await write({ feature: v.feature, model, ok: false, error_code: 'rate_limited' });
      return {
        status: 429,
        body: { error_code: 'rate_limited', message: 'daily call limit reached' },
      };
    }

    const key = await deps.resolveKey(householdId);
    if (!key) {
      await write({ feature: v.feature, model, ok: false, error_code: 'no_api_key' });
      return {
        status: 409,
        body: {
          error_code: 'no_api_key',
          message: 'no Claude API key set for this household',
        },
      };
    }

    try {
      const r = await deps.callAnthropic(key, model, v.maxTokens ?? DEFAULT_MAX_TOKENS, v.system, v.messages);
      const est_cost_usd = estCostUsd(model, r.usage);
      await write({
        feature: v.feature,
        model,
        ok: true,
        error_code: null,
        input_tokens: r.usage.input_tokens,
        output_tokens: r.usage.output_tokens,
        est_cost_usd,
      });
      return {
        status: 200,
        body: {
          text: r.text,
          model,
          usage: r.usage,
          latency_ms: deps.now() - t0,
        },
      };
    } catch (err) {
      const pf =
        err instanceof ProxyFailure ? err : new ProxyFailure('upstream_error', 'Claude upstream error', 502);
      await write({ feature: v.feature, model, ok: false, error_code: pf.code });
      return { status: pf.httpStatus, body: { error_code: pf.code, message: pf.message } };
    }
  } catch (err) {
    // JSON / validation failures — the request may not even have a valid feature.
    const pf = err instanceof ProxyFailure ? err : new ProxyFailure('bad_request', 'bad request', 400);
    await write({
      feature: safeFeature(rawBody),
      model: fallbackModel,
      ok: false,
      error_code: pf.code,
    });
    return { status: pf.httpStatus, body: { error_code: pf.code, message: pf.message } };
  }
}
