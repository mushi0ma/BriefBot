import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import * as auth from "@/lib/auth";
import * as supabaseLib from "@/lib/supabase";

vi.mock("@/lib/auth");
vi.mock("@/lib/supabase");

describe("GET /api/history", () => {
  const mockUser = { id: 12345 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSelect: any, mockEq: any, mockOr: any, mockOrder: any, mockLimit: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLimit = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
    mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    mockOr = vi.fn().mockReturnValue({ order: mockOrder });
    mockEq = vi.fn().mockReturnValue({ order: mockOrder, or: mockOr });
    mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseLib.getSupabaseAdmin as any).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: mockSelect }),
    });
  });

  it("should return 401 if unauthorized", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.validateInitData as any).mockReturnValue(null);
    const req = new Request("http://localhost/api/history");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should query history without search query", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.validateInitData as any).mockReturnValue(mockUser);
    const req = new Request("http://localhost/api/history");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockEq).toHaveBeenCalledWith("telegram_id", mockUser.id);
    expect(mockOr).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json.briefs).toHaveLength(1);
  });

  it("should query history with search query", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.validateInitData as any).mockReturnValue(mockUser);
    const req = new Request("http://localhost/api/history?query=test");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockEq).toHaveBeenCalledWith("telegram_id", mockUser.id);
    expect(mockOr).toHaveBeenCalledWith("title.ilike.%test%,template_slug.ilike.%test%");
  });

  it("should return 500 on db error", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (auth.validateInitData as any).mockReturnValue(mockUser);
    mockLimit.mockResolvedValueOnce({ data: null, error: new Error("DB Error") });

    const req = new Request("http://localhost/api/history");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
