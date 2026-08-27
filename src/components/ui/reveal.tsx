"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/primitives";

/**
 * Reveals a section the first time it is scrolled to, then stops watching.
 *
 * The page previously animated everything on load, which meant the parts below
 * the fold had already finished by the time anyone reached them. This ties the
 * movement to arriving at the content, which is the only thing it can honestly
 * signal.
 *
 * If IntersectionObserver is unavailable the content is shown immediately.
 * Nothing here may ever be the reason text does not appear.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Small stagger for siblings. Keep under ~150ms or it reads as lag. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setSeen(true);
            observer.disconnect();
          }
        }
      },
      // Start a little before the element reaches the viewport so the movement
      // has finished by the time it is properly in view.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-seen={seen || undefined}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn("on-view", className)}
    >
      {children}
    </Tag>
  );
}
