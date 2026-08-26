import "server-only";

import { headers } from "next/headers";
import { stableHash } from "@/lib/hash";

export interface RequestContext {
  ip: string | null;
  ipHash: string | null;
  userAgent: string | null;
  deviceHash: string | null;
}

/** Never trust a single header; take the first hop we can defend. */
export async function getRequestContext(): Promise<RequestContext> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    (forwarded ? (forwarded.split(",")[0] ?? "").trim() || null : null);
  const userAgent = h.get("user-agent");

  return {
    ip,
    ipHash: stableHash(ip),
    userAgent,
    // Coarse device signal. Not a precise fingerprint by design: enough to
    // notice one machine mass-registering, not enough to track a person.
    deviceHash: stableHash([userAgent, h.get("accept-language"), h.get("sec-ch-ua")].filter(Boolean).join("|")),
  };
}
