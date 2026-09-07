import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { ensureApplication, getAlajoWorkspace } from "@/lib/data/applications";
import { DashboardPage } from "@/components/dashboard/shell";
import { ApplicationForm } from "./application-form";

export const metadata: Metadata = {
  title: "My application",
  robots: { index: false, follow: false },
};

export default async function AlajoApplicationPage() {
  const profile = await requireRole("alajo");
  // Creating the draft here means the form always has a row to write into,
  // including on a first visit.
  await ensureApplication(profile.id);
  const workspace = await getAlajoWorkspace(profile.id);

  return (
    <DashboardPage
      title="Tell us what you are building"
      description="Five short steps. Everything saves as you go, and nothing reaches the review team until you send it."
    >
      <ApplicationForm
        application={workspace.application!}
        media={workspace.media}
        openRequests={workspace.openRequests}
        editable={workspace.editable}
        completeness={workspace.completeness}
        missing={workspace.missing}
      />
    </DashboardPage>
  );
}
