import { NextResponse } from "next/server";
import { validateInitData } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { SettingsPatchSchema } from "@/lib/schemas/settings";

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
            .select("brand_color, logo_url, default_template, include_assessment, include_keywords, include_summary, include_competitors, include_tone")
            .eq("telegram_id", user.id)
            .limit(1)
            .single();

        if (error) {
            return NextResponse.json(
                {
                    brand_color: null,
                    logo_url: null,
                    default_template: "default",
                    include_assessment: true,
                    include_keywords: true,
                    include_summary: true,
                    include_competitors: true,
                    include_tone: true
                }
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
 * Uses Zod schema for input validation (Fail Fast).
 */
export async function PATCH(request: Request) {
    try {
        const initData = request.headers.get("Authorization") ?? "";
        const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";

        const user = validateInitData(initData, botToken);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse JSON body — fail fast on malformed JSON
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON body" },
                { status: 400 }
            );
        }

        // Zod validation — fail fast with structured errors
        const parsed = SettingsPatchSchema.safeParse(body);
        if (!parsed.success) {
            const fieldErrors = parsed.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));
            return NextResponse.json(
                { error: "Validation failed", details: fieldErrors },
                { status: 400 }
            );
        }

        const updateData = parsed.data;

        // Check at least one field is present
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 }
            );
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
