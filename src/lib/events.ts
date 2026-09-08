import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { ANALYTICS_EVENTS, track } from "@/lib/analytics";
import { siteUrl } from "@/lib/env";
import { formatNaira } from "@/lib/format";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/state-machine";
import type { CampaignStatus } from "@/lib/types";

/**
 * Domain events. Business logic emits one of these and stops caring what
 * happens next; notifications, email and analytics are wired up here and only
 * here. Nothing else in the codebase calls `sendEmail` for product mail.
 */
export type DomainEvent =
  | { type: "auth.signup"; userId: string; email: string; name: string; role: "alajo" | "supporter" | "brand"; verifyUrl: string }
  | { type: "alajo.application_submitted"; applicationId: string; resubmission: boolean }
  | { type: "alajo.application_approved"; applicationId: string; message?: string }
  | { type: "alajo.information_requested"; applicationId: string; items: string[]; message?: string }
  | { type: "alajo.application_rejected"; applicationId: string; message?: string }
  | { type: "alajo.selected_for_consideration"; alajoProfileId: string; campaignId: string | null }
  | { type: "support.confirmed"; confirmationId: string }
  | { type: "supporter.submitted"; userId: string }
  | { type: "supporter.approved"; userId: string }
  | { type: "supporter.rejected"; userId: string; message?: string }
  | { type: "supporter.selection_recorded"; selectionId: string }
  | { type: "brand.submitted"; userId: string }
  | { type: "brand.approved"; userId: string }
  | { type: "brand.rejected"; userId: string; message?: string }
  | { type: "campaign.created"; campaignId: string }
  | { type: "campaign.status_changed"; campaignId: string; note: string };

/**
 * Emitting never throws into the caller. An approval that succeeded must not
 * appear to fail because a notification could not be delivered; the failure is
 * logged and visible in the admin email view instead.
 */
export async function emit(event: DomainEvent): Promise<void> {
  try {
    await handle(event);
  } catch (err) {
    console.error(`[events] handler failed for ${event.type}`, err);
  }
}

// ------------------------------------------------------------- helpers -----

export async function notify(userId: string, kind: string, title: string, body: string, href: string) {
  const admin = createAdminSupabase();
  await admin.from("notifications").insert({ user_id: userId, kind, title, body, href });
}

export interface Recipient {
  userId: string;
  email: string;
  name: string;
}

export async function recipientFor(userId: string): Promise<Recipient | null> {
  const admin = createAdminSupabase();
  const { data } = await admin.from("profiles").select("id, email, full_name").eq("id", userId).maybeSingle();
  if (!data) return null;
  const row = data as { id: string; email: string; full_name: string };
  return { userId: row.id, email: row.email, name: firstName(row.full_name) };
}

export function firstName(fullName: string): string {
  return (fullName.trim().split(/\s+/)[0] ?? fullName).trim();
}

/** Staff who should be told that something is waiting for review. */
export async function staffRecipients(): Promise<Recipient[]> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("role", ["super_admin", "admin"])
    .eq("status", "approved");
  return ((data ?? []) as Array<{ id: string; email: string; full_name: string }>).map((r) => ({
    userId: r.id,
    email: r.email,
    name: firstName(r.full_name),
  }));
}

async function alertStaff(kind: string, subjectLabel: string, reviewPath: string, submittedAt: string) {
  const staff = await staffRecipients();
  await Promise.all(
    staff.map((admin) =>
      sendEmail({
        type: "admin.review_pending",
        to: admin.email,
        recipientUserId: admin.userId,
        data: {
          adminName: admin.name,
          kind,
          subjectLabel,
          submittedAt: new Date(submittedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }),
          reviewUrl: `${siteUrl}${reviewPath}`,
        },
      }),
    ),
  );
  await Promise.all(
    staff.map((admin) => notify(admin.userId, "review_pending", `${kind} waiting`, subjectLabel, reviewPath)),
  );
}

// ------------------------------------------------------------ handlers -----

