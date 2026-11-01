import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** PKCE callbacks have a fixed local destination; invitation fragments go directly to /auth/setup. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let valid = false;
  try {
    if (code) {
      const client = await createSupabaseServerClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      valid = !error;
    }
  } catch { /* Do not log auth codes, tokens or upstream error details. */ }
  const response = NextResponse.redirect(new URL(valid ? "/auth/setup" : "/auth/setup?invalid=1", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
