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

  /**
   * Content is visible until we have proven we can reveal it.
   *
   * Hiding first and revealing on scroll means anything that never receives an
   * intersection callback stays invisible for good: a print, a screenshot, a
   * browser that fires nothing because the page never scrolls. So the element
   * renders plainly, and only arms itself once mounted and only if it is
   * genuinely below the fold, where nobody can see it change.
   */
  const [armed, setArmed] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") return;

    const box = node.getBoundingClientRect();
    // Already on screen, or the page is not tall enough to scroll to it.
    if (box.top < window.innerHeight) return;

    setArmed(true);

    /**
     * Failsafe.
     *
     * An observer that never fires leaves the content hidden for good. That
     * happens in more situations than it sounds: a full-page screenshot, a
     * print, a page tall enough that the section is never scrolled into view.
     * So the reveal runs on its own after a short wait regardless, and a real
     * scroll simply gets there first.
     */
    const failsafe = setTimeout(() => setSeen(true), 1200);

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
    return () => {
      clearTimeout(failsafe);
      observer.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={ref as never}
      data-seen={seen || undefined}
      style={delay && armed ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(armed && "on-view", className)}
    >
      {children}
    </Tag>
  );
}
