import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Lazy Supabase admin singleton — only instantiates on first call.
 * Uses the service role key to bypass RLS.
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (!_client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        }
        _client = createClient(url, key);
    }
    return _client;
}
