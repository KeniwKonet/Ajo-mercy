import type { renderEmail, EmailEventType } from "@/emails/templates";

/**
 * Sample payloads, one per email event.
 *
 * These live outside the test file so that the preview script can render every
 * template without importing a module whose top level runs the suite. The test
 * and the preview therefore render exactly the same thing, which is the point:
 * a preview that drifts from what is tested is worse than no preview.
 */
export const SITE = "https://ajomercy.com";

/** One plausible payload per event, so every template can be rendered. */
export const SAMPLES: { [K in EmailEventType]: Parameters<typeof renderEmail<K>>[1] } = {
  "auth.verify_email": { name: "Tola", verifyUrl: `${SITE}/auth/confirm?token_hash=abc`, role: "Alajo" },
  "auth.password_reset": { name: "Tola", resetUrl: `${SITE}/reset-password` },
  "auth.password_changed": { name: "Tola", when: "23 August 2026 at 09:14" },

  "alajo.application_received": {
    name: "Tola",
    businessName: "Iya Tola Frozen Foods",
    dashboardUrl: `${SITE}/dashboard/alajo`,
  },
  "alajo.application_approved": {
    name: "Tola",
    businessName: "Iya Tola Frozen Foods",
    profileUrl: `${SITE}/alajos/iya-tola-frozen-foods`,
    dashboardUrl: `${SITE}/dashboard/alajo`,
    message: "Your photographs were excellent.",
  },
  "alajo.more_information_required": {
    name: "Tola",
    businessName: "Iya Tola Frozen Foods",
    items: ["Identity document: the photo is too blurry to read."],
    dashboardUrl: `${SITE}/dashboard/alajo/application`,
  },
  "alajo.application_rejected": { name: "Tola", businessName: "Iya Tola Frozen Foods" },
  "alajo.information_reminder": {
    name: "Tola",
    businessName: "Iya Tola Frozen Foods",
    items: ["Identity document: the photo is too blurry to read."],
    daysWaiting: 7,
    dashboardUrl: `${SITE}/dashboard/alajo/application`,
  },
  "alajo.selected_for_consideration": {
    name: "Tola",
    businessName: "Iya Tola Frozen Foods",
    campaignName: "Q4 Small Business Drive",
    dashboardUrl: `${SITE}/dashboard/alajo`,
  },
  "alajo.support_confirmed": {
    name: "Tola",
    businessName: "Iya Tola Frozen Foods",
    supporterLabel: "An Ajo Mercy supporter",
    supportKind: "Equipment",
    amountLabel: "₦850,000",
    nextSteps: "Someone from the team will be in touch.",
    dashboardUrl: `${SITE}/dashboard/alajo`,
  },

  "supporter.application_received": { name: "Ngozi", dashboardUrl: `${SITE}/dashboard/supporter` },
  "supporter.approved": { name: "Ngozi", discoverUrl: `${SITE}/alajos`, credits: 3 },
  "supporter.rejected": { name: "Ngozi" },
  "supporter.selection_recorded": {
    name: "Ngozi",
    businessName: "Iya Tola Frozen Foods",
    remainingCredits: 2,
    discoverUrl: `${SITE}/alajos`,
  },

  "brand.application_received": {
    organisationName: "Ashcroft Foods",
    contactName: "Bola",
    dashboardUrl: `${SITE}/dashboard/brand`,
  },
  "brand.approved": {
    organisationName: "Ashcroft Foods",
    contactName: "Bola",
    dashboardUrl: `${SITE}/dashboard/brand`,
  },
  "brand.rejected": { organisationName: "Ashcroft Foods", contactName: "Bola" },

  "campaign.created": {
    contactName: "Bola",
    campaignName: "Q4 Small Business Drive",
    businessesTarget: 8,
    budgetLabel: "₦10,000,000",
    dashboardUrl: `${SITE}/dashboard/brand/campaigns/1`,
  },
  "campaign.status_changed": {
    contactName: "Bola",
    campaignName: "Q4 Small Business Drive",
    statusLabel: "Selection open",
    note: "You can now browse and select businesses.",
    dashboardUrl: `${SITE}/dashboard/brand/campaigns/1`,
  },

  "admin.review_pending": {
    adminName: "Woli",
    kind: "Alajo application",
    subjectLabel: "Iya Tola Frozen Foods",
    submittedAt: "23 Aug 2026, 09:14",
    reviewUrl: `${SITE}/admin/alajos/1`,
  },
  "admin.email_failures": { adminName: "Woli", failureCount: 3, adminUrl: `${SITE}/admin/emails` },
  "admin.queue_ageing": {
    adminName: "Woli",
    oldestDays: 11,
    waiting: 4,
    breakdown: [
      ["Waiting for review", "4"],
      ["Oldest in queue", "11 days"],
    ],
    reviewUrl: `${SITE}/admin/alajos`,
  },
};
