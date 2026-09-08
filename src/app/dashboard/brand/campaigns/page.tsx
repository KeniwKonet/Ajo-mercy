import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { DashboardPage } from "@/components/dashboard/shell";
import { ButtonLink, EmptyState, StatusChip } from "@/components/ui/primitives";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/state-machine";
import { formatDate, formatNairaCompact } from "@/lib/format";
import type { BrandProfile, CampaignStatus, SupportCampaign } from "@/lib/types";

export const metadata: Metadata = { title: "Campaigns", robots: { index: false, follow: false } };

const TONES: Record<CampaignStatus, "neutral" | "progress" | "positive" | "negative" | "attention"> = {
  draft: "neutral",
  open: "progress",
  selection_period: "attention",
  under_review: "progress",
  confirmed: "positive",
  announced: "positive",
  completed: "positive",
  cancelled: "negative",
};

export default async function BrandCampaignsPage() {
  const profile = await requireRole("brand");
  const supabase = await createServerSupabase();

  const { data: brandRow } = await supabase
    .from("brand_profiles")
    .select("id, status")
    .eq("user_id", profile.id)
    .maybeSingle();
  const brand = brandRow as Pick<BrandProfile, "id" | "status"> | null;

  const { data } = brand
    ? await supabase
        .from("support_campaigns")
        .select("*")
        .eq("brand_id", brand.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const campaigns = (data ?? []) as SupportCampaign[];
  const approved = brand?.status === "approved";

  return (
    <DashboardPage
      title="Campaigns"
      description="A campaign says how many businesses you want to support and what you are looking for."
      actions={
        approved ? <ButtonLink href="/dashboard/brand/campaigns/new">New campaign</ButtonLink> : null
      }
    >
      {campaigns.length === 0 ? (
        <EmptyState
          title={approved ? "No campaigns yet" : "Approval comes first"}
          description={
            approved
              ? "Create one to tell us your budget, the sectors you care about and how many businesses you want to back."
              : "Once your organisation is verified you will be able to create campaigns here."
          }
          action={approved ? <ButtonLink href="/dashboard/brand/campaigns/new">Create a campaign</ButtonLink> : undefined}
        />
      ) : (
        <ul className="grid-rules border-t border-rule">
          {campaigns.map((campaign) => (
            <li key={campaign.id} className="flex flex-wrap items-start justify-between gap-4 py-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href={`/dashboard/brand/campaigns/${campaign.id}`}
                    className="link-rule font-display text-lg text-ink"
                  >
                    {campaign.name}
                  </Link>
                  <StatusChip tone={TONES[campaign.status]}>
                    {CAMPAIGN_STATUS_LABELS[campaign.status]}
                  </StatusChip>
                </div>
                <p className="mt-1.5 max-w-prose text-sm text-ink-soft">{campaign.summary}</p>
                <p className="mt-2 text-2xs font-extrabold uppercase tracking-[0.08em] text-ink-faint">
                  {campaign.businesses_target} {campaign.businesses_target === 1 ? "business" : "businesses"}
                  {campaign.budget_ngn ? (
                    <>
                      <span className="mx-1.5 text-rule-strong">/</span>
                      {formatNairaCompact(campaign.budget_ngn)}
                    </>
                  ) : null}
                  <span className="mx-1.5 text-rule-strong">/</span>
                  Created {formatDate(campaign.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
