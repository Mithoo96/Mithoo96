import "server-only";
import { unauthenticated } from "@/core/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The verified user id for this request. Uses auth.getUser(), which validates
 * the session with Supabase Auth — never trust a client-supplied user id.
 */
export async function getSessionUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw unauthenticated();
  return data.user.id;
}

export async function getOptionalSessionUserId(): Promise<string | null> {
  try {
    return await getSessionUserId();
  } catch {
    return null;
  }
}
