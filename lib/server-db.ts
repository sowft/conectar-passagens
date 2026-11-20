import { createClient } from "@supabase/supabase-js";

// Only import from server routes. Never expose the service role in NEXT_PUBLIC_*.
export function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configure o Supabase no servidor: URL e SUPABASE_SECRET_KEY.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
