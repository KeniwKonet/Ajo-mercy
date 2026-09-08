"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { deleteMediaAction, registerMediaAction } from "@/app/dashboard/alajo/actions";
import { publicMediaUrl } from "@/lib/data/media-url";
import { Alert, Button, cn } from "@/components/ui/primitives";
import { formatBytes } from "@/lib/format";
import {
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  validateFile,
} from "@/lib/validation/schemas";
import type { AlajoMedia, DocumentType, MediaKind } from "@/lib/types";

const ACCEPT: Record<MediaKind, readonly string[]> = {
  profile_photo: ALLOWED_IMAGE_TYPES,
  business_photo: ALLOWED_IMAGE_TYPES,
  video: ALLOWED_VIDEO_TYPES,
  document: ALLOWED_DOCUMENT_TYPES,
};

/**
 * Uploads straight from the browser to Supabase Storage, then asks the server
 * to register the row. Routing a 25 MB video through a server action would be
 * slow and would hit body size limits; the storage policy and the server-side
 * re-check in `registerMediaAction` are what keep this safe.
 */
export function MediaUploader({
  kind,
  documentType,
  label,
  description,
  existing,
  multiple = false,
  disabled = false,
  onChange,
}: {
  kind: MediaKind;
  documentType?: DocumentType;
  label: string;
  description: string;
  existing: AlajoMedia[];
  multiple?: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AlajoMedia[]>(existing);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const atLimit = !multiple && items.length >= 1;

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const files = Array.from(fileList).slice(0, multiple ? 6 : 1);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session has expired. Refresh the page and sign in again.");
      return;
    }

    for (const file of files) {
      const check = validateFile(kind, file.type, file.size);
      if (!check.ok) {
        setError(check.message);
        continue;
      }

      setProgress(`Uploading ${file.name}…`);
      const bucket = kind === "document" ? "alajo-documents" : "alajo-public";
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "bin";
      const path = `${user.id}/${kind}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setProgress(null);
        setError(uploadError.message);
        continue;
      }

      const result = await registerMediaAction({
        kind,
        documentType,
        storagePath: path,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      setProgress(null);

      if (!result.ok || !result.data) {
        // Registration failed, so remove the orphaned object rather than
        // leaving a file nothing points at.
        await supabase.storage.from(bucket).remove([path]);
        setError(result.message ?? "Could not save that file.");
        continue;
      }

      setItems((current) => (multiple ? [...current, result.data!] : [result.data!]));
      onChange?.();
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await deleteMediaAction(id);
      if (result.ok) {
        setItems((current) => current.filter((item) => item.id !== id));
        onChange?.();
      } else {
        setError(result.message ?? "Could not remove that file.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">{description}</p>
      </div>

      {error && <Alert tone="negative">{error}</Alert>}

      {items.length > 0 && (
        <ul className={cn("grid gap-3", multiple ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1")}>
          {items.map((item) => {
            const url = kind === "document" ? null : publicMediaUrl(item.storage_path);
            return (
              <li key={item.id} className="relative widget !p-0">
                {url ? (
                  <div className="relative aspect-[4/3] bg-widget-black-2">
                    <Image
                      src={url}
                      alt={item.caption ?? label}
                      fill
                      sizes="220px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-4">
                    <svg viewBox="0 0 16 16" className="size-5 shrink-0 text-ink-faint" aria-hidden="true">
                      <path
                        d="M9 1.5H4.5A1.5 1.5 0 0 0 3 3v10A1.5 1.5 0 0 0 4.5 14.5h7A1.5 1.5 0 0 0 13 13V5.5L9 1.5Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </svg>
                    <span className="min-w-0 flex-1 truncate text-xs text-ink">
                      {item.document_type?.replace(/_/g, " ") ?? "Document"}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 border-t border-rule px-2 py-1.5">
                  <span className="text-2xs text-ink-faint tabular">{formatBytes(item.size_bytes)}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      disabled={pending}
                      className="text-2xs font-medium text-danger hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!disabled && !atLimit && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT[kind].join(",")}
            multiple={multiple}
            onChange={(event) => void handleFiles(event.target.files)}
            className="sr-only"
            id={`upload-${kind}-${documentType ?? "default"}`}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
            loading={Boolean(progress)}
          >
            {progress ?? (items.length > 0 ? "Add another" : "Choose file")}
          </Button>
        </div>
      )}
    </div>
  );
}
