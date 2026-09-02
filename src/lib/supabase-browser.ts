import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Browser-safe Supabase client using the anon key.
 * Subject to Row Level Security policies.
 * Safe to use in Client Components.
 */
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

