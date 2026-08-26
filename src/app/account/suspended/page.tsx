import type { Metadata } from "next";
import Link from "next/link";
import { Container, Display } from "@/components/ui/primitives";
import { getSessionProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Account suspended",
  robots: { index: false, follow: false },
};

export default async function SuspendedPage() {
  const profile = await getSessionProfile();

  return (
    <div className="flex min-h-dvh flex-col">
      <main id="main" className="flex flex-1 items-center">
        <Container width="editorial" className="py-20">
          <p className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
            Account suspended
          </p>
          <Display size="md" className="mt-3">
            This account is on hold.
          </Display>
          <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
            {profile?.suspension_reason
              ? profile.suspension_reason
              : "We have paused this account while we look into something. Your data has not been deleted."}
          </p>
          <p className="mt-4 max-w-md leading-relaxed text-ink-soft">
            If you think this is a mistake, reply to the email we sent or get in touch, and a person
            will look at it.
          </p>
          <div className="mt-8 flex flex-wrap gap-5">
            <Link href="/contact" className="link-rule font-medium text-ink">
              Contact us
            </Link>
            <Link href="/" className="link-rule font-medium text-ink">
              Home
            </Link>
          </div>
        </Container>
      </main>
    </div>
  );
}
