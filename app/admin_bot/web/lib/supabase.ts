/**
 * Supabase admin client for server-side API routes.
 * Uses service_role key to bypass RLS — NEVER expose to client.
 *
 * Lazy singleton: instantiated on first call, not at module load time.
 * This prevents build-time failures when env vars are absent.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (_supabaseAdmin) return _supabaseAdmin;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
        );
    }

    _supabaseAdmin = createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return _supabaseAdmin;
}
