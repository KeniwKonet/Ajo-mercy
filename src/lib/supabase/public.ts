import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

let cached: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Anonymous, cookie-free client for content anyone may read.
 *
 * Reading cookies would opt every page that touches this into dynamic
 * rendering. The public site is the surface most likely to be hit hard at
 * launch, so it reads as the `anon` role and stays statically cacheable —
 * RLS still decides what `anon` can see, which is approved profiles only.
 */
export function createPublicSupabase() {
  if (cached) return cached;
  cached = createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return cached;
}
