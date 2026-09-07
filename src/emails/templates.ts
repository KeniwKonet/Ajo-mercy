import {
  button,
  detailList,
  escapeHtml,
  noticePanel,
  paragraph,
  paragraphRaw,
  quote,
  renderLayout,
  toPlainText,
} from "@/emails/layout";

/**
 * Every transactional email the platform can send, keyed by event type.
 * Adding an event here is the only way to send mail: `sendEmail` accepts no
 * free-form HTML, so nothing can go out unbranded or unlogged.
 */
export interface EmailTemplateData {
  "auth.verify_email": { name: string; verifyUrl: string; role: "Alajo" | "supporter" | "brand" };
  "auth.password_reset": { name: string; resetUrl: string };
  "auth.password_changed": { name: string; when: string };

  "alajo.application_received": { name: string; businessName: string; dashboardUrl: string };
  "alajo.application_approved": {
    name: string;
    businessName: string;
    profileUrl: string;
    dashboardUrl: string;
    message?: string;
  };
  "alajo.more_information_required": {
    name: string;
    businessName: string;
    items: string[];
    dashboardUrl: string;
    message?: string;
  };
  "alajo.application_rejected": { name: string; businessName: string; message?: string };
  "alajo.selected_for_consideration": {
    name: string;
    businessName: string;
    campaignName: string | null;
    dashboardUrl: string;
  };
  "alajo.support_confirmed": {
    name: string;
    businessName: string;
    supporterLabel: string;
    supportKind: string | null;
    amountLabel: string | null;
    nextSteps: string;
    dashboardUrl: string;
  };

  "supporter.application_received": { name: string; dashboardUrl: string };
  "supporter.approved": { name: string; discoverUrl: string; credits: number | null };
  "supporter.rejected": { name: string; message?: string };
  "supporter.selection_recorded": {
    name: string;
    businessName: string;
    remainingCredits: number | null;
    discoverUrl: string;
  };

  "brand.application_received": { organisationName: string; contactName: string; dashboardUrl: string };
  "brand.approved": { organisationName: string; contactName: string; dashboardUrl: string };
  "brand.rejected": { organisationName: string; contactName: string; message?: string };

  "campaign.created": {
    contactName: string;
    campaignName: string;
    businessesTarget: number;
    budgetLabel: string | null;
    dashboardUrl: string;
  };
  "campaign.status_changed": {
    contactName: string;
    campaignName: string;
    statusLabel: string;
    note: string;
    dashboardUrl: string;
  };

  "admin.review_pending": {
    adminName: string;
    kind: string;
    subjectLabel: string;
    submittedAt: string;
    reviewUrl: string;
  };
  "admin.email_failures": { adminName: string; failureCount: number; adminUrl: string };
}

export type EmailEventType = keyof EmailTemplateData;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const REGISTRATION_DISCLAIMER =
  "Registering with Ajo Mercy does not guarantee selection or support. Support depends on the relevant campaign, our verification process and final approval.";

type Renderer<K extends EmailEventType> = (
  data: EmailTemplateData[K],
  siteUrl: string,
) => { subject: string; previewText: string; kicker?: string; headline: string; body: string; footnote?: string };

