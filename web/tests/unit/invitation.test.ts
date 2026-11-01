import { expect, it } from "vitest";
import { invitationGrant } from "@/lib/supabase/invitation";
it("accepts only this project's HTTPS invitation grants", () => {
  const origin = "https://example.supabase.co";
  expect(invitationGrant(origin + "/auth/v1/verify?token=fictional-test-token-only&type=invite", origin)).toEqual({ token_hash: "fictional-test-token-only", type: "invite" });
  for (const url of [
    "https://other.example/auth/v1/verify?token=fictional-test-token-only&type=invite",
    origin + "/auth/v1/verify?token=fictional-test-token-only&type=email",
    origin + "/auth/v1/verify?token=fictional-test-token-only&type=invite&type=recovery",
    origin + "/other?token=fictional-test-token-only&type=invite",
    "http://example.supabase.co/auth/v1/verify?token=fictional-test-token-only&type=invite",
  ]) expect(() => invitationGrant(url, origin)).toThrow("Invalid invitation link");
});
