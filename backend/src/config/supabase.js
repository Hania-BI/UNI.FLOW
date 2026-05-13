import { createClient } from '@supabase/supabase-js';

// supabaseAdmin uses the service_role key to bypass RLS.
// Use this inside controllers where you enforce ownership manually.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// supabaseAuth uses the anon key.
export const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
