import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Refreshes the Supabase session cookie and does a coarse gate on private
 * routes. This is a convenience redirect, not the security boundary: every
 * page and route handler re-checks the role server-side, and RLS re-checks it
 * again in the database.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/account"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (needsAuth && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login);
  }

  // Experimental design routes must not be reachable in production.
  if (pathname.startsWith("/designs") || pathname.startsWith("/admin/designs")) {
    if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_ROUTES !== "true") {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation, which never
     * need a session and would only add latency.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif|gif|ico|woff2?)$).*)",
  ],
};