async function handle(event: DomainEvent): Promise<void> {
  const admin = createAdminSupabase();

  switch (event.type) {
    case "auth.signup": {
      await sendEmail({
        type: "auth.verify_email",
        to: event.email,
        recipientUserId: event.userId,
        data: {
          name: firstName(event.name),
          verifyUrl: event.verifyUrl,
          role: event.role === "alajo" ? "Alajo" : event.role === "brand" ? "brand" : "supporter",
        },
      });
      return;
    }

    case "alajo.application_submitted": {
      const { data } = await admin
        .from("alajo_applications")
        .select("id, user_id, business_name, submitted_at")
        .eq("id", event.applicationId)
        .single();
      if (!data) return;
      const app = data as { id: string; user_id: string; business_name: string | null; submitted_at: string };
      const to = await recipientFor(app.user_id);
      if (!to) return;

      await sendEmail({
        type: "alajo.application_received",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "alajo_applications",
        relatedId: app.id,
        data: {
          name: to.name,
          businessName: app.business_name ?? "your business",
          dashboardUrl: `${siteUrl}/dashboard/alajo`,
        },
      });
      await notify(
        to.userId,
        "application_submitted",
        "Application submitted",
        "We will email you when there is an update.",
        "/dashboard/alajo",
      );
      await alertStaff(
        "Alajo application",
        app.business_name ?? "An Alajo application",
        `/admin/alajos/${app.id}`,
        app.submitted_at ?? new Date().toISOString(),
      );
      await track(
        event.resubmission ? ANALYTICS_EVENTS.APPLICATION_RESUBMITTED : ANALYTICS_EVENTS.APPLICATION_SUBMITTED,
        { userId: app.user_id, role: "alajo", props: { application_id: app.id } },
      );
      return;
    }

    case "alajo.application_approved": {
      const { data } = await admin
        .from("alajo_applications")
        .select("id, user_id, business_name, applicant_message")
        .eq("id", event.applicationId)
        .single();
      if (!data) return;
      const app = data as { id: string; user_id: string; business_name: string | null; applicant_message: string | null };
      const to = await recipientFor(app.user_id);
      if (!to) return;

      const { data: profile } = await admin
        .from("alajo_profiles")
        .select("slug")
        .eq("application_id", app.id)
        .maybeSingle();
      const slug = (profile as { slug: string } | null)?.slug;

      await sendEmail({
        type: "alajo.application_approved",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "alajo_applications",
        relatedId: app.id,
        idempotencyKey: `alajo_approved:${app.id}`,
        data: {
          name: to.name,
          businessName: app.business_name ?? "your business",
          profileUrl: slug ? `${siteUrl}/alajos/${slug}` : `${siteUrl}/alajos`,
          dashboardUrl: `${siteUrl}/dashboard/alajo`,
          ...(event.message ? { message: event.message } : {}),
        },
      });
      await notify(
        to.userId,
        "application_approved",
        "You are approved",
        "Your profile is live on Ajo Mercy.",
        "/dashboard/alajo",
      );
      await track(ANALYTICS_EVENTS.APPLICATION_APPROVED, {
        userId: app.user_id,
        role: "alajo",
        props: { application_id: app.id },
      });
      return;
    }

    case "alajo.information_requested": {
      const { data } = await admin
        .from("alajo_applications")
        .select("id, user_id, business_name")
        .eq("id", event.applicationId)
        .single();
      if (!data) return;
      const app = data as { id: string; user_id: string; business_name: string | null };
      const to = await recipientFor(app.user_id);
      if (!to) return;

      await sendEmail({
        type: "alajo.more_information_required",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "alajo_applications",
        relatedId: app.id,
        data: {
          name: to.name,
          businessName: app.business_name ?? "your business",
          items: event.items,
          dashboardUrl: `${siteUrl}/dashboard/alajo/application`,
          ...(event.message ? { message: event.message } : {}),
        },
      });
      await notify(
        to.userId,
        "information_requested",
        "We need more information",
        `${event.items.length} item${event.items.length === 1 ? "" : "s"} to update.`,
        "/dashboard/alajo/application",
      );
      return;
    }

    case "alajo.application_rejected": {
      const { data } = await admin
        .from("alajo_applications")
        .select("id, user_id, business_name")
        .eq("id", event.applicationId)
        .single();
      if (!data) return;
      const app = data as { id: string; user_id: string; business_name: string | null };
      const to = await recipientFor(app.user_id);
      if (!to) return;

      await sendEmail({
        type: "alajo.application_rejected",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "alajo_applications",
        relatedId: app.id,
        idempotencyKey: `alajo_rejected:${app.id}`,
        data: {
          name: to.name,
          businessName: app.business_name ?? "your business",
          ...(event.message ? { message: event.message } : {}),
        },
      });
      return;
    }

    case "alajo.selected_for_consideration": {
      const { data } = await admin
        .from("alajo_profiles")
        .select("id, user_id, business_name")
        .eq("id", event.alajoProfileId)
        .single();
      if (!data) return;
      const profile = data as { id: string; user_id: string; business_name: string };
      const to = await recipientFor(profile.user_id);
      if (!to) return;

      let campaignName: string | null = null;
      if (event.campaignId) {
        const { data: c } = await admin
          .from("support_campaigns")
          .select("name")
          .eq("id", event.campaignId)
          .maybeSingle();
        campaignName = (c as { name: string } | null)?.name ?? null;
      }

      await sendEmail({
        type: "alajo.selected_for_consideration",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "alajo_profiles",
        relatedId: profile.id,
        idempotencyKey: `alajo_considered:${profile.id}:${event.campaignId ?? "none"}`,
        data: {
          name: to.name,
          businessName: profile.business_name,
          campaignName,
          dashboardUrl: `${siteUrl}/dashboard/alajo`,
        },
      });
      await notify(
        to.userId,
        "selected_for_consideration",
        "Selected for consideration",
        "This is not a confirmation of support yet.",
        "/dashboard/alajo",
      );
      return;
    }

    case "support.confirmed": {
      const { data } = await admin
        .from("support_confirmations")
        .select("id, alajo_profile_id, amount_ngn, support_kind, supporter_label")
        .eq("id", event.confirmationId)
        .single();
      if (!data) return;
      const conf = data as {
        id: string;
        alajo_profile_id: string;
        amount_ngn: number | null;
        support_kind: string | null;
        supporter_label: string | null;
      };

      const { data: p } = await admin
        .from("alajo_profiles")
        .select("user_id, business_name")
        .eq("id", conf.alajo_profile_id)
        .single();
      if (!p) return;
      const profile = p as { user_id: string; business_name: string };
      const to = await recipientFor(profile.user_id);
      if (!to) return;

      await sendEmail({
        type: "alajo.support_confirmed",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "support_confirmations",
        relatedId: conf.id,
        idempotencyKey: `support_confirmed:${conf.id}`,
        data: {
          name: to.name,
          businessName: profile.business_name,
          supporterLabel: conf.supporter_label ?? "An Ajo Mercy supporter",
          supportKind: conf.support_kind,
          amountLabel: conf.amount_ngn ? formatNaira(conf.amount_ngn) : null,
          nextSteps:
            "Someone from the Ajo Mercy team will be in touch to introduce you to your supporter and agree how the support is delivered.",
          dashboardUrl: `${siteUrl}/dashboard/alajo`,
        },
      });
      await notify(
        profile.user_id,
        "support_confirmed",
        "Support confirmed",
        `Support for ${profile.business_name} is confirmed.`,
        "/dashboard/alajo",
      );
      await track(ANALYTICS_EVENTS.SUPPORT_CONFIRMED, {
        userId: profile.user_id,
        role: "alajo",
        props: { alajo_profile_id: conf.alajo_profile_id },
      });
      return;
    }

    case "supporter.submitted": {
      const to = await recipientFor(event.userId);
      if (!to) return;
      await sendEmail({
        type: "supporter.application_received",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "supporter_profiles",
        data: { name: to.name, dashboardUrl: `${siteUrl}/dashboard/supporter` },
      });
      await alertStaff("Supporter registration", to.name, "/admin/supporters", new Date().toISOString());
      await track(ANALYTICS_EVENTS.SUPPORTER_REGISTERED, { userId: event.userId, role: "supporter" });
      return;
    }

    case "supporter.approved": {
      const to = await recipientFor(event.userId);
      if (!to) return;
      const { data } = await admin
        .from("supporter_profiles")
        .select("selection_credits")
        .eq("user_id", event.userId)
        .maybeSingle();
      await sendEmail({
        type: "supporter.approved",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "supporter_profiles",
        idempotencyKey: `supporter_approved:${event.userId}`,
        data: {
          name: to.name,
          discoverUrl: `${siteUrl}/alajos`,
          credits: (data as { selection_credits: number | null } | null)?.selection_credits ?? null,
        },
      });
      await notify(to.userId, "supporter_approved", "You are approved", "Start browsing verified businesses.", "/alajos");
      await track(ANALYTICS_EVENTS.SUPPORTER_APPROVED, { userId: event.userId, role: "supporter" });
      return;
    }

    case "supporter.rejected": {
      const to = await recipientFor(event.userId);
      if (!to) return;
      await sendEmail({
        type: "supporter.rejected",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "supporter_profiles",
        idempotencyKey: `supporter_rejected:${event.userId}`,
        data: { name: to.name, ...(event.message ? { message: event.message } : {}) },
      });
      return;
    }

    case "supporter.selection_recorded": {
      const { data } = await admin
        .from("support_selections")
        .select("id, selector_id, alajo_profile_id, campaign_id")
        .eq("id", event.selectionId)
        .single();
      if (!data) return;
      const sel = data as {
        id: string;
        selector_id: string;
        alajo_profile_id: string;
        campaign_id: string | null;
      };
      const to = await recipientFor(sel.selector_id);
      const { data: p } = await admin
        .from("alajo_profiles")
        .select("business_name")
        .eq("id", sel.alajo_profile_id)
        .single();
      const businessName = (p as { business_name: string } | null)?.business_name ?? "the business";

      if (to) {
        const { data: sp } = await admin
          .from("supporter_profiles")
          .select("selection_credits")
          .eq("user_id", sel.selector_id)
          .maybeSingle();
        const credits = (sp as { selection_credits: number | null } | null)?.selection_credits ?? null;

        await sendEmail({
          type: "supporter.selection_recorded",
          to: to.email,
          recipientUserId: to.userId,
          relatedTable: "support_selections",
          relatedId: sel.id,
          idempotencyKey: `selection_recorded:${sel.id}`,
          data: {
            name: to.name,
            businessName,
            remainingCredits: credits,
            discoverUrl: `${siteUrl}/alajos`,
          },
        });
      }

      // The Alajo is told only that they are under consideration, never that
      // they have "won" anything. Confirmation is a separate admin decision.
      await emit({
        type: "alajo.selected_for_consideration",
        alajoProfileId: sel.alajo_profile_id,
        campaignId: sel.campaign_id,
      });

      await track(ANALYTICS_EVENTS.SUPPORTER_SELECTION, {
        userId: sel.selector_id,
        role: "supporter",
        props: { alajo_profile_id: sel.alajo_profile_id, campaign_id: sel.campaign_id ?? undefined },
      });
      return;
    }

    case "brand.submitted": {
      const to = await recipientFor(event.userId);
      const { data } = await admin
        .from("brand_profiles")
        .select("organisation_name, contact_person_name")
        .eq("user_id", event.userId)
        .maybeSingle();
      const brand = data as { organisation_name: string | null; contact_person_name: string | null } | null;
      if (!to || !brand) return;

      await sendEmail({
        type: "brand.application_received",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "brand_profiles",
        data: {
          organisationName: brand.organisation_name ?? "your organisation",
          contactName: firstName(brand.contact_person_name ?? to.name),
          dashboardUrl: `${siteUrl}/dashboard/brand`,
        },
      });
      await alertStaff(
        "Brand registration",
        brand.organisation_name ?? "A brand registration",
        "/admin/brands",
        new Date().toISOString(),
      );
      await track(ANALYTICS_EVENTS.BRAND_REGISTERED, { userId: event.userId, role: "brand" });
      return;
    }

    case "brand.approved": {
      const to = await recipientFor(event.userId);
      const { data } = await admin
        .from("brand_profiles")
        .select("organisation_name, contact_person_name")
        .eq("user_id", event.userId)
        .maybeSingle();
      const brand = data as { organisation_name: string | null; contact_person_name: string | null } | null;
      if (!to || !brand) return;

      await sendEmail({
        type: "brand.approved",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "brand_profiles",
        idempotencyKey: `brand_approved:${event.userId}`,
        data: {
          organisationName: brand.organisation_name ?? "your organisation",
          contactName: firstName(brand.contact_person_name ?? to.name),
          dashboardUrl: `${siteUrl}/dashboard/brand/campaigns/new`,
        },
      });
      await notify(to.userId, "brand_approved", "Your organisation is approved", "You can now create a campaign.", "/dashboard/brand");
      await track(ANALYTICS_EVENTS.BRAND_APPROVED, { userId: event.userId, role: "brand" });
      return;
    }

    case "brand.rejected": {
      const to = await recipientFor(event.userId);
      const { data } = await admin
        .from("brand_profiles")
        .select("organisation_name, contact_person_name")
        .eq("user_id", event.userId)
        .maybeSingle();
      const brand = data as { organisation_name: string | null; contact_person_name: string | null } | null;
      if (!to || !brand) return;

      await sendEmail({
        type: "brand.rejected",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "brand_profiles",
        idempotencyKey: `brand_rejected:${event.userId}`,
        data: {
          organisationName: brand.organisation_name ?? "your organisation",
          contactName: firstName(brand.contact_person_name ?? to.name),
          ...(event.message ? { message: event.message } : {}),
        },
      });
      return;
    }

    case "campaign.created": {
      const { data } = await admin
        .from("support_campaigns")
        .select("id, name, businesses_target, budget_ngn, brand_id, created_by")
        .eq("id", event.campaignId)
        .single();
      if (!data) return;
      const campaign = data as {
        id: string;
        name: string;
        businesses_target: number;
        budget_ngn: number | null;
        brand_id: string | null;
        created_by: string;
      };
      const to = await recipientFor(campaign.created_by);
      if (to) {
        await sendEmail({
          type: "campaign.created",
          to: to.email,
          recipientUserId: to.userId,
          relatedTable: "support_campaigns",
          relatedId: campaign.id,
          idempotencyKey: `campaign_created:${campaign.id}`,
          data: {
            contactName: to.name,
            campaignName: campaign.name,
            businessesTarget: campaign.businesses_target,
            budgetLabel: campaign.budget_ngn ? formatNaira(campaign.budget_ngn) : null,
            dashboardUrl: `${siteUrl}/dashboard/brand/campaigns/${campaign.id}`,
          },
        });
      }
      await alertStaff("Campaign", campaign.name, `/admin/campaigns/${campaign.id}`, new Date().toISOString());
      await track(ANALYTICS_EVENTS.CAMPAIGN_CREATED, {
        userId: campaign.created_by,
        props: { campaign_id: campaign.id },
      });
      return;
    }

    case "campaign.status_changed": {
      const { data } = await admin
        .from("support_campaigns")
        .select("id, name, status, created_by")
        .eq("id", event.campaignId)
        .single();
      if (!data) return;
      const campaign = data as { id: string; name: string; status: CampaignStatus; created_by: string };
      const to = await recipientFor(campaign.created_by);
      if (!to) return;

      await sendEmail({
        type: "campaign.status_changed",
        to: to.email,
        recipientUserId: to.userId,
        relatedTable: "support_campaigns",
        relatedId: campaign.id,
        data: {
          contactName: to.name,
          campaignName: campaign.name,
          statusLabel: CAMPAIGN_STATUS_LABELS[campaign.status],
          note: event.note,
          dashboardUrl: `${siteUrl}/dashboard/brand/campaigns/${campaign.id}`,
        },
      });
      return;
    }
  }
}
