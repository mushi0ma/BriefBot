import { NextResponse } from "next/server";
import { validateInitData } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/history — returns the authenticated user's brief history.
 * Validates initData, extracts user.id, and queries only that user's records.
 */
export async function GET(request: Request) {
    try {
        const initData = request.headers.get("Authorization") ?? "";
        const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";

        const user = validateInitData(initData, botToken);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sb = getSupabaseAdmin();
        const { data, error } = await sb
            .from("brief_history")
            .select("id, template_slug, processing_state, brief_data, pdf_url, processing_time_ms, created_at")
            .eq("telegram_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) {
            console.error("Supabase error:", error);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        return NextResponse.json({ briefs: data ?? [], user_id: user.id });
    } catch (err) {
        console.error("History API error:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
