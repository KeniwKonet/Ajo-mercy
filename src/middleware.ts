import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Refreshes the Supabase session cookie and does a coarse gate on private
 * routes. This is a convenience redirect, not the security boundary: every
 * page and route handler re-checks the role server-side, and RLS re-checks it
 * again in the database.
 *
 * Two rules keep this from taking the site down:
 *
 *   1. Do the free work first. Design-route gating needs no network, so it
 *      happens before anything can block.
 *   2. Never let the auth server's health decide whether the marketing site
 *      loads. Public pages make no call at all, and the call protected pages
 *      do make is bounded by a timeout. An unreachable auth server sends
 *      someone to the login page; it does not return 504 for the homepage.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/account"];

/**
 * Vercel kills a middleware invocation at 25 seconds. Three is far longer than
 * a healthy `getUser` needs and short enough that a dead endpoint degrades
 * quickly instead of hanging the request.
 */
const AUTH_TIMEOUT_MS = 3000;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------------- free --
  // Experimental design routes must not be reachable in production. This is a
  // pure environment check, so it runs before anything that can block.
  if (pathname.startsWith("/designs") || pathname.startsWith("/admin/designs")) {
    if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_ROUTES !== "true") {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const needsAuth = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // A public page has no reason to ask who is signed in. The header resolves
  // the signed-in state in a client island instead, which keeps these pages
  // cacheable and keeps them up even when auth is down.
  if (!needsAuth) return NextResponse.next({ request });

  // ------------------------------------------------------------ protected --
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

  let user = null;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("auth timeout")), AUTH_TIMEOUT_MS),
    );
    const result = await Promise.race([supabase.auth.getUser(), timeout]);
    user = result.data.user;
  } catch (error) {
    // Unreachable, slow, or misconfigured auth. Treating the caller as signed
    // out is the safe failure: they are sent to the login page rather than
    // into a private route, and the server guards and RLS would refuse them
    // anyway if anything slipped past.
    console.warn("[middleware] auth check failed", (error as Error).message);
  }

  if (!user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(login);
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
