import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";

/**
 * /dashboard is not a page in its own right; it sends people to whichever
 * dashboard belongs to their role. Useful as a stable link in emails and as a
 * landing point after sign-in.
 */
export default async function DashboardIndex() {
  const profile = await requireAuth();
  redirect(homeFor(profile));
}
