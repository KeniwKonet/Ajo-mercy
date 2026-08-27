"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Alert, Button } from "@/components/ui/primitives";

/**
 * Admin needs a different error page from the public site.
 *
 * A reviewer's worry is not "did I break something" but "is the queue I am
 * looking at trustworthy". The one thing this must say is: do not treat what
 * you last saw as complete. A silently empty queue is how a real application
 * sat unreviewed once already.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] route error", error.digest ?? "", error.message);
  }, [error]);

  return (
    <div className="px-5 py-10 sm:px-8">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl">This screen failed to load</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            The page threw before it finished. Nothing was changed by this, and no decision was
            recorded.
          </p>
        </div>

        <Alert tone="attention" title="Do not treat the last screen as up to date">
          A failure here is not the same as an empty queue. There may be applications, selections or
          confirmations waiting that were not shown. Reload before acting on what you saw.
        </Alert>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={reset}>Reload this screen</Button>
          <Link href="/admin" className="link-rule text-sm font-medium text-ink">
            Back to the dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="border-t border-rule pt-4 font-mono text-2xs text-ink-faint">
            Reference {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
