"use client";

import { useEffect, useState } from "react";

/**
 * Tells someone their typing is being kept, and lets them throw it away.
 *
 * A draft that restores silently is unsettling: people wonder why old text is
 * in the box and whether anyone else can see it. So this says where the draft
 * lives (this browser), and always offers a way out.
 */
export function DraftNotice({
  savedAt,
  restored,
  onDiscard,
}: {
  savedAt: number | null;
  restored: boolean;
  onDiscard: () => void;
}) {
  // Rendered only after mount so the server and client markup agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || savedAt === null) return null;

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
      <span>
        {restored
          ? "Restored what you had typed here before."
          : "Saved in this browser as you type."}
      </span>
      <span aria-hidden className="text-rule-strong">
        ·
      </span>
      <span>Only on this device. It is not submitted until you send it.</span>
      <button
        type="button"
        onClick={onDiscard}
        className="link-rule font-medium text-ink-soft hover:text-terracotta"
      >
        Discard draft
      </button>
    </p>
  );
}
