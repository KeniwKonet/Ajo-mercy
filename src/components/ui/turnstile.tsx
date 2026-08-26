"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { publicEnv } from "@/lib/env";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

/**
 * Renders the Turnstile challenge and writes its token into a hidden input so
 * it travels with the surrounding form. When Turnstile is not configured the
 * component renders nothing and the server skips verification, which keeps
 * local development usable without weakening production.
 */
export function Turnstile({ onToken }: { onToken?: (token: string) => void }) {
  const siteKey = publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const fieldId = useId();

  useEffect(() => {
    if (!siteKey || !ready || !containerRef.current || widgetIdRef.current) return;
    const turnstile = window.turnstile;
    if (!turnstile) return;

    widgetIdRef.current = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "light",
      callback: (value) => {
        setToken(value);
        onToken?.(value);
      },
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });

    return () => {
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, ready, onToken]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        onReady={() => setReady(true)}
      />
      <div ref={containerRef} id={fieldId} className="min-h-[65px]" />
      <input type="hidden" name="turnstileToken" value={token} />
    </>
  );
}
