import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Check your email</h1>
      <p className="text-base leading-relaxed text-ink-soft">
        We sent a confirmation link{email ? <> to <strong className="text-ink">{email}</strong></> : null}.
        Open it and your account is active.
      </p>

      <Alert tone="attention" title="Not arrived?">
        Give it a couple of minutes, then check your spam or promotions folder. The
        sender is Ajo Mercy.
      </Alert>

      <div className="space-y-2 border-t border-rule pt-6 text-sm text-ink-soft">
        <p>
          Wrong address?{" "}
          <Link href="/register" className="link-rule font-medium text-ink">
            Register again
          </Link>
        </p>
        <p>
          Already confirmed?{" "}
          <Link href="/login" className="link-rule font-medium text-ink">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
