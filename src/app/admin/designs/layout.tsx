import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { DesignSwitcher } from "@/components/designs/switcher";
import { DASHBOARD_VERSIONS } from "@/components/designs/versions";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Dashboard explorations. Still behind the staff check: these read real
 * platform data, so they must not be reachable by a signed-out visitor even in
 * development. They sit outside the (console) route group so they render
 * full-bleed instead of inside the real admin shell.
 */
export default async function AdminDesignsLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_ROUTES !== "true") {
    notFound();
  }
  await requireStaff();

  return (
    <>
      <main id="main">{children}</main>
      <DesignSwitcher base="/admin/designs" versions={DASHBOARD_VERSIONS} />
    </>
  );
}
