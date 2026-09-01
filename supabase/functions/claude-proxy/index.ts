// claude-proxy — the app's only path to the Anthropic API. (intent 007, bolt 038;
// hardened in intent 008, bolt 040)
//
// FROZEN CONTRACT (bolt 039 + intent 009 recipe-import build against this):
//   POST  Authorization: Bearer <supabase access token>
//   body  { feature: string, system?: string,
//           messages: {role:'user'|'assistant', content:string}[],
//           model?: 'claude-sonnet-5'|'claude-haiku-4-5'|'claude-opus-5',
//           max_tokens?: number }
//   200   { text, model, usage:{input_tokens,output_tokens}, latency_ms }
//   4xx/5xx { error_code, message }   error_code in:
//           no_household(403) no_api_key(409) rate_limited(429)
//           bad_request(400) upstream_error(502) timeout(502)  | 401 has no error_code
//
// A backend-side failure (household/config/key lookup, or the daily-cap reserve) fails
// CLOSED and surfaces as upstream_error(502) — never a misleading no_household/no_api_key
// and never an unbounded run of paid calls. See ./README.md for env, limits, and deploy.

import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from './cors.ts';
import { callAnthropic } from './anthropic.ts';
import { handleProxy, type Deps } from './pipeline.ts';
import { parsePositiveInt } from './rates.ts';

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return json({ error_code: 'bad_request', message: 'POST only' }, 405, cors);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization');

  const service = createClient(url, serviceKey);
  const authed = createClient(url, anonKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
  });

  const deps: Deps = {
    async getUser(h) {
      if (!h) return null;
      const { data, error } = await authed.auth.getUser();
      if (error || !data.user) return null;
      return { id: data.user.id };
    },
    async resolveHousehold(profileId) {
      const { data, error } = await service
        .from('household_members')
        .select('household_id')
        .eq('profile_id', profileId)
        .limit(1)
        .maybeSingle();
      if (error) return { data: null, error: true };
      return { data: data?.household_id ?? null, error: false };
    },
    async loadConfig(householdId) {
      const { data, error } = await service
        .from('household_ai_config')
        .select('model_override, daily_call_limit')
        .eq('household_id', householdId)
        .maybeSingle();
      if (error) return { data: null, error: true };
      return { data: data ?? null, error: false };
    },
    async reserveCall(householdId, limit) {
      const { data, error } = await service.rpc('reserve_ai_call', {
        p_household_id: householdId,
        p_limit: limit,
      });
      if (error) return { ok: false, reason: 'error' };
      const n = data as number | null;
      if (n === null || n === undefined) return { ok: false, reason: 'over_limit' };
      return { ok: true, n };
    },
    async resolveKey(householdId) {
      const { data, error } = await service.rpc('resolve_ai_key', {
        p_household_id: householdId,
      });
      if (error) return { data: null, error: true };
      return { data: (data as string | null) ?? null, error: false };
    },
    callAnthropic,
    async insertUsage(row) {
      await service.from('ai_usage_log').insert(row);
    },
    now: () => Date.now(),
    envModel: Deno.env.get('ANTHROPIC_MODEL') ?? undefined,
    envDailyLimit: parsePositiveInt(Deno.env.get('AI_DAILY_CALL_LIMIT')),
  };

  const raw = await req.text();
  const { status, body } = await handleProxy(raw, authHeader, deps);
  return json(body, status, cors);
});

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
