"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, cn } from "@/components/ui/primitives";

/**
 * Native <dialog> so focus trapping, Escape and the top layer come from the
 * platform rather than a hand-rolled implementation.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl" };

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-sm border border-rule bg-card p-0 text-ink shadow-panel",
        "backdrop:bg-ink/45 backdrop:backdrop-blur-[1px]",
        widths[size],
      )}
      onClick={(event) => {
        // Clicking the backdrop closes; clicking the panel must not.
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="border-b border-rule px-6 py-4">
        <h2 id="modal-title" className="font-display text-xl">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {children && <div className="px-6 py-5">{children}</div>}
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-rule bg-paper px-6 py-4">{footer}</div>}
    </dialog>
  );
}

/**
 * Confirmation for actions that are hard to undo. Destructive variants require
 * the operator to type the confirmation phrase, which rules out a stray Enter
 * key rejecting somebody's application.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "default",
  requirePhrase,
  pending = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
  requirePhrase?: string;
  pending?: boolean;
  children?: ReactNode;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const unlocked = !requirePhrase || typed.trim().toUpperCase() === requirePhrase.toUpperCase();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={!unlocked}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {requirePhrase && (
        <div className="mt-4 space-y-1.5">
          <label htmlFor="confirm-phrase" className="text-sm font-medium text-ink">
            Type <span className="font-mono text-terracotta">{requirePhrase}</span> to continue
          </label>
          <input
            id="confirm-phrase"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            className="h-10 w-full rounded-sm border border-rule-strong bg-card px-3 font-mono text-sm focus-visible:border-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/20"
          />
        </div>
      )}
    </Modal>
  );
}

/** Right-hand review panel on desktop, full-screen sheet on mobile. */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-full w-full flex-col border-l border-rule bg-card shadow-panel sm:max-w-xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-4">
          <h2 className="font-display text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-ink-faint hover:bg-paper-deep hover:text-ink"
            aria-label="Close panel"
          >
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-rule bg-paper px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
