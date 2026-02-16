import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ Singleton client (avoids multiple GoTrueClient instances during HMR / React dev reload)
const g = globalThis;
if (!g.__ocean_supabase_client__) {
  g.__ocean_supabase_client__ = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = g.__ocean_supabase_client__;
