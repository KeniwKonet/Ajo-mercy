import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { DashboardPage } from "@/components/dashboard/shell";
import { Alert, ButtonLink, Stat, StatusChip, cn } from "@/components/ui/primitives";
import { SupporterForm } from "./supporter-form";
import { APPLICATION_STATUS_LABELS, applicationTone } from "@/lib/state-machine";
import type { SupporterProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Overview", robots: { index: false, follow: false } };

export default async function SupporterOverviewPage() {
  const profile = await requireRole("supporter");
  const supabase = await createServerSupabase();

  const { data: row } = await supabase
    .from("supporter_profiles")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();
  const supporter = (row as SupporterProfile | null) ?? null;

  const { count: usedCount } = await supabase
    .from("support_selections")
    .select("id", { count: "exact", head: true })
    .eq("selector_id", profile.id)
    .neq("status", "withdrawn");

  const used = usedCount ?? 0;
  const firstName = profile.full_name.split(" ")[0];

  // Not registered yet, or sent back for more information: show the form.
  if (!supporter || supporter.status === "draft" || supporter.status === "more_information_required") {
    return (
      <DashboardPage
        title={`Welcome, ${firstName}`}
        description="One short form and your registration goes to the review team."
      >
        {supporter?.status === "more_information_required" && (
          <Alert tone="attention" title="We need a little more" className="mb-6">
            {supporter.decision_reason ?? "Please review your answers and submit again."}
          </Alert>
        )}
        <SupporterForm existing={supporter} />
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      title={`Welcome, ${firstName}`}
      actions={
        <StatusChip tone={applicationTone(supporter.status)}>
          {APPLICATION_STATUS_LABELS[supporter.status]}
        </StatusChip>
      }
    >
      <div className="space-y-8">
        {supporter.status === "approved" ? (
          <Alert tone="positive" title="You are approved">
            You can select businesses to support. We review every selection before anything is
            confirmed with the business.
          </Alert>
        ) : supporter.status === "rejected" ? (
          <Alert tone="negative" title="Not approved">
            {supporter.decision_reason ??
              "We were not able to approve this registration. Reply to our email if you think that is wrong."}
          </Alert>
        ) : (
          <Alert tone="progress" title="With the review team">
            We check every supporter by hand. You will get an email as soon as this is done.
          </Alert>
        )}

        {/* With no cap there is nothing to count down, so the third figure is
            dropped rather than shown as a meaningless number. */}
        <section
          className={cn(
            "grid gap-px border border-rule bg-rule",
            supporter.selection_credits === null ? "sm:grid-cols-2" : "sm:grid-cols-3",
          )}
        >
          <div className="bg-paper px-5">
            <Stat
              value={supporter.selection_credits === null ? "Unlimited" : supporter.selection_credits}
              label="Selections allowed"
            />
          </div>
          <div className="bg-paper px-5">
            <Stat value={used} label="Selections used" />
          </div>
          {supporter.selection_credits !== null && (
            <div className="bg-paper px-5">
              <Stat
                value={Math.max(0, supporter.selection_credits - used)}
                label="Selections left"
                hint="Ask us if you need more"
              />
            </div>
          )}
        </section>

        {supporter.status === "approved" && (
          <div className="border-t border-rule pt-6">
            <ButtonLink href="/alajos" size="lg">
              Find a business to back
            </ButtonLink>
          </div>
        )}
      </div>
    </DashboardPage>
  );
}
