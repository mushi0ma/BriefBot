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

        // 1. Fetch dashboard stats via the new RPC function
        const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats');
        
        if (statsError) {
            console.error("[api/stats] RPC Error:", statsError);
            throw new Error("Failed to fetch dashboard stats");
        }

        // 2. Fetch recent Top 50 Users for the UsersTab
        const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, telegram_id, username, first_name, last_name, briefs_count, updated_at")
            .order("briefs_count", { ascending: false })
            .limit(50);
            
        if (usersError) {
            console.error("[api/stats] Users Query Error:", usersError);
            throw new Error("Failed to fetch recent users");
        }

        return NextResponse.json({
            stats: statsData, // total_briefs, active_users, api_errors, pdf_exports, saved_templates, avg_gen_time_ms, generation_volume
            users: usersData, // array of users for the UsersTab
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
