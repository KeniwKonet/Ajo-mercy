import { notFound } from "next/navigation";
import { DesignSwitcher } from "@/components/designs/switcher";
import { LANDING_VERSIONS } from "@/components/designs/versions";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Design explorations. The middleware 404s this whole subtree in production
 * unless ENABLE_DESIGN_ROUTES is set, and this is a second check in case the
 * route is reached some other way.
 */
export default function DesignsLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_ROUTES !== "true") {
    notFound();
  }

  return (
    <>
      <main id="main">{children}</main>
      <DesignSwitcher base="/designs" versions={LANDING_VERSIONS} />
    </>
  );
}
