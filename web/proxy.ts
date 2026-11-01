import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/supabase/navigation";

/**
 * Refreshes the Supabase session cookie and redirects unauthenticated users
 * away from app routes. This is a UX gate only — every server action and
 * service re-verifies the user and membership (defense in depth).
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const isLogin = request.nextUrl.pathname === "/login";
  if (!url || !anonKey) {
    return isLogin ? response : new NextResponse("Authentication is temporarily unavailable", { status: 503 });
  }

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  const authenticated = !error && !!data.user;
  let destination: URL | null = null;
  if (!isLogin && !authenticated) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    destination = login;
  } else if (isLogin && authenticated) {
    destination = new URL(safeReturnPath(request.nextUrl.searchParams.get("next")), request.url);
  }
  if (destination) {
    const redirect = NextResponse.redirect(destination);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    for (const name of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(name);
      if (value) redirect.headers.set(name, value);
    }
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|images/|api/webhooks/|api/cron/|api/health).*)"],
};
