import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { DashboardPage } from "@/components/dashboard/shell";
import { Alert, ButtonLink, Stat, StatusChip } from "@/components/ui/primitives";
import { BrandForm } from "./brand-form";
import { APPLICATION_STATUS_LABELS, applicationTone } from "@/lib/state-machine";
import { formatNairaCompact } from "@/lib/format";
import type { BrandProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Overview", robots: { index: false, follow: false } };

export default async function BrandOverviewPage() {
  const profile = await requireRole("brand");
  const supabase = await createServerSupabase();

  const { data: row } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();
  const brand = (row as BrandProfile | null) ?? null;

  const firstName = profile.full_name.split(" ")[0];

  if (!brand || brand.status === "draft" || brand.status === "more_information_required") {
    return (
      <DashboardPage
        title={`Welcome, ${firstName}`}
        description="Register your organisation so our team can verify it. Verified brands can create campaigns and select businesses."
      >
        {brand?.status === "more_information_required" && (
          <Alert tone="attention" title="We need a little more" className="mb-6">
            {brand.decision_reason ?? "Please review your answers and submit again."}
          </Alert>
        )}
        <BrandForm existing={brand} />
      </DashboardPage>
    );
  }

  const { count: campaignCount } = await supabase
    .from("support_campaigns")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", brand.id);

  const { count: selectionCount } = await supabase
    .from("support_selections")
    .select("id", { count: "exact", head: true })
    .eq("selector_id", profile.id)
    .neq("status", "withdrawn");

  return (
    <DashboardPage
      title={brand.organisation_name ?? "Your organisation"}
      description={brand.industry ?? undefined}
      actions={
        <StatusChip tone={applicationTone(brand.status)}>
          {APPLICATION_STATUS_LABELS[brand.status]}
        </StatusChip>
      }
    >
      <div className="space-y-8">
        {brand.status === "approved" ? (
          <Alert tone="positive" title="Approved">
            You can create a campaign and select businesses. Every selection is confirmed by the Ajo
            Mercy team before anything is communicated to a business.
          </Alert>
        ) : brand.status === "rejected" ? (
          <Alert tone="negative" title="Not approved">
            {brand.decision_reason ?? "We were not able to approve this registration."}
          </Alert>
        ) : (
          <Alert tone="progress" title="With the review team">
            We verify every organisation before it can browse or select businesses.
          </Alert>
        )}

        <section className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
          <div className="bg-paper px-5">
            <Stat value={campaignCount ?? 0} label="Campaigns" />
          </div>
          <div className="bg-paper px-5">
            <Stat value={selectionCount ?? 0} label="Businesses selected" />
          </div>
          <div className="bg-paper px-5">
            <Stat
              value={brand.budget_max_ngn ? formatNairaCompact(brand.budget_max_ngn) : null}
              label="Stated budget"
              hint="What you told us at registration"
            />
          </div>
        </section>

        {brand.status === "approved" && (
          <div className="flex flex-wrap gap-3 border-t border-rule pt-6">
            <ButtonLink href="/dashboard/brand/campaigns/new">Create a campaign</ButtonLink>
            <ButtonLink href="/dashboard/brand/campaigns" variant="secondary">
              View campaigns
            </ButtonLink>
          </div>
        )}
      </div>
    </DashboardPage>
  );
}
