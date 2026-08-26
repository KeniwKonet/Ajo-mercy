import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { DashboardPage } from "@/components/dashboard/shell";
import { Alert, EmptyState, StatusChip } from "@/components/ui/primitives";
import { CampaignPicker } from "./campaign-picker";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/state-machine";
import { formatDate, formatNaira } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/types";
import type { AlajoProfile, BrandProfile, SelectionStatus, SupportCampaign } from "@/lib/types";

export const metadata: Metadata = { title: "Campaign", robots: { index: false, follow: false } };

type SelectionRow = {
  id: string;
  status: SelectionStatus;
  created_at: string;
  alajo_profile_id: string;
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole("brand");
  const supabase = await createServerSupabase();

  const { data: brandRow } = await supabase
    .from("brand_profiles")
    .select("id, status")
    .eq("user_id", profile.id)
    .maybeSingle();
  const brand = brandRow as Pick<BrandProfile, "id" | "status"> | null;
  if (!brand) notFound();

  const { data: campaignRow } = await supabase
    .from("support_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const campaign = campaignRow as SupportCampaign | null;

  // RLS would already hide another brand's campaign; this makes it a clean 404.
  if (!campaign || campaign.brand_id !== brand.id) notFound();

  const admin = createAdminSupabase();
  const { data: selectionRows } = await admin
    .from("support_selections")
    .select("id, status, created_at, alajo_profile_id")
    .eq("campaign_id", campaign.id)
    .neq("status", "withdrawn")
    .order("created_at", { ascending: false });

  const selections = (selectionRows ?? []) as SelectionRow[];

  const { data: selectedProfiles } = selections.length
    ? await admin
        .from("alajo_profiles")
        .select("id, slug, business_name, business_category, state, city")
        .in("id", selections.map((s) => s.alajo_profile_id))
    : { data: [] };

  const profilesById = new Map(
    ((selectedProfiles ?? []) as Array<
      Pick<AlajoProfile, "id" | "slug" | "business_name" | "business_category" | "state" | "city">
    >).map((p) => [p.id, p]),
  );

  const remaining = campaign.businesses_target - selections.length;
  const canSelect = campaign.status === "selection_period" && remaining > 0;

  return (
    <DashboardPage
      title={campaign.name}
      description={campaign.summary ?? undefined}
      actions={<StatusChip tone="progress">{CAMPAIGN_STATUS_LABELS[campaign.status]}</StatusChip>}
    >
      <div className="space-y-8">
        {campaign.status === "open" && (
          <Alert tone="progress" title="With the Ajo Mercy team">
            We are reviewing this campaign. Once it is opened you will be able to browse and select
            businesses here.
          </Alert>
        )}

        {campaign.status === "under_review" && (
          <Alert tone="progress" title="Selections under review">
            Your selections are with the team. We confirm each recipient before anything is
            communicated to a business.
          </Alert>
        )}

        {(campaign.status === "confirmed" || campaign.status === "announced" || campaign.status === "completed") && (
          <Alert tone="positive" title="Recipients confirmed">
            The team has confirmed the businesses for this campaign and notified them.
          </Alert>
        )}

        <dl className="grid gap-px border border-rule bg-rule sm:grid-cols-4">
          {[
            ["Target", `${campaign.businesses_target}`],
            ["Selected", `${selections.length}`],
            ["Budget", campaign.budget_ngn ? formatNaira(campaign.budget_ngn) : "—"],
            [
              "Selections close",
              campaign.selection_closes_at ? formatDate(campaign.selection_closes_at) : "—",
            ],
          ].map(([label, value]) => (
            <div key={label} className="bg-paper px-5 py-4">
              <dt className="text-xs text-ink-faint">{label}</dt>
              <dd className="mt-1 font-display text-xl tabular">{value}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h2 className="border-b border-rule pb-3 font-display text-xl">
            Businesses you have selected
          </h2>
          {selections.length === 0 ? (
            <div className="pt-6">
              <EmptyState
                title="Nothing selected yet"
                description={
                  canSelect
                    ? "Browse the verified businesses below and choose the ones you want to back."
                    : "You will be able to select businesses once the team opens this campaign."
                }
              />
            </div>
          ) : (
            <ul className="grid-rules">
              {selections.map((selection) => {
                const business = profilesById.get(selection.alajo_profile_id);
                return (
                  <li key={selection.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                    <div>
                      {business ? (
                        <Link href={`/alajos/${business.slug}`} className="link-rule font-medium text-ink">
                          {business.business_name}
                        </Link>
                      ) : (
                        <span className="text-ink-faint">Business no longer listed</span>
                      )}
                      {business && (
                        <p className="mt-0.5 font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                          {CATEGORY_LABELS[business.business_category]}
                          <span className="mx-1.5 text-rule-strong">/</span>
                          {[business.city, business.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <StatusChip tone={selection.status === "confirmed" ? "positive" : "progress"}>
                      {selection.status === "recorded" ? "Awaiting review" : selection.status}
                    </StatusChip>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {canSelect && (
          <section>
            <h2 className="border-b border-rule pb-3 font-display text-xl">
              Choose businesses
              <span className="ml-3 text-sm font-normal text-ink-faint tabular">
                {remaining} {remaining === 1 ? "place" : "places"} left
              </span>
            </h2>
            <CampaignPicker
              campaignId={campaign.id}
              preferredCategories={campaign.preferred_categories}
              preferredStates={campaign.preferred_states}
              alreadySelected={selections.map((s) => s.alajo_profile_id)}
            />
          </section>
        )}
      </div>
    </DashboardPage>
  );
}
