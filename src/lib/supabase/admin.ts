import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

let cached: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Service-role client. Bypasses RLS, so it must only be reached from code that
 * has already checked authorisation with `requireStaff` / `requireRole`.
 * Never import this from a client component.
 */
export function createAdminSupabase() {
  if (cached) return cached;
  cached = createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
