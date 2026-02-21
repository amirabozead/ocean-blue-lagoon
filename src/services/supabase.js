import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || "";
const supabaseAnonKey = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || "";
const hasEnv = typeof supabaseUrl === "string" && supabaseUrl.trim().length > 0 && typeof supabaseAnonKey === "string" && supabaseAnonKey.trim().length > 0;

const g = globalThis;
if (!g.__ocean_supabase_env_client__ && hasEnv) {
  g.__ocean_supabase_env_client__ = createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

/** Use when env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are set - e.g. Vercel or local .env */
export function getSupabaseFromEnv() {
  return hasEnv ? (g.__ocean_supabase_env_client__ || null) : null;
}

export const supabase = hasEnv ? g.__ocean_supabase_env_client__ : null;
