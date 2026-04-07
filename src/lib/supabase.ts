/**
 * Supabase clients.
 *
 * - `supabasePublic` uses the anon key and is safe for the browser / RSC.
 * - `supabaseAdmin` uses the service role key and MUST only be imported
 *   from server-side code (seed scripts, API routes).
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}

export const supabasePublic: SupabaseClient = createClient(
  url,
  anonKey ?? "",
  { auth: { persistSession: false } }
);

export function getAdminClient(): SupabaseClient {
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set; admin client requires it"
    );
  }
  return createClient(url!, serviceKey, { auth: { persistSession: false } });
}
