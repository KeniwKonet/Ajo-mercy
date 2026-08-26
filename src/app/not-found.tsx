import Link from "next/link";
import { Container, Display } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main id="main" className="flex flex-1 items-center">
        <Container width="editorial" className="py-20">
          <p className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">404</p>
          <Display size="md" className="mt-3">
            That page is not here.
          </Display>
          <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
            It may have been a business profile that is no longer live. Profiles come down when a
            business asks us to remove it, or when we suspend one.
          </p>
          <div className="mt-8 flex flex-wrap gap-5">
            <Link href="/" className="link-rule font-medium text-ink">
              Home
            </Link>
            <Link href="/alajos" className="link-rule font-medium text-ink">
              Browse businesses
            </Link>
            <Link href="/contact" className="link-rule font-medium text-ink">
              Contact us
            </Link>
          </div>
        </Container>
      </main>
    </div>
  );
}
