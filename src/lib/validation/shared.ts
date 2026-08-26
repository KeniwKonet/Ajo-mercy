import { z } from "zod";
import { BUSINESS_CATEGORIES, NIGERIAN_STATES } from "@/lib/types";

/** Building blocks reused across every form so rules stay consistent. */

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Enter your email address.")
  .max(254)
  .email("That does not look like an email address.");

export const password = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "That password is too long.")
  .refine((v) => /[a-z]/i.test(v), "Include at least one letter.")
  .refine((v) => /[0-9]/.test(v) || /[^a-z0-9]/i.test(v), "Include a number or a symbol.");

export const fullName = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "That name is too long.")
  .refine((v) => v.split(/\s+/).length >= 2, "Enter both your first and last name.");

/** Accepts the shapes Nigerians actually type: 0803…, +234803…, 234803… */
export const nigerianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^(\+?234|0)[789][01]\d{8}$/, "Enter a valid Nigerian phone number."),
  );

export const optionalPhone = z
  .string()
  .trim()
  .max(20)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/.+\..+/.test(v), "Enter a full URL starting with https://")
  .transform((v) => (v === "" ? undefined : v))
  .optional();

/** Stored without the @ so links can be built predictably. */
export const socialHandle = z
  .string()
  .trim()
  .max(40)
  .transform((v) => v.replace(/^@/, "").replace(/^https?:\/\/(www\.)?[^/]+\//, "").replace(/\/$/, ""))
  .refine((v) => v === "" || /^[A-Za-z0-9._]{1,40}$/.test(v), "Use letters, numbers, dots and underscores only.")
  .transform((v) => (v === "" ? undefined : v))
  .optional();

export const businessCategory = z.enum(BUSINESS_CATEGORIES, {
  errorMap: () => ({ message: "Choose the category that fits best." }),
});

export const nigerianState = z.enum(NIGERIAN_STATES, {
  errorMap: () => ({ message: "Choose a state." }),
});

export const nairaAmount = z
  .coerce
  .number({ invalid_type_error: "Enter an amount in figures." })
  .int("Enter a whole amount.")
  .min(0, "An amount cannot be negative.")
  .max(500_000_000, "That is above the amount we can process here.");

export const turnstileToken = z.string().min(1, "Complete the verification check.").optional();

/** Long-form fields have floors as well as ceilings: a one-line story cannot be reviewed. */
export function prose(minWords: number, maxChars: number, label: string) {
  return z
    .string()
    .trim()
    .max(maxChars, `Keep this under ${maxChars} characters.`)
    .refine(
      (v) => v.split(/\s+/).filter(Boolean).length >= minWords,
      `${label} needs at least ${minWords} words so reviewers have something to go on.`,
    );
}

export type FieldErrors = Record<string, string[]>;

export interface ActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
  data?: T;
}

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function failure(message: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return fieldErrors ? { ok: false, message, fieldErrors } : { ok: false, message };
}

export function success<T>(message?: string, data?: T): ActionResult<T> {
  return { ok: true, ...(message ? { message } : {}), ...(data !== undefined ? { data } : {}) };
}
