const nairaFull = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** ₦1,250,000 */
export function formatNaira(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return nairaFull.format(amount);
}

/** ₦1.25m — for tight spaces like cards and stat rows. */
export function formatNairaCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  if (amount >= 1_000_000_000) return `₦${trimZeros(amount / 1_000_000_000)}b`;
  if (amount >= 1_000_000) return `₦${trimZeros(amount / 1_000_000)}m`;
  if (amount >= 1_000) return `₦${trimZeros(amount / 1_000)}k`;
  return `₦${amount}`;
}

function trimZeros(value: number): string {
  return value.toFixed(value < 10 ? 2 : 1).replace(/\.?0+$/, "");
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-NG").format(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  const diffSeconds = Math.round((then - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) return rtf.format(Math.round(diffSeconds / seconds), unit);
  }
  return "just now";
}

/** "12 years" / "under a year" — used on business profiles. */
export function yearsOperating(yearStarted: number | null | undefined): string | null {
  if (!yearStarted) return null;
  const years = new Date().getFullYear() - yearStarted;
  if (years < 1) return "Under a year";
  if (years === 1) return "1 year";
  return `${years} years`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
