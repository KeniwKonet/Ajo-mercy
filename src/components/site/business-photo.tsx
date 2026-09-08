"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/components/ui/primitives";

/**
 * A business photograph that fails quietly.
 *
 * Storage objects go missing: a file is removed, a bucket policy changes, a
 * path is stale. When that happens the browser renders the alt text beside a
 * broken-image icon, which on the lead card of the homepage looks like the
 * site itself is broken.
 *
 * So a load error falls back to the same monogram used when there is no
 * photograph at all. The page then reads as "no picture yet", which is true,
 * rather than as a fault.
 */
export function BusinessPhoto({
  src,
  alt,
  monogram,
  sizes,
  priority,
  className,
}: {
  src: string | null;
  alt: string;
  monogram: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className={cn("relative overflow-hidden rounded-md bg-widget-black-2", className)}>
      {showImage ? (
        <Image
          src={src as string}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized
          priority={priority}
          onError={() => setFailed(true)}
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-4xl text-rule-strong" aria-hidden="true">
            {monogram}
          </span>
        </div>
      )}
    </div>
  );
}
