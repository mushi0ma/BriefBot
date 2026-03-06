import { NextResponse } from "next/server";
import { validateInitData } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings — returns user's branding settings.
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
            .from("users")
            .select("brand_color, logo_url, default_template")
            .eq("telegram_id", user.id)
            .limit(1)
            .single();

        if (error) {
            return NextResponse.json(
                { brand_color: null, logo_url: null, default_template: "default" }
            );
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error("Settings GET error:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

/**
 * PATCH /api/settings — updates user's branding settings.
 * Accepts: { brand_color?: string, logo_url?: string, default_template?: string }
 */
export async function PATCH(request: Request) {
    try {
        const initData = request.headers.get("Authorization") ?? "";
        const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";

        const user = validateInitData(initData, botToken);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const updateData: Record<string, string> = {};

        if (body.brand_color && /^#[0-9A-Fa-f]{6}$/.test(body.brand_color)) {
            updateData.brand_color = body.brand_color;
        }
        if (body.logo_url && typeof body.logo_url === "string") {
            updateData.logo_url = body.logo_url.slice(0, 500); // limit URL length
        }
        if (body.default_template && typeof body.default_template === "string") {
            updateData.default_template = body.default_template;
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        const sb = getSupabaseAdmin();
        const { error } = await sb
            .from("users")
            .update(updateData)
            .eq("telegram_id", user.id);

        if (error) {
            console.error("Supabase update error:", error);
            return NextResponse.json({ error: "Update failed" }, { status: 500 });
        }

        return NextResponse.json({ ok: true, updated: updateData });
    } catch (err) {
        console.error("Settings PATCH error:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
