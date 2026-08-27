"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { cn } from "@/components/ui/primitives";
import type { Validator } from "@/lib/validation/live";
import { SelectMenu, type SelectOption } from "@/components/ui/select-menu";

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

/**
 * Most controls belong inside a <Field>, which supplies the id, the error and
 * the aria wiring. A few legitimately do not: the review panel writes its own
 * label and description because the control sits inside a decision flow rather
 * than a form row.
 *
 * Throwing at those call sites took the whole admin page down with a
 * client-side exception. So a standalone control is allowed, provided it
 * carries its own label. If it does not, we still refuse in development, which
 * is where an unlabelled input should be caught.
 */
function useControl(own: { id?: string; "aria-label"?: string; "aria-labelledby"?: string }) {
  const ctx = useContext(FieldContext);
  const fallbackId = useId();

  if (!ctx) {
    const labelled = Boolean(own.id || own["aria-label"] || own["aria-labelledby"]);
    if (!labelled && process.env.NODE_ENV !== "production") {
      throw new Error(
        "A form control outside <Field> must have an id tied to a <label>, or an aria-label.",
      );
    }
    return { id: own.id ?? fallbackId, describedBy: undefined, invalid: false };
  }

  // An explicit id still wins, so a caller can point their own label at it.
  return { id: own.id ?? ctx.id, describedBy: ctx.describedBy, invalid: ctx.invalid };
}

export function Field({
  label,
  description,
  error,
  required,
  optional,
  children,
  className,
  validate,
  validateOn = "blur",
}: {
  label: string;
  description?: string;
  error?: string | string[] | undefined;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
  /** Checked in the browser as the person types. The server checks again. */
  validate?: Validator;
  /**
   * "blur" waits until they leave the field before the first complaint, which
   * avoids shouting at someone halfway through typing their email. "input"
   * reports immediately and suits fields with a target to reach, like a word
   * count, where live feedback is encouragement rather than nagging.
   */
  validateOn?: "blur" | "input";
}) {
  const id = useId();
  const [liveError, setLiveError] = useState<string | null>(null);
  const [touched, setTouched] = useState(validateOn === "input");
  const [settled, setSettled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const serverError = Array.isArray(error) ? error[0] : error;
  // A fresh server error outranks the local one: it knows things we do not,
  // like whether an email is already registered.
  const errorText = serverError ?? liveError ?? undefined;

  const run = useCallback(
    (value: string, markTouched: boolean) => {
      if (!validate) return;
      if (markTouched) setTouched(true);
      const message = validate(value);
      setLiveError(message);
      setSettled(message === null && value.trim() !== "");
    },
    [validate],
  );

  const valueOf = (target: EventTarget | null): string | null => {
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      if (target instanceof HTMLInputElement && (target.type === "checkbox" || target.type === "radio")) {
        return null;
      }
      return target.value;
    }
    return null;
  };

  // React's onBlur is focusout, so it reaches here from the control inside.
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const value = valueOf(event.target);
    if (value !== null) run(value, true);
  };

  const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
    const value = valueOf(event.target);
    if (value === null) return;
    if (!touched && validateOn === "blur") return;
    if (timer.current) clearTimeout(timer.current);
    // Short enough to feel immediate, long enough not to flash an error
    // between two keystrokes of a word.
    timer.current = setTimeout(() => run(value, false), 220);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const descId = description ? `${id}-desc` : undefined;
  const errId = errorText ? `${id}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(errorText) }}>
      <div className={cn("space-y-1.5", className)} onBlur={handleBlur} onInput={handleInput}>
        <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium text-ink">
          <span>
            {label}
            {required && <span className="ml-1 text-terracotta" aria-hidden="true">*</span>}
          </span>
          {optional && !settled && <span className="text-xs font-normal text-ink-faint">Optional</span>}
          {/* A quiet tick is the only reward a correct field needs. */}
          {settled && !errorText && (
            <span className="field-ok flex items-center gap-1 text-xs font-normal text-success">
              <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
                <path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Looks right
            </span>
          )}
        </label>
        {description && (
          <p id={descId} className="text-xs leading-relaxed text-ink-faint">
            {description}
          </p>
        )}
        {children}
        {errorText && (
          <p
            id={errId}
            role="status"
            className="field-error flex items-start gap-1.5 text-xs font-medium text-danger"
          >
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
  const { id, describedBy, invalid } = useControl(props);
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
  const { id, describedBy, invalid } = useControl(props);
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

/**
 * The designed dropdown. Falls back to `NativeSelect` where a caller still
 * passes <option> children directly.
 */
export function SelectField({
  options,
  placeholder,
  ...props
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const { id, describedBy, invalid } = useField();
  return (
    <SelectMenu
      id={id}
      describedBy={describedBy}
      invalid={invalid}
      options={options}
      placeholder={placeholder}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentPropsWithoutRef<"select">) {
  const { id, describedBy, invalid } = useControl(props);
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
