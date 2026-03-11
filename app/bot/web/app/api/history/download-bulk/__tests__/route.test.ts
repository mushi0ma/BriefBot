import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from "../route";
import * as auth from "@/lib/auth";
import * as supabase from "@/lib/supabase";

// Mock dependencies
vi.mock("@/lib/auth");
vi.mock("@/lib/supabase");

describe("POST /api/history/download-bulk", () => {
    let mockReq: Request;
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis()
        };
        (supabase.getSupabaseAdmin as any).mockReturnValue(mockSupabase);

        mockReq = {
            headers: new Headers({ Authorization: "test-auth-data" }),
            json: vi.fn().mockResolvedValue({ record_ids: ["123e4567-e89b-12d3-a456-426614174000"] }),
        } as unknown as Request;
    });

    it("should return 401 if unauthorized", async () => {
        (auth.validateInitData as any).mockReturnValue(null);
        
        const res = await POST(mockReq);
        const data = await res.json();
        
        expect(res.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if invalid payload", async () => {
        (auth.validateInitData as any).mockReturnValue({ id: 12345 });
        mockReq.json = vi.fn().mockResolvedValue({ record_ids: "not-an-array" });

        const res = await POST(mockReq);
        const data = await res.json();
        
        expect(res.status).toBe(400);
        expect(data.error).toBe("Invalid payload");
    });

    it("should return empty array if no record_ids given", async () => {
        (auth.validateInitData as any).mockReturnValue({ id: 12345 });
        mockReq.json = vi.fn().mockResolvedValue({ record_ids: [] });

        const res = await POST(mockReq);
        const data = await res.json();
        
        expect(res.status).toBe(200);
        expect(data.urls).toEqual([]);
    });

    it("should retrieve valid URLs and mark them as downloaded", async () => {
        (auth.validateInitData as any).mockReturnValue({ id: 12345 });
        
        // Mock fetch response chain
        mockSupabase.not.mockResolvedValueOnce({
            data: [
                { id: "123e4567-e89b-12d3-a456-426614174000", pdf_url: "http://example.com/doc.pdf", title: "Doc" }
            ],
            error: null
        });

        // The first .eq is in the select chain, returns mockSupabase
        mockSupabase.eq.mockReturnValueOnce(mockSupabase);
        // The second .eq is in the update chain, returns a promise resolving with error: null
        mockSupabase.eq.mockResolvedValueOnce({ error: null });

        const res = await POST(mockReq);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.urls).toEqual([
            { id: "123e4567-e89b-12d3-a456-426614174000", url: "http://example.com/doc.pdf", title: "Doc" }
        ]);

        // Ensure update was called with is_downloaded: true
        expect(mockSupabase.update).toHaveBeenCalledWith({ is_downloaded: true });
        expect(mockSupabase.in).toHaveBeenCalledWith("id", ["123e4567-e89b-12d3-a456-426614174000"]);
        expect(mockSupabase.eq).toHaveBeenCalledWith("telegram_id", 12345);
    });

    it("should return 500 on database error", async () => {
        (auth.validateInitData as any).mockReturnValue({ id: 12345 });
        mockSupabase.not.mockResolvedValueOnce({ data: null, error: { message: "DB Error" } });

        const res = await POST(mockReq);
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toBe("Database error");
    });
});