const renderers: { [K in EmailEventType]: Renderer<K> } = {
  "auth.verify_email": (d) => ({
    subject: "Confirm your email to continue",
    previewText: "One click and your Ajo Mercy account is active.",
    kicker: "Confirm your email",
    headline: `Welcome, ${d.name}`,
    body:
      paragraph(
        `You started an Ajo Mercy account as ${d.role === "Alajo" ? "an Alajo" : `a ${d.role}`}. Confirm this address so we know we can reach you.`,
      ) +
      button("Confirm my email", d.verifyUrl) +
      paragraph("This link expires in 24 hours. If you did not start this, you can ignore this email."),
  }),

  "auth.password_reset": (d) => ({
    subject: "Reset your Ajo Mercy password",
    previewText: "A link to set a new password.",
    kicker: "Account security",
    headline: "Set a new password",
    body:
      paragraph(`Hello ${d.name}, use the link below to choose a new password.`) +
      button("Choose a new password", d.resetUrl) +
      paragraph(
        "The link works once and expires in one hour. If you did not ask for this, nothing has changed on your account.",
      ),
  }),

  "auth.password_changed": (d) => ({
    subject: "Your password was changed",
    previewText: "Confirming a change to your account.",
    kicker: "Account security",
    headline: "Your password was changed",
    body:
      paragraph(`Hello ${d.name}, the password on your Ajo Mercy account was changed on ${d.when}.`) +
      paragraph("If this was not you, contact us straight away so we can secure the account."),
  }),

  "alajo.application_received": (d) => ({
    subject: `We have your application for ${d.businessName}`,
    previewText: "Your application is with our review team.",
    kicker: "Application received",
    headline: "We have your application",
    body:
      paragraph(
        `Thank you, ${d.name}. ${d.businessName} is now in the review queue. A member of the Ajo Mercy team reads every application, so this is a person reading your story, not an automated check.`,
      ) +
      paragraph(
        "You will hear from us when a decision is made, or sooner if we need anything else from you. You can check your status any time.",
      ) +
      button("Open my dashboard", d.dashboardUrl),
    footnote: REGISTRATION_DISCLAIMER,
  }),

  "alajo.application_approved": (d) => ({
    subject: `${d.businessName} is approved`,
    previewText: "Your profile is now live on Ajo Mercy.",
    kicker: "Approved",
    headline: `${d.businessName} is verified`,
    body:
      paragraph(
        `${d.name}, your application has been approved. Your business profile is live and can now be found by supporters and brands looking for businesses to back.`,
      ) +
      (d.message ? quote(d.message, "From the review team") : "") +
      button("View my public profile", d.profileUrl) +
      paragraph(
        "Keep your profile current. Businesses with a clear story and recent photographs get read all the way through far more often.",
      ) +
      paragraphRaw(
        `Manage everything from <a href="${escapeHtml(d.dashboardUrl)}" style="color:#0F3D2E;">your dashboard</a>.`,
      ),
    footnote:
      "Being verified means we have reviewed your business. It does not by itself mean support has been arranged.",
  }),

  "alajo.more_information_required": (d) => ({
    subject: `We need a little more on ${d.businessName}`,
    previewText: "A few things to update before we can finish reviewing.",
    kicker: "Action needed",
    headline: "A few things to add",
    body:
      paragraph(
        `${d.name}, we have read your application for ${d.businessName} and it is nearly there. Before we can finish the review, we need the following.`,
      ) +
      noticePanel("What to update", d.items) +
      (d.message ? quote(d.message, "From the review team") : "") +
      paragraph("Your dashboard shows exactly which fields these map to. Update them and resubmit when ready.") +
      button("Update my application", d.dashboardUrl),
  }),

  "alajo.application_rejected": (d) => ({
    subject: `About your Ajo Mercy application`,
    previewText: "An update on your application.",
    kicker: "Application update",
    headline: "We cannot take this one forward",
    body:
      paragraph(
        `${d.name}, thank you for applying with ${d.businessName}. After review, we are not able to take this application forward at the moment.`,
      ) +
      (d.message ? quote(d.message, "From the review team") : "") +
      paragraph(
        "This is not a judgement of your business. Our review is limited by what we can verify and by what current support campaigns are looking for, and both of those change.",
      ) +
      paragraph("You are welcome to apply again in future."),
  }),

  "alajo.selected_for_consideration": (d) => ({
    subject: `${d.businessName} has been selected for consideration`,
    previewText: "Someone has chosen your business. Here is what happens next.",
    kicker: "Selected for consideration",
    headline: "Your business has been selected for consideration",
    body:
      paragraph(
        `${d.name}, ${d.businessName} has been selected for consideration${d.campaignName ? ` as part of ${d.campaignName}` : ""}.`,
      ) +
      noticePanel("Read this carefully", [
        "This is not a confirmation of support.",
        "Every selection goes to the Ajo Mercy team for review and final approval.",
        "We will write to you again if and when support is confirmed.",
        "Nobody from Ajo Mercy will ever ask you to pay a fee to receive support.",
      ]) +
      button("Open my dashboard", d.dashboardUrl),
  }),

  "alajo.support_confirmed": (d) => ({
    subject: `Confirmed: support for ${d.businessName}`,
    previewText: "Support for your business has been confirmed.",
    kicker: "Support confirmed",
    headline: "It is confirmed",
    body:
      paragraph(
        `${d.name}, support for ${d.businessName} has been reviewed and confirmed by the Ajo Mercy team.`,
      ) +
      detailList(
        [
          ["Business", d.businessName],
          ["Supported by", d.supporterLabel],
          ...(d.supportKind ? ([["Type of support", d.supportKind]] as Array<[string, string]>) : []),
          ...(d.amountLabel ? ([["Amount", d.amountLabel]] as Array<[string, string]>) : []),
        ].filter(Boolean) as Array<[string, string]>,
      ) +
      paragraph(d.nextSteps) +
      button("Open my dashboard", d.dashboardUrl) +
      paragraph(
        "Ajo Mercy does not hold or transfer funds. Arrangements are made directly between you and your supporter, and we stay in the loop to make sure it happens.",
      ),
    footnote:
      "Nobody from Ajo Mercy will ever ask you for a fee, a token payment or your bank password. If anyone does, it is not us.",
  }),

  "supporter.application_received": (d) => ({
    subject: "We have your supporter registration",
    previewText: "Your registration is with our team.",
    kicker: "Registration received",
    headline: "We have your registration",
    body:
      paragraph(
        `Thank you, ${d.name}. We review every supporter registration by hand, which is slower than an instant signup and the reason the businesses on this platform can be trusted.`,
      ) +
      paragraph("We will email you as soon as your account is approved.") +
      button("Open my dashboard", d.dashboardUrl),
  }),

  "supporter.approved": (d) => ({
    subject: "You are approved to support",
    previewText: "You can now browse and select verified businesses.",
    kicker: "Approved",
    headline: "You are approved",
    body:
      paragraph(
        `${d.name}, your supporter account is approved. You can now browse verified Nigerian businesses and select the ones you want to support.`,
      ) +
      paragraph(
        d.credits === null
          ? "You can select as many businesses as you want to back. Choosing a business tells us you are interested; it is not a promise of money, and nothing is asked of you until the team has spoken to you."
          : `Your account is limited to ${d.credits} ${d.credits === 1 ? "selection" : "selections"}. Get in touch if you need that changed.`,
      ) +
      button("Find a business to back", d.discoverUrl),
  }),

  "supporter.rejected": (d) => ({
    subject: "About your supporter registration",
    previewText: "An update on your registration.",
    kicker: "Registration update",
    headline: "We cannot approve this registration",
    body:
      paragraph(`${d.name}, we are not able to approve your supporter registration at this time.`) +
      (d.message ? quote(d.message, "From the review team") : "") +
      paragraph("If you think this is a mistake, reply to this email and we will take another look."),
  }),

  "supporter.selection_recorded": (d) => ({
    subject: `Your selection of ${d.businessName} is recorded`,
    previewText: "We have recorded your selection.",
    kicker: "Selection recorded",
    headline: "Selection recorded",
    body:
      paragraph(`${d.name}, we have recorded your selection of ${d.businessName}.`) +
      paragraph(
        "The Ajo Mercy team reviews selections before any support is confirmed, so the business has not been told they are receiving anything yet. That step is deliberate.",
      ) +
      paragraph(
        d.remainingCredits === null
          ? "You can select as many businesses as you want to back."
          : `You have ${d.remainingCredits} ${d.remainingCredits === 1 ? "selection" : "selections"} left.`,
      ) +
      button("Keep browsing", d.discoverUrl),
  }),

  "brand.application_received": (d) => ({
    subject: `We have ${d.organisationName}'s registration`,
    previewText: "Your organisation's registration is under review.",
    kicker: "Registration received",
    headline: "We have your registration",
    body:
      paragraph(
        `Thank you, ${d.contactName}. We have received the registration for ${d.organisationName} and it is with our team.`,
      ) +
      paragraph(
        "We verify every organisation before it can browse or select businesses. Expect to hear from us shortly.",
      ) +
      button("Open the brand dashboard", d.dashboardUrl),
  }),

  "brand.approved": (d) => ({
    subject: `${d.organisationName} is approved`,
    previewText: "Your organisation can now create campaigns.",
    kicker: "Approved",
    headline: `${d.organisationName} is approved`,
    body:
      paragraph(
        `${d.contactName}, ${d.organisationName} is verified and approved. You can now create a support campaign, set what you are looking for and browse verified businesses.`,
      ) +
      paragraph(
        "Selections you submit go to the Ajo Mercy team for final confirmation before anything is communicated to a business.",
      ) +
      button("Create a campaign", d.dashboardUrl),
  }),

  "brand.rejected": (d) => ({
    subject: `About ${d.organisationName}'s registration`,
    previewText: "An update on your registration.",
    kicker: "Registration update",
    headline: "We cannot approve this registration",
    body:
      paragraph(
        `${d.contactName}, we are not able to approve ${d.organisationName} at this time.`,
      ) +
      (d.message ? quote(d.message, "From the review team") : "") +
      paragraph("Reply to this email if you would like to discuss it."),
  }),

  "campaign.created": (d) => ({
    subject: `${d.campaignName} is created`,
    previewText: "Your campaign has been created.",
    kicker: "Campaign",
    headline: `${d.campaignName}`,
    body:
      paragraph(`${d.contactName}, your campaign has been created and is with the Ajo Mercy team for review.`) +
      detailList(
        [
          ["Campaign", d.campaignName],
          ["Businesses", String(d.businessesTarget)],
          ...(d.budgetLabel ? ([["Budget", d.budgetLabel]] as Array<[string, string]>) : []),
        ] as Array<[string, string]>,
      ) +
      button("Open the campaign", d.dashboardUrl),
  }),

  "campaign.status_changed": (d) => ({
    subject: `${d.campaignName}: ${d.statusLabel}`,
    previewText: `Your campaign is now ${d.statusLabel.toLowerCase()}.`,
    kicker: "Campaign update",
    headline: `${d.campaignName} is ${d.statusLabel.toLowerCase()}`,
    body: paragraph(`${d.contactName}, ${d.note}`) + button("Open the campaign", d.dashboardUrl),
  }),

  "admin.review_pending": (d) => ({
    subject: `Review needed: ${d.subjectLabel}`,
    previewText: `${d.kind} waiting for review.`,
    kicker: "Action required",
    headline: `${d.kind} waiting for review`,
    body:
      paragraph(`${d.adminName}, ${d.subjectLabel} was submitted on ${d.submittedAt} and is waiting for review.`) +
      button("Open the review", d.reviewUrl),
  }),

  "admin.email_failures": (d) => ({
    subject: `${d.failureCount} email${d.failureCount === 1 ? "" : "s"} failed to send`,
    previewText: "Some notifications did not reach their recipients.",
    kicker: "Delivery problem",
    headline: "Emails are failing to send",
    body:
      paragraph(
        `${d.adminName}, ${d.failureCount} outbound email${d.failureCount === 1 ? " has" : "s have"} failed. Recipients have not been notified, so this needs attention.`,
      ) + button("Open email delivery", d.adminUrl),
  }),
};

export function renderEmail<K extends EmailEventType>(
  type: K,
  data: EmailTemplateData[K],
  siteUrl: string,
): RenderedEmail {
  const renderer = renderers[type] as Renderer<K>;
  const parts = renderer(data, siteUrl);
  const html = renderLayout({
    previewText: parts.previewText,
    ...(parts.kicker ? { kicker: parts.kicker } : {}),
    headline: parts.headline,
    body: parts.body,
    siteUrl,
    ...(parts.footnote ? { footnote: parts.footnote } : {}),
  });
  return { subject: parts.subject, html, text: toPlainText(html) };
}

export const ALL_EMAIL_EVENT_TYPES = Object.keys(renderers) as EmailEventType[];
