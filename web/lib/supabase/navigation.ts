/** Constrain post-login navigation to this application. */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://mithoo.invalid");
    if (url.origin !== "https://mithoo.invalid" || url.pathname === "/login" || url.pathname.startsWith("/api/")) return "/";
    return url.pathname + url.search;
  } catch { return "/"; }
}
