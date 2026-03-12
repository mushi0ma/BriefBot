/**
 * GET /api/stats — Admin dashboard statistics + recent briefs.
 * Validates Telegram initData before returning Supabase metrics.
 */

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
        const supabase = getSupabaseAdmin();

        // Parallel queries for speed
        const [
            usersRes,
            totalBriefsRes,
            todayBriefsRes,
            successBriefsRes,
            failedBriefsRes,
            recentBriefsRes,
            topUsersRes,
        ] = await Promise.all([
            supabase.from("users").select("*", { count: "exact", head: true }),
            supabase.from("brief_history").select("*", { count: "exact", head: true }),
            supabase
                .from("brief_history")
                .select("*", { count: "exact", head: true })
                .gte("created_at", `${new Date().toISOString().split("T")[0]}T00:00:00+00:00`),
            supabase
                .from("brief_history")
                .select("*", { count: "exact", head: true })
                .eq("processing_state", "done"),
            supabase
                .from("brief_history")
                .select("*", { count: "exact", head: true })
                .eq("processing_state", "failed"),
            supabase
                .from("brief_history")
                .select("id, telegram_id, template_slug, processing_state, created_at, error_message")
                .order("created_at", { ascending: false })
                .limit(10),
            supabase
                .from("users")
                .select("telegram_id, username, first_name, briefs_count")
                .order("briefs_count", { ascending: false })
                .limit(5),
        ]);

        const totalUsers = usersRes.count ?? 0;
        const totalBriefs = totalBriefsRes.count ?? 0;
        const todayBriefs = todayBriefsRes.count ?? 0;
        const successfulBriefs = successBriefsRes.count ?? 0;
        const failedBriefs = failedBriefsRes.count ?? 0;

        const successRate =
            totalBriefs > 0
                ? Math.round((successfulBriefs / totalBriefs) * 100)
                : 0;

        return NextResponse.json({
            users: { total: totalUsers },
            briefs: {
                total: totalBriefs,
                today: todayBriefs,
                successful: successfulBriefs,
                failed: failedBriefs,
                successRate,
            },
            recentBriefs: recentBriefsRes.data ?? [],
            topUsers: topUsersRes.data ?? [],
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[api/stats] Error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
