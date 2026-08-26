import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { DashboardPage } from "@/components/dashboard/shell";
import { CampaignForm } from "./campaign-form";
import type { BrandProfile } from "@/lib/types";

export const metadata: Metadata = { title: "New campaign", robots: { index: false, follow: false } };

export default async function NewCampaignPage() {
  const profile = await requireRole("brand");
  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from("brand_profiles")
    .select("id, status, preferred_categories, preferred_states, businesses_target, budget_max_ngn")
    .eq("user_id", profile.id)
    .maybeSingle();

  const brand = data as Pick<
    BrandProfile,
    "id" | "status" | "preferred_categories" | "preferred_states" | "businesses_target" | "budget_max_ngn"
  > | null;

  // Only approved brands may create campaigns; the server action checks this
  // again, this redirect just avoids showing a form that cannot be submitted.
  if (!brand || brand.status !== "approved") redirect("/dashboard/brand");

  return (
    <DashboardPage
      title="New campaign"
      description="Tell us what you are looking for. Our team reviews it and opens selections."
    >
      <CampaignForm
        defaults={{
          categories: brand.preferred_categories,
          states: brand.preferred_states,
          businessesTarget: brand.businesses_target ?? 1,
          budget: brand.budget_max_ngn,
        }}
      />
    </DashboardPage>
  );
}
