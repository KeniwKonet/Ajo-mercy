import type { CSSProperties, ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import Link from "next/link";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

// ------------------------------------------------------------------ layout --

export function Container({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode;
  width?: "editorial" | "wide" | "full";
  className?: string;
}) {
  const widths = {
    editorial: "max-w-[46rem]",
    wide: "max-w-[84rem]",
    full: "max-w-none",
  };
  return <div className={cn("mx-auto w-full px-5 sm:px-8", widths[width], className)}>{children}</div>;
}

/**
 * Section label used sparingly. The brief warns against an uppercase eyebrow
 * above every heading, so this is reserved for navigational context inside long
 * pages, not decoration.
 */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ button --

type ButtonVariant = "primary" | "secondary" | "accent" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

// `press` gives the one-pixel acknowledgement on click; `relative` and
// `overflow-hidden` exist so a loading button can host the indeterminate bar.
const buttonBase =
  "press relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
  "disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2";

const buttonVariants: Record<ButtonVariant, string> = {
  // Lime is the system's primary action, on near-black text.
  primary: "bg-lime text-widget-black-2 hover:brightness-95 focus-visible:outline-widget-black",
  // On the warm page an outlined black pill; inside a widget it reads as ivory.
  secondary:
    "border-[1.5px] border-ink text-ink hover:bg-ink hover:text-ivory-text focus-visible:outline-widget-black " +
    "[.widget_&]:border-muted-on-black/40 [.widget_&]:text-ivory-text [.widget_&]:hover:bg-widget-black-2 [.widget_&]:hover:text-ivory-text",
  // Orange is reserved for backing a business: the one action that commits a
  // person to something.
  accent: "bg-orange text-widget-black-2 hover:brightness-95 focus-visible:outline-orange",
  ghost: "text-ink hover:bg-widget-black-2 focus-visible:outline-widget-black",
  danger: "bg-danger text-white hover:brightness-95 focus-visible:outline-danger",
  quiet: "text-ink-soft hover:text-ink underline underline-offset-4 decoration-rule-strong hover:decoration-ink",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonOwnProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={cn(
        buttonBase,
        buttonVariants[variant],
        buttonSizes[size],
        // The travelling bar says "still working" for the stretch where a
        // spinner alone reads as frozen.
        loading && "working",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...props
}: ButtonOwnProps & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      href={href}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-3.5 animate-spin", className)}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ------------------------------------------------------------------ status --

export type Tone = "neutral" | "progress" | "positive" | "attention" | "negative" | "feature";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-state-neutral-bg text-state-neutral-text",
  progress: "bg-state-progress-bg text-state-progress-text",
  positive: "bg-state-positive-bg text-state-positive-text",
  attention: "bg-state-attention-bg text-state-attention-text",
  negative: "bg-danger-wash text-danger",
  feature: "bg-lime text-widget-black-2",
};

export function StatusChip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-bold tracking-[0.02em]",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Live region wrapper so status changes reach screen readers. */
export function LiveStatus({ children }: { children: ReactNode }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {children}
    </p>
  );
}

// ------------------------------------------------------------------- alert --

export function Alert({
  tone = "neutral",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const accents: Record<Tone, string> = {
    neutral: "border-l-muted-on-black bg-widget-black-2",
    progress: "border-l-ochre bg-widget-black-2",
    positive: "border-l-lime bg-widget-black-2",
    attention: "border-l-orange bg-widget-black-2",
    negative: "border-l-orange bg-widget-black-2",
    feature: "border-l-lime bg-widget-black-2",
  };
  return (
    <div
      role={tone === "negative" ? "alert" : "status"}
      className={cn("rounded-md border-l-4 px-5 py-4", accents[tone], className)}
    >
      {title && <p className="text-sm font-bold text-ivory-text">{title}</p>}
      {children && <div className={cn("text-sm text-muted-on-black", title && "mt-1")}>{children}</div>}
    </div>
  );
}

// ------------------------------------------------------------ empty states --

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "widget flex flex-col items-center py-16 text-center",
        className,
      )}
    >
      {/* A quiet mark rather than an icon, so an empty state reads as a
          resting point in the product and not an error. */}
      <span
        aria-hidden="true"
        className="mb-5 grid size-12 place-items-center rounded-full bg-widget-black-2 text-muted-on-black"
      >
        <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="9" cy="9" r="6" />
          <path d="M13.5 13.5 17 17" strokeLinecap="round" />
        </svg>
      </span>
      <p className="font-display text-2xl text-ivory-text">{title}</p>
      <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-muted-on-black">{description}</p>
      {action && <div className="mt-7 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  // `style` carries per-item widths and animation delays, so a column of
  // placeholders varies instead of pulsing in lockstep.
  return <div className={cn("animate-pulse rounded-md bg-widget-black-2", className)} style={style} aria-hidden="true" />;
}

// ------------------------------------------------------------------- table --

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full min-w-[42rem] border-collapse text-sm", className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className, ...props }: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-rule px-4 py-3 text-left text-2xs font-bold uppercase tracking-[0.08em] text-ink-faint",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, ...props }: ComponentPropsWithoutRef<"td">) {
  return (
    <td className={cn("border-b border-rule px-4 py-3.5 align-middle text-ink", className)} {...props}>
      {children}
    </td>
  );
}

// -------------------------------------------------------------- typography --

export function Display({
  as: Tag = "h1",
  size = "lg",
  children,
  className,
}: {
  as?: ElementType;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  className?: string;
}) {
  const sizes = {
    sm: "text-2xl sm:text-3xl",
    md: "text-3xl sm:text-4xl",
    lg: "text-4xl sm:text-5xl",
    xl: "text-5xl sm:text-6xl lg:text-7xl",
  };
  return <Tag className={cn("font-display", sizes[size], className)}>{children}</Tag>;
}

/** A stat that shows a real number, or an honest dash when there is no data. */
export function Stat({
  value,
  label,
  hint,
  className,
}: {
  value: string | number | null;
  label: string;
  hint?: string;
  className?: string;
}) {
  const empty = value === null || value === 0 || value === "0" || value === "—";
  return (
    <div className={cn("py-4", className)}>
      <p
        className={cn(
          "font-display text-3xl tabular sm:text-4xl",
          empty ? "text-ink-faint" : "text-lime",
        )}
      >
        {empty ? "—" : value}
      </p>
      <p className="mt-1 text-sm font-medium text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
