import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {organizationModules,workspaceRouteEnabled,workspaceRoleRouteEnabled} from "@/core/tenancy/modules";
import {isOrgRole} from "@/core/tenancy/permissions";
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
  const isSignup = request.nextUrl.pathname === "/signup";
  const isLogin = request.nextUrl.pathname === "/login";
  if (["/auth/setup", "/auth/callback"].includes(request.nextUrl.pathname)) {
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  if (!url || !anonKey) {
    return isLogin || isSignup ? response : new NextResponse("Authentication is temporarily unavailable", { status: 503 });
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
  const unavailable=(status:number,message:string)=>{const denied=new NextResponse(message,{status,headers:{"Cache-Control":"private, no-store"}});response.cookies.getAll().forEach(cookie=>denied.cookies.set(cookie));return denied;};
  if(authenticated&&!isLogin&&!isSignup&&request.nextUrl.pathname!=="/onboarding"){
    const membership=await supabase.from("organization_members").select("role,status,organizations(id,status,metadata)").eq("user_id",data.user!.id).eq("status","ACTIVE").order("created_at").order("organization_id");
    if(membership.error)return unavailable(503,"Workspace authorization is temporarily unavailable");
    const memberships=(membership.data??[]).flatMap(m=>{const org=Array.isArray(m.organizations)?m.organizations[0]:m.organizations;return m.status==="ACTIVE"&&isOrgRole(m.role)&&org?.status==="ACTIVE"?[{org,role:m.role}]:[];});
    const selected=memberships.find(m=>m.org.id===request.cookies.get("mithoo_workspace")?.value)??memberships[0];
    if(!selected)destination=new URL("/onboarding",request.url);
    else if(!workspaceRouteEnabled(organizationModules(selected.org.metadata as Record<string,unknown>),request.nextUrl.pathname)||!workspaceRoleRouteEnabled(selected.role,request.nextUrl.pathname))return unavailable(404,"This module is not available for this workspace or role.");
  }

  if (!isLogin && !isSignup && !authenticated) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    destination = login;
  } else if ((isLogin || isSignup) && authenticated) {
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
