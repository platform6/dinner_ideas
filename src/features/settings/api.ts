import { supabase } from '@/shared/lib/supabase';
import type { ClaudeModel } from '@/features/ai/api';

/**
 * Reads + owner mutations for `household_ai_config` (intent 007, bolt 037).
 * RLS scopes every call to the caller's household; the key set/clear go through
 * `security definer` RPCs (the key value never touches a table column or a response).
 */

const DEFAULT_DAILY_LIMIT = 25;

export interface AiConfig {
  /** null = use the server default model. */
  modelOverride: ClaudeModel | null;
  dailyCallLimit: number;
  /** whether this household has its own Anthropic key set (the value is never exposed). */
  keySet: boolean;
}

export async function fetchAiConfig(): Promise<AiConfig> {
  const { data, error } = await supabase
    .from('household_ai_config')
    .select('model_override, daily_call_limit, key_secret_id')
    .maybeSingle();
  if (error) throw error;
  return {
    modelOverride: (data?.model_override as ClaudeModel | null) ?? null,
    dailyCallLimit: data?.daily_call_limit ?? DEFAULT_DAILY_LIMIT,
    keySet: data?.key_secret_id != null,
  };
}

/** Owner-only (enforced server-side). Stores the key in Supabase Vault. */
export async function setHouseholdKey(key: string): Promise<void> {
  const { error } = await supabase.rpc('set_household_ai_key', { p_key: key });
  if (error) throw error;
}

/** Owner-only. Removes the household key (no-op if none set). */
export async function clearHouseholdKey(): Promise<void> {
  const { error } = await supabase.rpc('clear_household_ai_key');
  if (error) throw error;
}

/**
 * Owner-only. `key_secret_id` is not writable here (column-revoked) — use the RPCs above.
 * `updated_by` / `updated_at` are stamped by a server-side trigger
 * (`stamp_household_ai_config_provenance`); the client no longer sends them.
 */
export async function updateAiConfig(
  householdId: string,
  patch: { model_override?: ClaudeModel | null; daily_call_limit?: number },
): Promise<void> {
  const { error } = await supabase
    .from('household_ai_config')
    .upsert({ household_id: householdId, ...patch }, { onConflict: 'household_id' });
  if (error) throw error;
}
