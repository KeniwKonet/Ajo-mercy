"use client";

import type { ZodTypeAny } from "zod";

/**
 * Client-side field checks.
 *
 * These exist so someone hears about a problem while they are still looking at
 * the field, not after they press Continue and get thrown back. They are a
 * courtesy, never a control: every one of these rules is enforced again by the
 * same Zod schema on the server, which is the only check that decides anything.
 */

export type Validator = (value: string) => string | null;

/** Reuses a shared schema so the client and server cannot drift apart. */
export function fromSchema(schema: ZodTypeAny): Validator {
  return (value) => {
    const result = schema.safeParse(value);
    if (result.success) return null;
    return result.error.issues[0]?.message ?? "That does not look right.";
  };
}

export function required(label: string): Validator {
  return (value) => (value.trim().length > 0 ? null : `${label} is needed.`);
}

/** Runs in order and reports the first problem, so errors stay one at a time. */
export function all(...validators: Array<Validator | undefined>): Validator {
  return (value) => {
    for (const validate of validators) {
      if (!validate) continue;
      const message = validate(value);
      if (message) return message;
    }
    return null;
  };
}

/** Skips the other rules while the field is still empty. */
export function optional(...validators: Array<Validator | undefined>): Validator {
  return (value) => (value.trim() === "" ? null : all(...validators)(value));
}

export function words(min: number, label: string): Validator {
  return (value) => {
    const count = value.trim().split(/\s+/).filter(Boolean).length;
    if (count === 0) return `${label} is needed.`;
    if (count < min) {
      const missing = min - count;
      return `${missing} more ${missing === 1 ? "word" : "words"} to go. We ask for at least ${min}.`;
    }
    return null;
  };
}

export function maxChars(max: number): Validator {
  return (value) =>
    value.length > max ? `That is ${value.length - max} characters too long.` : null;
}

export function range(min: number, max: number, label: string): Validator {
  return (value) => {
    if (value.trim() === "") return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return `${label} should be a number.`;
    if (n < min) return `${label} cannot be below ${min.toLocaleString("en-NG")}.`;
    if (n > max) return `${label} cannot be above ${max.toLocaleString("en-NG")}.`;
    return null;
  };
}
