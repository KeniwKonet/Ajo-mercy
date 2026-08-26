import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { listCampaigns } from "@/lib/data/admin";
import { DashboardPage } from "@/components/dashboard/shell";
import { EmptyState, StatusChip } from "@/components/ui/primitives";
import { CampaignControls } from "./campaign-controls";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/state-machine";
import { formatDate, formatNairaCompact } from "@/lib/format";
import { CATEGORY_LABELS, type CampaignStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Campaigns", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TONES: Record<CampaignStatus, "neutral" | "progress" | "positive" | "negative" | "attention"> = {
  draft: "neutral",
  open: "attention",
  selection_period: "progress",
  under_review: "attention",
  confirmed: "positive",
  announced: "positive",
  completed: "neutral",
  cancelled: "negative",
};

export default async function AdminCampaignsPage() {
  await requirePermission("campaign.manage");
  const campaigns = await listCampaigns();

  return (
    <DashboardPage
      title="Campaigns"
      description="Brand and platform campaigns. You control when selections open and when recipients are confirmed."
    >
      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Approved brands create campaigns from their own dashboard. They appear here for review."
        />
      ) : (
        <ul className="grid-rules border-t border-rule">
          {campaigns.map((campaign) => (
            <li key={campaign.id} className="flex flex-wrap items-start justify-between gap-5 py-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="font-display text-lg text-ink">{campaign.name}</p>
                  <StatusChip tone={TONES[campaign.status]}>
                    {CAMPAIGN_STATUS_LABELS[campaign.status]}
                  </StatusChip>
                  {campaign.is_platform_campaign && <StatusChip tone="feature">Ajo Mercy</StatusChip>}
                </div>

                <p className="mt-0.5 text-xs text-ink-faint">
                  {campaign.brand_name ?? "Ajo Mercy"} · created {formatDate(campaign.created_at)}
                </p>

                {campaign.summary && (
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
                    {campaign.summary}
                  </p>
                )}

                <p className="mt-2.5 font-mono text-2xs uppercase tracking-[0.1em] text-ink-faint">
                  {campaign.selection_count}/{campaign.businesses_target} selected
                  {campaign.budget_ngn ? ` · ${formatNairaCompact(campaign.budget_ngn)}` : ""}
                  {campaign.preferred_categories.length > 0
                    ? ` · ${campaign.preferred_categories.map((c) => CATEGORY_LABELS[c]).join(", ")}`
                    : ""}
                  {campaign.preferred_states.length > 0
                    ? ` · ${campaign.preferred_states.join(", ")}`
                    : ""}
                </p>
              </div>

              <CampaignControls
                campaignId={campaign.id}
                status={campaign.status}
                name={campaign.name}
              />
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
