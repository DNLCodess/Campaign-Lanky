import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (anon key, no session persistence).
 * Inserts are authorized by the tables' RLS insert policies.
 */
export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }
  return createClient(url, anonKey, { auth: { persistSession: false } });
}
