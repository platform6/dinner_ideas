import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/lib/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in real values.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
