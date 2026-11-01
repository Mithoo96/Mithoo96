import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DomainError } from "@/core/errors";
import { publicSupabaseConfig } from "./env";

/** Supabase client bound to the request cookies (Server Components, Actions, Route Handlers). */
export async function createSupabaseServerClient() {
  const config = publicSupabaseConfig();
  if (!config) throw new DomainError("INTEGRATION_NOT_CONFIGURED", "Supabase Auth is not configured");
  const cookieStore = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there; proxy.ts refreshes sessions.
        }
      },
    },
  });
}
