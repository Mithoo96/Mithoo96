import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/core/errors";

/**
 * Service-role Supabase client — SERVER ONLY. Used for Storage signed URLs
 * after the application has authorized the request itself. Never expose.
 */
let admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new DomainError("INTEGRATION_NOT_CONFIGURED", "Supabase storage is not configured");
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
