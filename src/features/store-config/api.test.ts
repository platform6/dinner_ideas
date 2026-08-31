import { beforeEach, describe, expect, it, vi } from 'vitest';

import { assignCategory } from '@/features/store-config/api';
import { supabase } from '@/shared/lib/supabase';

const upsert = vi.fn();

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ upsert })),
  },
}));

const mockedFrom = vi.mocked(supabase.from);

describe('store-config api / assignCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue({ error: null });
  });

  it('upserts against the composite (household_id, category) conflict target', async () => {
    await assignCategory('Dairy', 'row-1');

    expect(mockedFrom).toHaveBeenCalledWith('category_row_assignments');
    expect(upsert).toHaveBeenCalledWith(
      { category: 'Dairy', row_id: 'row-1' },
      { onConflict: 'household_id,category' },
    );
  });

  it('does not put household_id in the payload (the column default self-assigns it)', async () => {
    await assignCategory('Produce', 'row-2');

    const [payload] = upsert.mock.calls[0];
    expect(payload).not.toHaveProperty('household_id');
  });

  it('throws when Supabase returns an error', async () => {
    upsert.mockResolvedValue({ error: new Error('rls') });
    await expect(assignCategory('Pantry', 'row-3')).rejects.toThrow('rls');
  });
});
