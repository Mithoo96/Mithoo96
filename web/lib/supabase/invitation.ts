/** Parse only this project's Supabase invitation URL; never follow its redirect destination. */
export function invitationGrant(value: string, supabaseUrl: string): { token_hash: string; type: "invite" | "recovery" } {
  const url = new URL(value.trim());
  const type = url.searchParams.get("type");
  const token = url.searchParams.get("token");
  if (url.protocol !== "https:" || url.origin !== new URL(supabaseUrl).origin || url.username || url.password || url.pathname !== "/auth/v1/verify"
    || url.searchParams.getAll("token").length !== 1 || url.searchParams.getAll("type").length !== 1
    || (type !== "invite" && type !== "recovery") || !token || !/^[A-Za-z0-9_-]{16,512}$/.test(token)) {
    throw new Error("Invalid invitation link");
  }
  return { token_hash: token, type };
}
