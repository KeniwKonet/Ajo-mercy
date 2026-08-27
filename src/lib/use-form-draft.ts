"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps what someone has typed, in their own browser, until they submit it.
 *
 * The application form asks for several hundred words of prose with enforced
 * minimums. Losing that to a refresh, a flat battery or a tab crash is the
 * single most expensive failure in the product, and the server-side draft save
 * does not help because it only runs when a step is completed.
 *
 * This writes to localStorage on every keystroke (debounced), restores on
 * mount, and clears once the form has been submitted successfully.
 *
 * What it deliberately never stores:
 *   - passwords
 *   - file inputs (which cannot be restored anyway)
 *   - hidden fields, which carry server action ids and Turnstile tokens; a
 *     stale token restored into a form is worse than no token
 */

const PREFIX = "ajo.draft.v1:";
const DEBOUNCE_MS = 400;

/** 256KB is far more than any form here needs and well inside quota. */
const MAX_BYTES = 256 * 1024;

type Draft = { at: number; values: Record<string, string | boolean> };

function isRestorable(el: Element): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (
    !(el instanceof HTMLInputElement) &&
    !(el instanceof HTMLTextAreaElement) &&
    !(el instanceof HTMLSelectElement)
  ) {
    return false;
  }
  if (!el.name) return false;
  if (el instanceof HTMLInputElement) {
    if (el.type === "password" || el.type === "file" || el.type === "hidden") return false;
  }
  // Anything explicitly opted out, plus Turnstile's own injected inputs.
  if (el.dataset.noDraft !== undefined) return false;
  if (el.name.startsWith("cf-") || el.name.startsWith("$ACTION")) return false;
  return true;
}

/**
 * React tracks the last value it wrote to an input, so assigning `.value`
 * directly is silently ignored on a controlled field. Going through the
 * prototype setter and then dispatching the event is what makes a restored
 * value reach component state.
 */
/** Same problem as `value`: React ignores a direct `.checked` assignment. */
function setNativeChecked(el: HTMLInputElement, checked: boolean) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
  if (setter) setter.call(el, checked);
  else el.checked = checked;

  el.dispatchEvent(new Event("click", { bubbles: true }));
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function setNativeValue(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;

  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function read(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const draft = parsed as Draft;
    if (typeof draft.at !== "number" || typeof draft.values !== "object") return null;
    return draft;
  } catch {
    // Private browsing, disabled storage, or corrupt JSON. A draft is a
    // convenience; it must never take the form down with it.
    return null;
  }
}

export function useFormDraft(
  formRef: React.RefObject<HTMLFormElement | null>,
  key: string,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled !== false;
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch {
      /* nothing to clean up if storage is unavailable */
    }
    setSavedAt(null);
    setRestored(false);
  }, [key]);

  // Restore once, after the form has rendered its defaults.
  useEffect(() => {
    if (!enabled) return;
    const form = formRef.current;
    if (!form) return;

    const draft = read(key);
    if (!draft) return;

    let changed = 0;
    for (const el of Array.from(form.elements)) {
      if (!isRestorable(el)) continue;
      const stored = draft.values[el.name];
      if (stored === undefined) continue;

      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        const want = typeof stored === "boolean" ? stored : el.value === stored;
        // Only ever turn a radio on. Clearing the others is the browser's job,
        // and firing change on each would fight a controlled group.
        if (want && !el.checked) {
          setNativeChecked(el, true);
          changed += 1;
        } else if (el.type === "checkbox" && !want && el.checked) {
          setNativeChecked(el, false);
          changed += 1;
        }
        continue;
      }

      if (typeof stored === "string" && stored !== "" && el.value !== stored) {
        setNativeValue(el, stored);
        changed += 1;
      }
    }

    if (changed > 0) {
      setRestored(true);
      setSavedAt(draft.at);
    }
  }, [enabled, formRef, key]);

  // Persist on any edit within the form.
  useEffect(() => {
    if (!enabled) return;
    const form = formRef.current;
    if (!form) return;

    const persist = () => {
      const values: Record<string, string | boolean> = {};
      for (const el of Array.from(form.elements)) {
        if (!isRestorable(el)) continue;
        if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
          if (el.type === "radio" && !el.checked) continue;
          values[el.name] = el.type === "checkbox" ? el.checked : el.value;
          continue;
        }
        if (el.value !== "") values[el.name] = el.value;
      }

      if (Object.keys(values).length === 0) return;

      const payload = JSON.stringify({ at: Date.now(), values } satisfies Draft);
      if (payload.length > MAX_BYTES) return;

      try {
        window.localStorage.setItem(PREFIX + key, payload);
        setSavedAt(Date.now());
      } catch {
        /* quota or private mode: drafting is best-effort by design */
      }
    };

    const onEdit = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(persist, DEBOUNCE_MS);
    };

    form.addEventListener("input", onEdit);
    form.addEventListener("change", onEdit);
    // A closing tab does not wait for a debounce.
    window.addEventListener("pagehide", persist);

    return () => {
      form.removeEventListener("input", onEdit);
      form.removeEventListener("change", onEdit);
      window.removeEventListener("pagehide", persist);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, formRef, key]);

  return { savedAt, restored, clear };
}
