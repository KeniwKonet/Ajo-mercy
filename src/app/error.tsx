"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Container } from "@/components/ui/primitives";

/**
 * The page shown when a route throws.
 *
 * Without this file Next renders its own unstyled error screen, which on this
 * product is worse than it sounds: someone halfway through an application sees
 * a blank page with no indication that their work is safe. So this says three
 * things in order — what happened, what is still true, and what to do next.
 *
 * It deliberately does not show the stack. The digest is enough to find the
 * fault in the server logs, and an error message can carry data the visitor
 * should not see.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] route error", error.digest ?? "", error.message);
  }, [error]);

  return (
    <Container className="py-20 sm:py-28">
      <div className="max-w-xl">
        <p className="font-mono text-2xs uppercase tracking-[0.14em] text-terracotta">
          Something broke
        </p>
        <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
          This page did not load.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink-soft">
          The fault is on our side, not yours. Nothing you had already saved has been lost, and no
          application or account has been changed by this.
        </p>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          Anything you had typed but not yet sent is still in this browser and will come back when
          the page loads again.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/" className="link-rule text-sm font-medium text-ink">
            Go to the home page
          </Link>
          <Link href="/contact" className="link-rule text-sm text-ink-soft hover:text-ink">
            Tell us what happened
          </Link>
        </div>

        {error.digest && (
          <p className="mt-10 border-t border-rule pt-5 font-mono text-2xs text-ink-faint">
            Reference {error.digest}. Quote this if you get in touch and we can find the exact fault.
          </p>
        )}
      </div>
    </Container>
  );
}
