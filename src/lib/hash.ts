import "server-only";

import { createHash } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * IPs and device fingerprints are only ever stored hashed. We need to be able
 * to spot "same actor, many selections" without holding raw identifiers.
 */
export function stableHash(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(`${serverEnv().HASH_SALT}:${value}`).digest("hex").slice(0, 32);
}
