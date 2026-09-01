import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateAiConfig } from '@/features/settings/api';
import { supabase } from '@/shared/lib/supabase';

vi.mock('@/shared/lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

const mockedRpc = vi.mocked(supabase.rpc);

describe('updateAiConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRpc.mockResolvedValue({ error: null } as never);
  });

  it('a model change calls set_ai_model_override, not a table upsert', async () => {
    await updateAiConfig({ model_override: 'claude-opus-5' });
    expect(mockedRpc).toHaveBeenCalledTimes(1);
    expect(mockedRpc).toHaveBeenCalledWith('set_ai_model_override', { p_model: 'claude-opus-5' });
  });

  it('clearing the model override sends p_model: null', async () => {
    await updateAiConfig({ model_override: null });
    expect(mockedRpc).toHaveBeenCalledWith('set_ai_model_override', { p_model: null });
  });

  it('a daily-limit change calls set_ai_daily_call_limit', async () => {
    await updateAiConfig({ daily_call_limit: 7 });
    expect(mockedRpc).toHaveBeenCalledTimes(1);
    expect(mockedRpc).toHaveBeenCalledWith('set_ai_daily_call_limit', { p_limit: 7 });
  });

  it('throws when the RPC returns an error', async () => {
    mockedRpc.mockResolvedValue({
      error: new Error('only a household owner can change AI settings'),
    } as never);
    await expect(updateAiConfig({ daily_call_limit: 7 })).rejects.toThrow('only a household owner');
  });
});
