import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateAiConfig } from '@/features/settings/api';
import { supabase } from '@/shared/lib/supabase';

vi.mock('@/shared/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

const mockedFrom = vi.mocked(supabase.from);

describe('updateAiConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts only { household_id, ...patch } — no client updated_at (server trigger stamps it)', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mockedFrom.mockReturnValue({ upsert } as never);

    await updateAiConfig('hh-1', { daily_call_limit: 7 });

    expect(mockedFrom).toHaveBeenCalledWith('household_ai_config');
    expect(upsert).toHaveBeenCalledWith(
      { household_id: 'hh-1', daily_call_limit: 7 },
      { onConflict: 'household_id' },
    );
    const [payload] = upsert.mock.calls[0];
    expect(payload).not.toHaveProperty('updated_at');
    expect(payload).not.toHaveProperty('updated_by');
  });

  it('throws when the upsert returns an error', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: new Error('rls') });
    mockedFrom.mockReturnValue({ upsert } as never);

    await expect(updateAiConfig('hh-1', { model_override: 'claude-opus-5' })).rejects.toThrow('rls');
  });
});
