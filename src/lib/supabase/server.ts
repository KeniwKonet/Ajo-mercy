import "server-only";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Request-scoped client that acts as the signed-in user. Use this for anything
 * a user is allowed to do themselves so RLS stays in the loop.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render, where cookies are readonly.
            // Middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}
