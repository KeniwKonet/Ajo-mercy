"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/components/ui/primitives";

/**
 * A dropdown that can actually be designed.
 *
 * A native <select> renders its list with the operating system, so the options
 * cannot be styled, grouped visually, or given a type-ahead that matches the
 * rest of the product. This draws its own list instead.
 *
 * The native <select> is still there, visually hidden but real. It holds the
 * value, so form submission, validation, autofill and the draft restore all
 * keep working exactly as before. The custom list is a presentation layer over
 * a control that already works, never a replacement for it.
 */

export type SelectOption = { value: string; label: string; hint?: string };

export function SelectMenu({
  name,
  options,
  defaultValue = "",
  placeholder = "Choose one",
  disabled,
  required,
  id,
  invalid,
  describedBy,
  onValueChange,
  className,
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const listId = useId();

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  /* The draft restore writes to the hidden <select> and fires `change`. Mirror
     it back into our state or the button would show a stale label. */
  useEffect(() => {
    const el = selectRef.current;
    if (!el) return;
    const sync = () => setValue(el.value);
    el.addEventListener("change", sync);
    return () => el.removeEventListener("change", sync);
  }, []);

  const commit = useCallback(
    (next: string) => {
      setValue(next);
      const el = selectRef.current;
      if (el && el.value !== next) {
        el.value = next;
        // Let anything listening on the form (drafts, live validation) hear it.
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      onValueChange?.(next);
    },
    [onValueChange],
  );

  const close = useCallback((focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }, []);

  // Open upwards when there is not enough room below.
  const openMenu = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setDropUp(window.innerHeight - rect.bottom < 260 && rect.top > 260);
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }, [options, value]);

  useEffect(() => {
    if (!open) return;

    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
    };
    // A dropdown pinned to a button must not float away from it.
    const onScroll = () => setOpen(false);

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close]);

  // Focus moves into the list so the arrow keys reach onListKey.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openMenu();
      return;
    }
    // Type-ahead from the closed button, as a native select does.
    if (e.key.length === 1 && /\S/.test(e.key)) {
      const match = options.find((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (match) commit(match.value);
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, options.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const option = options[active];
      if (option) { commit(option.value); close(); }
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {/* The real control. Screen readers and the form both use this one. */}
      <select
        ref={selectRef}
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onButtonKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-md border border-transparent bg-widget-black-2 px-4 text-left text-sm",
          "transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.22,0.61,0.36,1)]",
          "focus:outline-none focus-visible:border-lime",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "!border-orange" : "hover:border-muted-on-black/40",
          open && "!border-lime",
        )}
      >
        <span className={cn("truncate", selected ? "text-ivory-text" : "text-muted-on-black")}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className={cn(
            "size-3 shrink-0 text-muted-on-black transition-transform duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)]",
            open && "rotate-180",
          )}
        >
          <path d="M2 4.5 6 8.5 10 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          className={cn(
            "menu-pop absolute z-40 max-h-64 w-full overflow-y-auto rounded-md bg-widget-black-2 py-1",
            dropUp ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top",
          )}
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                data-active={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => { commit(option.value); close(); }}
                className={cn(
                  "flex cursor-pointer items-baseline gap-2 px-3 py-2 text-sm transition-colors duration-100",
                  i === active ? "bg-forest-wash text-ink" : "text-ink-soft",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-px w-3 shrink-0 transition-opacity",
                    isSelected ? "opacity-100" : "opacity-0",
                  )}
                >
                  ✓
                </span>
                <span className="flex-1 truncate">{option.label}</span>
                {option.hint && (
                  <span className="tabular shrink-0 font-mono text-2xs opacity-60">{option.hint}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
