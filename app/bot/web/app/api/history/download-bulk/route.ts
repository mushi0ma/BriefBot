import { NextResponse } from "next/server";
import { validateInitData } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BulkDownloadSchema = z.object({
    record_ids: z.array(z.string().uuid()),
});

export async function POST(request: Request) {
    try {
        const initData = request.headers.get("Authorization") ?? "";
        const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";

        const user = validateInitData(initData, botToken);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const parsed = BulkDownloadSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const { record_ids } = parsed.data;
        if (record_ids.length === 0) {
            return NextResponse.json({ urls: [] });
        }

        const sb = getSupabaseAdmin();
        
        // 1. Fetch URLs ensuring the user owns them
        const { data: records, error: fetchError } = await sb
            .from("brief_history")
            .select("id, pdf_url, title")
            .eq("telegram_id", user.id)
            .in("id", record_ids)
            .not("pdf_url", "is", null);

        if (fetchError) {
            console.error("Supabase fetch error:", fetchError);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
        }

        if (!records || records.length === 0) {
            return NextResponse.json({ urls: [] });
        }

        const validIds = records.map(r => r.id);

        // 2. Mark them as downloaded
        const { error: updateError } = await sb
            .from("brief_history")
            .update({ is_downloaded: true })
            .in("id", validIds)
            .eq("telegram_id", user.id); // extra safety

        if (updateError) {
            console.error("Supabase update error:", updateError);
            // We can still return the URLs even if update failed non-critically, but let's log it
        }

        // Return array of objects { id, url, title }
        const urls = records.map(r => ({
            id: r.id,
            url: r.pdf_url,
            title: r.title || "Document"
        }));

        return NextResponse.json({ urls });
    } catch (err) {
        console.error("Bulk download API error:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
