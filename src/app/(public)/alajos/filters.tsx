"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/components/ui/primitives";
import { CATEGORY_LABELS, type BusinessCategory } from "@/lib/types";
import { NEED_BANDS } from "@/lib/validation/schemas";

/**
 * Filters write to the URL rather than to component state, so a filtered view
 * can be shared, bookmarked and indexed, and the back button behaves.
 */
export function DiscoveryFilters({
  categories,
  states,
  total,
}: {
  categories: Array<{ category: string; count: number }>;
  states: Array<{ state: string; count: number }>;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const firstRender = useRef(true);

  const current = {
    category: params.get("category"),
    state: params.get("state"),
    need: params.get("need"),
    sort: params.get("sort") ?? "featured",
  };

  function apply(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    // Any filter change resets to the first page.
    next.delete("page");
    startTransition(() => {
      router.replace(`/alajos${next.toString() ? `?${next}` : ""}`, { scroll: false });
    });
  }

  // Debounced search, so typing does not fire a request per keystroke.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => apply({ q: query || null }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasFilters = Boolean(current.category || current.state || current.need || params.get("q"));

  return (
    <div className={cn("space-y-6", pending && "opacity-70 transition-opacity")}>
      <div>
        <label htmlFor="discovery-search" className="sr-only">
          Search businesses
        </label>
        <div className="relative">
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          >
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            id="discovery-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Business, founder or town"
            className="h-12 w-full rounded-full border border-rule-strong bg-panel-white pl-10 pr-4 text-sm transition-shadow placeholder:text-ink-faint focus-visible:border-forest focus-visible: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/15"
          />
        </div>
      </div>

      <FilterGroup
        legend="Category"
        options={categories.map((c) => ({
          value: c.category,
          label: CATEGORY_LABELS[c.category as BusinessCategory] ?? c.category,
          count: c.count,
        }))}
        selected={current.category}
        onSelect={(value) => apply({ category: value })}
      />

      <FilterGroup
        legend="State"
        options={states.slice(0, 12).map((s) => ({ value: s.state, label: s.state, count: s.count }))}
        selected={current.state}
        onSelect={(value) => apply({ state: value })}
      />

      <FilterGroup
        legend="Support needed"
        options={Object.entries(NEED_BANDS).map(([value, band]) => ({ value, label: band.label }))}
        selected={current.need}
        onSelect={(value) => apply({ need: value })}
      />

      <div>
        <label htmlFor="discovery-sort" className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
          Order
        </label>
        <select
          id="discovery-sort"
          value={current.sort}
          onChange={(event) => apply({ sort: event.target.value })}
          className="mt-2 h-11 w-full rounded-full border border-rule-strong bg-panel-white px-4 text-sm focus-visible:border-forest focus-visible:outline-none"
        >
          <option value="featured">Featured first</option>
          <option value="recent">Recently verified</option>
          <option value="name">Business name</option>
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => startTransition(() => router.replace("/alajos", { scroll: false }))}
          className="link-rule text-sm text-ink-soft hover:text-ink"
        >
          Clear all filters
        </button>
      )}

      <p aria-live="polite" className="border-t border-rule pt-4 text-xs text-ink-faint tabular">
        {total} {total === 1 ? "business" : "businesses"}
      </p>
    </div>
  );
}

function FilterGroup({
  legend,
  options,
  selected,
  onSelect,
}: {
  legend: string;
  options: Array<{ value: string; label: string; count?: number }>;
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset>
      <legend className="eyebrow">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(active ? null : option.value)}
              className="pill"
            >
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span className={cn("tabular text-2xs", active ? "opacity-75" : "text-ink-faint")}>
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
