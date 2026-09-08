import type { Metadata } from "next";
import Link from "next/link";
import { Container, Display } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Not allowed",
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main id="main" className="flex flex-1 items-center">
        <Container width="editorial" className="py-20">
          <p className="text-2xs font-extrabold uppercase tracking-[0.08em] text-ink-faint">403</p>
          <Display size="md" className="mt-3">
            You do not have access to that.
          </Display>
          <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
            Either that page belongs to a different kind of account, or your account has not been
            approved for it yet. If you think this is wrong, tell us and we will look.
          </p>
          <div className="mt-8 flex flex-wrap gap-5">
            <Link href="/" className="link-rule font-medium text-ink">
              Home
            </Link>
            <Link href="/login" className="link-rule font-medium text-ink">
              Sign in with a different account
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
