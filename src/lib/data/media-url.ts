import { publicEnv } from "@/lib/env";

/**
 * Lives apart from `@/lib/data/alajos` because that module is server-only and
 * the uploader needs this in the browser.
 */
export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/alajo-public/${path}`;
}
