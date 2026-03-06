/**
 * GET /api/stats — Admin dashboard statistics endpoint.
 * Validates Telegram initData before returning Supabase metrics.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateInitData } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
    // 1. Extract & validate initData
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

        // 2. Fetch user stats
        const { count: totalUsers } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true });

        // 3. Fetch brief stats
        const { count: totalBriefs } = await supabase
            .from("brief_history")
            .select("*", { count: "exact", head: true });

        const today = new Date().toISOString().split("T")[0];
        const { count: todayBriefs } = await supabase
            .from("brief_history")
            .select("*", { count: "exact", head: true })
            .gte("created_at", `${today}T00:00:00+00:00`);

        const { count: successfulBriefs } = await supabase
            .from("brief_history")
            .select("*", { count: "exact", head: true })
            .eq("processing_state", "done");

        const { count: failedBriefs } = await supabase
            .from("brief_history")
            .select("*", { count: "exact", head: true })
            .eq("processing_state", "failed");

        // 4. Recent errors (last 5)
        const { data: recentErrors } = await supabase
            .from("brief_history")
            .select("id, telegram_id, error_message, created_at")
            .eq("processing_state", "failed")
            .order("created_at", { ascending: false })
            .limit(5);

        // 5. Top users (top 5 by briefs_count)
        const { data: topUsers } = await supabase
            .from("users")
            .select("telegram_id, username, first_name, briefs_count")
            .order("briefs_count", { ascending: false })
            .limit(5);

        const successRate =
            totalBriefs && totalBriefs > 0
                ? Math.round(((successfulBriefs ?? 0) / totalBriefs) * 100)
                : 0;

        return NextResponse.json({
            users: {
                total: totalUsers ?? 0,
            },
            briefs: {
                total: totalBriefs ?? 0,
                today: todayBriefs ?? 0,
                successful: successfulBriefs ?? 0,
                failed: failedBriefs ?? 0,
                successRate,
            },
            recentErrors: recentErrors ?? [],
            topUsers: topUsers ?? [],
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
