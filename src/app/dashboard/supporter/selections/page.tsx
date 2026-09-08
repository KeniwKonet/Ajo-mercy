import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { DashboardPage } from "@/components/dashboard/shell";
import { Alert, ButtonLink, EmptyState, StatusChip } from "@/components/ui/primitives";
import { WithdrawSelectionButton } from "./withdraw-button";
import { formatDate } from "@/lib/format";
import { CATEGORY_LABELS, type BusinessCategory, type SelectionStatus } from "@/lib/types";

export const metadata: Metadata = { title: "My selections", robots: { index: false, follow: false } };

type SelectionRow = {
  id: string;
  status: SelectionStatus;
  note: string | null;
  created_at: string;
  alajo_profiles: {
    slug: string;
    business_name: string;
    business_category: BusinessCategory;
    state: string;
    city: string | null;
  } | null;
};

const STATUS_COPY: Record<SelectionStatus, { label: string; tone: "neutral" | "progress" | "positive" | "negative"; note: string }> = {
  recorded: {
    label: "Recorded",
    tone: "progress",
    note: "With the Ajo Mercy team. The business knows it is under consideration.",
  },
  shortlisted: {
    label: "Shortlisted",
    tone: "progress",
    note: "The team has taken this forward for a closer look.",
  },
  confirmed: {
    label: "Confirmed",
    tone: "positive",
    note: "Support has been confirmed with this business.",
  },
  declined: {
    label: "Not taken forward",
    tone: "neutral",
    note: "The team did not take this one forward. That is not a reflection on the business.",
  },
  withdrawn: { label: "Withdrawn", tone: "neutral", note: "You withdrew this selection." },
};

export default async function SelectionsPage() {
  const profile = await requireRole("supporter");
  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from("support_selections")
    .select(
      "id, status, note, created_at, alajo_profiles(slug, business_name, business_category, state, city)",
    )
    .eq("selector_id", profile.id)
    .order("created_at", { ascending: false });

  const selections = ((data ?? []) as unknown as Array<
    Omit<SelectionRow, "alajo_profiles"> & { alajo_profiles: SelectionRow["alajo_profiles"] | SelectionRow["alajo_profiles"][] }
  >).map((row) => ({
    ...row,
    alajo_profiles: Array.isArray(row.alajo_profiles) ? (row.alajo_profiles[0] ?? null) : row.alajo_profiles,
  })) as SelectionRow[];

  return (
    <DashboardPage
      title="My selections"
      description="Businesses you have chosen to back, and where each one stands."
    >
      {selections.length === 0 ? (
        <EmptyState
          title="You have not selected anyone yet"
          description="Browse the verified businesses and pick the ones whose story you want to back."
          action={<ButtonLink href="/alajos">Browse businesses</ButtonLink>}
        />
      ) : (
        <div className="space-y-6">
          <Alert tone="neutral">
            A selection is not a confirmation. The team reviews each one and confirms separately
            before any support is arranged.
          </Alert>

          <ul className="grid-rules border-t border-rule">
            {selections.map((selection) => {
              const business = selection.alajo_profiles;
              const copy = STATUS_COPY[selection.status];
              return (
                <li key={selection.id} className="flex flex-wrap items-start justify-between gap-4 py-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {business ? (
                        <Link
                          href={`/alajos/${business.slug}`}
                          className="link-rule font-display text-lg text-ink"
                        >
                          {business.business_name}
                        </Link>
                      ) : (
                        <span className="font-display text-lg text-ink-faint">
                          Business no longer listed
                        </span>
                      )}
                      <StatusChip tone={copy.tone}>{copy.label}</StatusChip>
                    </div>

                    {business && (
                      <p className="mt-1 text-2xs font-extrabold uppercase tracking-[0.08em] text-ink-faint">
                        {CATEGORY_LABELS[business.business_category]}
                        <span className="mx-1.5 text-rule-strong">/</span>
                        {[business.city, business.state].filter(Boolean).join(", ")}
                      </p>
                    )}

                    <p className="mt-2 max-w-prose text-sm text-ink-soft">{copy.note}</p>
                    <p className="mt-1.5 text-xs text-ink-faint">
                      Selected {formatDate(selection.created_at)}
                    </p>
                  </div>

                  {selection.status === "recorded" && (
                    <WithdrawSelectionButton
                      selectionId={selection.id}
                      businessName={business?.business_name ?? "this business"}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </DashboardPage>
  );
}
