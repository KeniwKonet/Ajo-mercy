import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
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

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors duration-200 " +
  "disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-forest text-paper hover:bg-forest-deep focus-visible:outline-forest",
  secondary:
    "border border-rule-strong bg-card text-ink hover:border-ink hover:bg-paper-warm focus-visible:outline-forest",
  ghost: "text-ink hover:bg-paper-deep focus-visible:outline-forest",
  danger: "bg-danger text-white hover:brightness-90 focus-visible:outline-danger",
  quiet: "text-ink-soft hover:text-ink underline underline-offset-4 decoration-rule-strong hover:decoration-ink",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
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
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
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
  neutral: "bg-paper-deep text-ink-soft",
  progress: "bg-info-wash text-info",
  positive: "bg-success-wash text-success",
  attention: "bg-terracotta-wash text-terracotta-deep",
  negative: "bg-danger-wash text-danger",
  feature: "bg-ochre-wash text-[#7a5a09]",
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
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.07em]",
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
    neutral: "border-l-rule-strong bg-paper-deep",
    progress: "border-l-info bg-info-wash",
    positive: "border-l-success bg-success-wash",
    attention: "border-l-terracotta bg-terracotta-wash",
    negative: "border-l-danger bg-danger-wash",
    feature: "border-l-ochre bg-ochre-wash",
  };
  return (
    <div
      role={tone === "negative" ? "alert" : "status"}
      className={cn("border-l-2 px-4 py-3", accents[tone], className)}
    >
      {title && <p className="text-sm font-semibold text-ink">{title}</p>}
      {children && <div className={cn("text-sm text-ink-soft", title && "mt-1")}>{children}</div>}
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
    <div className={cn("border border-dashed border-rule-strong px-6 py-14 text-center", className)}>
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-paper-deep", className)} aria-hidden="true" />;
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
        "border-b border-rule px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-[0.09em] text-ink-faint",
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
    <td className={cn("border-b border-rule px-3 py-3 align-middle text-ink", className)} {...props}>
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
          empty ? "text-ink-faint" : "text-forest",
        )}
      >
        {empty ? "—" : value}
      </p>
      <p className="mt-1 text-sm font-medium text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
