"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client. RLS makes it read-only and tenant-scoped. */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured");
  return createBrowserClient(url, anonKey, { cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production" } });
}

/** Invitation fragments use an implicit grant; verify them explicitly, without PKCE auto-detection. */
export function createSupabaseSetupClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured");
  return createBrowserClient(url, anonKey, {
    isSingleton: false,
    auth: { detectSessionInUrl: false },
    cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production" },
  });
}
