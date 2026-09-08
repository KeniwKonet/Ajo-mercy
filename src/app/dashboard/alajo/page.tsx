import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAlajoWorkspace } from "@/lib/data/applications";
import { createServerSupabase } from "@/lib/supabase/server";
import { DashboardPage } from "@/components/dashboard/shell";
import { Alert, ButtonLink, EmptyState, Stat } from "@/components/ui/primitives";
import { StatusBadge, StatusExplainer, type StatusKind } from "@/components/ui/trust";
import {
  ALAJO_PROFILE_STATUS_LABELS,
  APPLICATION_STATUS_LABELS,
  applicationTone,
} from "@/lib/state-machine";
import { formatDate, formatNaira, formatRelative } from "@/lib/format";
import type { ApplicationStatus, SupportConfirmation } from "@/lib/types";

export const metadata: Metadata = { title: "Overview", robots: { index: false, follow: false } };

export default async function AlajoOverviewPage() {
  const profile = await requireRole("alajo");
  const workspace = await getAlajoWorkspace(profile.id);
  const { application, openRequests, profile: publicProfile, completeness } = workspace;

  // Only confirmations the applicant is allowed to see; RLS hides pending ones.
  const supabase = await createServerSupabase();
  const { data: confirmationRows } = publicProfile
    ? await supabase
        .from("support_confirmations")
        .select("*")
        .eq("alajo_profile_id", publicProfile.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const confirmations = (confirmationRows ?? []) as SupportConfirmation[];

  if (!application) {
    return (
      <DashboardPage title={`Welcome, ${profile.full_name.split(" ")[0]}`}>
        <EmptyState
          title="You have not started an application"
          description="Tell us about your business and what is standing in the way. It takes about fifteen minutes, and you can save and come back."
          action={<ButtonLink href="/dashboard/alajo/application">Start my application</ButtonLink>}
        />
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      title={`Welcome, ${profile.full_name.split(" ")[0]}`}
      description={application.business_name ?? undefined}
      actions={<StatusBadge kind={statusKind(application.status)} />}
    >
      <div className="space-y-8">
        {/* The badge alone makes someone guess. The sentence tells them what
            is true right now and whether anything is expected of them. */}
        <StatusExplainer kind={statusKind(application.status)} />
        {/* The single most important thing on this page: what to do next. */}
        {application.status === "more_information_required" && (
          <Alert tone="attention" title="We need a few things from you">
            <p>
              Your application is paused until these are updated. Everything else you have
              submitted is saved.
            </p>
            <ul className="mt-3 space-y-2">
              {openRequests.map((request) => (
                <li key={request.id} className="border-l border-orange/40 pl-3">
                  <p className="text-sm text-ink">{request.message}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    Asked {formatRelative(request.created_at)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              <Link href="/dashboard/alajo/application" className="link-rule font-medium text-ink">
                Update my application
              </Link>
            </p>
          </Alert>
        )}

        {application.status === "draft" && (
          <Alert tone="progress" title="Your application is still a draft">
            It is {completeness}% complete. Nothing is sent to our team until you submit it.{" "}
            <Link href="/dashboard/alajo/application" className="link-rule font-medium text-ink">
              Continue
            </Link>
          </Alert>
        )}

        {(application.status === "submitted" || application.status === "under_review") && (
          <Alert tone="progress" title="With the review team">
            Submitted {formatDate(application.submitted_at)}. A person reads every application in
            the order it arrived. We will email you the moment there is a decision.
          </Alert>
        )}

        {application.status === "rejected" && (
          <Alert tone="negative" title="Not approved">
            {application.applicant_message ??
              "We were not able to take this application forward. You are welcome to apply again in future."}
          </Alert>
        )}

        {application.status === "approved" && publicProfile && (
          <Alert tone="positive" title="Your profile is live">
            <p>
              Supporters and brands can now find {application.business_name}.{" "}
              <Link href={`/alajos/${publicProfile.slug}`} className="link-rule font-medium text-ink">
                View your public profile
              </Link>
            </p>
          </Alert>
        )}

        {/* --------------------------------------------------------- status */}
        <section className="grid gap-3.5 sm:grid-cols-3">
          <div className="widget">
            <Stat
              value={`${completeness}%`}
              label="Application complete"
              hint={completeness === 100 ? "Everything we asked for" : "Some fields still empty"}
            />
          </div>
          <div className="widget">
            <Stat
              value={publicProfile ? ALAJO_PROFILE_STATUS_LABELS[publicProfile.status] : "Not published"}
              label="Public profile"
              hint={publicProfile?.approved_at ? `Live since ${formatDate(publicProfile.approved_at)}` : "Published after approval"}
            />
          </div>
          <div className="widget">
            <Stat
              value={publicProfile?.view_count ?? null}
              label="Profile views"
              hint="Since your profile went live"
            />
          </div>
        </section>

        {/* -------------------------------------------------- support state */}
        <section>
          <h2 className="border-b border-rule pb-3 font-display text-xl">Support</h2>
          {confirmations.length === 0 ? (
            <p className="pt-4 text-sm leading-relaxed text-ink-soft">
              Nothing confirmed yet. If a supporter or brand selects your business, we will tell you
              it is under consideration first. Confirmed support is a separate step and you will get
              a separate email for it.
            </p>
          ) : (
            <ul className="grid-rules pt-1">
              {confirmations.map((confirmation) => (
                <li key={confirmation.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium text-ink">
                      {confirmation.supporter_label ?? "An Ajo Mercy supporter"}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {confirmation.support_kind ?? "Support"}
                      {confirmation.amount_ngn ? ` · ${formatNaira(confirmation.amount_ngn)}` : ""}
                    </p>
                  </div>
                  <StatusBadge
                    size="sm"
                    kind={confirmation.status === "completed" ? "confirmed" : "selected"}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="border-t border-rule pt-6 text-xs leading-relaxed text-ink-faint">
          Being listed does not guarantee support. Nobody from Ajo Mercy will ever ask you for a fee,
          a token payment or your bank password. If anyone does, it is not us.
        </p>
      </div>
    </DashboardPage>
  );
}

/**
 * The application state machine has its own vocabulary; the interface has one
 * shared one. This is the single place the two are mapped, so a status word
 * never differs between the applicant's screen and the reviewer's.
 */
function statusKind(status: ApplicationStatus): StatusKind {
  switch (status) {
    case "draft":
      return "draft";
    case "submitted":
      return "submitted";
    case "under_review":
      return "review";
    case "more_information_required":
      return "needs_info";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    default:
      return "submitted";
  }
}
