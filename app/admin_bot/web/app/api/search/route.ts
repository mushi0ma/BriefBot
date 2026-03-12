import { NextRequest, NextResponse } from "next/server";
import { validateInitData } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("Authorization") ?? "";
    const validated = validateInitData(authHeader);

    if (!validated) {
        return NextResponse.json(
            { error: "Unauthorized: invalid initData" },
            { status: 401 }
        );
    }

    try {
        const url = new URL(request.url);
        const q = url.searchParams.get("q") || "";
        const type = url.searchParams.get("type") || "briefs"; // 'briefs' or 'users'

        const supabase = getSupabaseAdmin();

        if (type === "users") {
            let qb = supabase
                .from("users")
                .select("telegram_id, username, first_name, last_name, briefs_count, created_at, last_active_at");

            if (q) {
                // If it looks like a number, try searching by exact telegram_id
                if (/^\d+$/.test(q)) {
                    qb = qb.eq("telegram_id", parseInt(q, 10));
                } else {
                    const safeQ = q.replace(/[,"()]/g, "");
                    qb = qb.or(`username.ilike.%${safeQ}%,first_name.ilike.%${safeQ}%,last_name.ilike.%${safeQ}%`);
                }
            }

            const { data, error } = await qb
                .order("last_active_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            return NextResponse.json({ results: data ?? [] });

        } else {
            // type === 'briefs'
            let qb = supabase
                .from("brief_history")
                .select("id, telegram_id, template_slug, processing_state, created_at, error_message, title");

            if (q) {
                // Search by title, template_slug, or telegram_id
                if (/^\d+$/.test(q)) {
                    qb = qb.eq("telegram_id", parseInt(q, 10));
                } else {
                    const safeQ = q.replace(/[,"()]/g, "");
                    qb = qb.or(`title.ilike.%${safeQ}%,template_slug.ilike.%${safeQ}%`);
                }
            }

            const { data, error } = await qb
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            return NextResponse.json({ results: data ?? [] });
        }
    } catch (err) {
        console.error("[api/search] Error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
