import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const exchange = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession: exchange } }) }));
import { GET } from "@/app/auth/callback/route";
beforeEach(() => { vi.resetAllMocks(); });
it("exchanges PKCE codes and ignores arbitrary return destinations", async () => {
  exchange.mockResolvedValue({ error: null });
  const response = await GET(new NextRequest("https://preview.example/auth/callback?code=fictional-test-code&next=https://other.example"));
  expect(response.headers.get("location")).toBe("https://preview.example/auth/setup");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
});
it("fails safely for absent or expired codes without returning them", async () => {
  exchange.mockResolvedValue({ error: { code: "otp_expired" } });
  for (const suffix of ["", "?code=fictional-expired-code"]) {
    const response = await GET(new NextRequest("https://preview.example/auth/callback" + suffix));
    expect(response.headers.get("location")).toBe("https://preview.example/auth/setup?invalid=1");
  }
});
