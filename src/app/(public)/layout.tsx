import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { MobileNav } from "@/components/site/mobile-nav";

/**
 * No session read here on purpose. The header resolves the signed-in state in
 * the browser so every public page can be statically cached and served from the
 * edge, which is what matters when a viral post sends traffic all at once.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <MobileNav />
      <div aria-hidden="true" className="h-14 md:hidden" />
    </div>
  );
}
