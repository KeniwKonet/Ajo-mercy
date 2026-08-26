"use client";

import {
  createContext,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn } from "@/components/ui/primitives";

/**
 * Field wires a label, description, control and error message together with the
 * right aria attributes. Controls read their ids from context so a form cannot
 * accidentally ship an unlabelled input.
 */
interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

function useField(): FieldContextValue {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error("Form controls must be rendered inside <Field>.");
  return ctx;
}

export function Field({
  label,
  description,
  error,
  required,
  optional,
  children,
  className,
}: {
  label: string;
  description?: string;
  error?: string | string[] | undefined;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const errorText = Array.isArray(error) ? error[0] : error;
  const descId = description ? `${id}-desc` : undefined;
  const errId = errorText ? `${id}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(errorText) }}>
      <div className={cn("space-y-1.5", className)}>
        <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium text-ink">
          <span>
            {label}
            {required && <span className="ml-1 text-terracotta" aria-hidden="true">*</span>}
          </span>
          {optional && <span className="text-xs font-normal text-ink-faint">Optional</span>}
        </label>
        {description && (
          <p id={descId} className="text-xs leading-relaxed text-ink-faint">
            {description}
          </p>
        )}
        {children}
        {errorText && (
          <p id={errId} className="flex items-start gap-1.5 text-xs font-medium text-danger">
            <span aria-hidden="true" className="mt-px">↳</span>
            {errorText}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

const controlBase =
  "w-full rounded-sm border bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint " +
  "transition-colors focus:outline-none focus-visible:border-forest focus-visible:ring-2 focus-visible:ring-forest/20 " +
  "disabled:cursor-not-allowed disabled:bg-paper-deep disabled:text-ink-faint";

function controlClasses(invalid: boolean, className?: string) {
  return cn(controlBase, invalid ? "border-danger" : "border-rule-strong hover:border-rule-strong", className);
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  const { id, describedBy, invalid } = useField();
  return (
    <input
      id={id}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={controlClasses(invalid, cn("h-10", className))}
      {...props}
    />
  );
}

export function Textarea({ className, rows = 5, ...props }: ComponentPropsWithoutRef<"textarea">) {
  const { id, describedBy, invalid } = useField();
  return (
    <textarea
      id={id}
      rows={rows}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={controlClasses(invalid, cn("resize-y leading-relaxed", className))}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentPropsWithoutRef<"select">) {
  const { id, describedBy, invalid } = useField();
  return (
    <div className="relative">
      <select
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={controlClasses(invalid, cn("h-10 appearance-none pr-9", className))}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-ink-faint"
      >
        <path d="M2 4.5 6 8.5 10 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: { label: ReactNode; description?: string } & ComponentPropsWithoutRef<"input">) {
  const id = useId();
  return (
    <div className={cn("flex gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-xs border-rule-strong text-forest accent-[var(--color-forest)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        {...props}
      />
      <div className="space-y-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm text-ink">
          {label}
        </label>
        {description && <p className="text-xs text-ink-faint">{description}</p>}
      </div>
    </div>
  );
}

/** Multi-select rendered as toggles; used for categories and states. */
export function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
  label,
  max,
}: {
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onToggle: (value: T) => void;
  label: string;
  max?: number;
}) {
  const atMax = max !== undefined && selected.length >= max;
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              disabled={!isSelected && atMax}
              onClick={() => onToggle(option.value)}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors",
                isSelected
                  ? "border-forest bg-forest text-paper"
                  : "border-rule-strong bg-card text-ink-soft hover:border-ink hover:text-ink",
                !isSelected && atMax && "cursor-not-allowed opacity-40",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Summary of everything wrong, rendered above a long form and focusable. */
export function FormErrorSummary({
  message,
  fieldErrors,
}: {
  message?: string | undefined;
  fieldErrors?: Record<string, string[]> | undefined;
}) {
  const entries = Object.entries(fieldErrors ?? {});
  if (!message && entries.length === 0) return null;
  return (
    <div
      role="alert"
      tabIndex={-1}
      className="border-l-2 border-l-danger bg-danger-wash px-4 py-3"
    >
      <p className="text-sm font-semibold text-danger">{message ?? "Please check the form."}</p>
      {entries.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-danger">
          {entries.map(([key, messages]) => (
            <li key={key}>{messages[0]}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Character/word budget shown live under long-form fields. */
export function WordCount({ value, min }: { value: string; min: number }) {
  const words = value.trim().split(/\s+/).filter(Boolean).length;
  const met = words >= min;
  return (
    <p className={cn("text-xs tabular", met ? "text-ink-faint" : "text-terracotta")} aria-live="polite">
      {words} {words === 1 ? "word" : "words"}
      {!met && ` · ${min - words} more needed`}
    </p>
  );
}
