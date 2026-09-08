"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/components/ui/primitives";
import { businessArt } from "@/lib/business-art";

/**
 * A business photograph that fails quietly.
 *
 * Storage objects go missing: a file is removed, a bucket policy changes, a
 * path is stale. When that happens the browser renders the alt text beside a
 * broken-image icon, which on the lead card of the homepage looks like the
 * site itself is broken.
 *
 * So a load error falls back to what a business with no photograph gets:
 * generated cover art with the monogram over it. The slot stays filled and the
 * page reads as "no picture yet", which is true, rather than as a fault.
 *
 * The art is abstract on purpose. A stock photograph of a real person on a
 * named business would be inventing that business owner.
 */
export function BusinessPhoto({
  src,
  alt,
  monogram,
  seed,
  sizes,
  priority,
  className,
}: {
  src: string | null;
  alt: string;
  monogram: string;
  /** Stable per business, so the same business always draws the same art. */
  seed: string;
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
        <div
          className="absolute inset-0 grid place-items-center bg-cover bg-center"
          style={{ backgroundImage: `url("${businessArt(seed)}")` }}
        >
          <span
            className="text-4xl font-extrabold tracking-tight text-ivory-text/70"
            aria-hidden="true"
          >
            {monogram}
          </span>
        </div>
      )}
    </div>
  );
}
