import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ALL_EMAIL_EVENT_TYPES, renderEmail, type EmailEventType } from "@/emails/templates";
import { escapeHtml, toPlainText } from "@/emails/layout";

const SITE = "https://ajomercy.com";

/** One plausible payload per event, so every template can be rendered. */
const SAMPLES: { [K in EmailEventType]: Parameters<typeof renderEmail<K>>[1] } = {
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
};

describe("email templates", () => {
  test("every declared event type has a sample, so nothing goes untested", () => {
    const sampled = Object.keys(SAMPLES).sort();
    const declared = [...ALL_EMAIL_EVENT_TYPES].sort();
    assert.deepEqual(sampled, declared);
  });

  test("every template renders a subject, HTML and plain text", () => {
    for (const type of ALL_EMAIL_EVENT_TYPES) {
      const rendered = renderEmail(type, SAMPLES[type] as never, SITE);

      assert.ok(rendered.subject.length > 5, `${type}: subject too short`);
      assert.ok(rendered.subject.length < 90, `${type}: subject too long for an inbox`);
      assert.ok(rendered.html.startsWith("<!doctype html>"), `${type}: not a full document`);
      assert.ok(rendered.text.length > 40, `${type}: plain text alternative is empty`);
      assert.ok(!rendered.text.includes("<"), `${type}: plain text still contains markup`);
    }
  });

  test("every email carries the Ajo Mercy brand and the funds disclaimer", () => {
    for (const type of ALL_EMAIL_EVENT_TYPES) {
      const { html } = renderEmail(type, SAMPLES[type] as never, SITE);
      assert.ok(html.includes("Ajo"), `${type}: missing branding`);
      assert.ok(
        html.includes("do not hold, transfer or process support funds"),
        `${type}: missing the funds disclaimer`,
      );
    }
  });

  test("emails are responsive and declare a viewport", () => {
    const { html } = renderEmail("alajo.application_approved", SAMPLES["alajo.application_approved"], SITE);
    assert.ok(html.includes('name="viewport"'));
    assert.ok(html.includes("max-width:560px"));
  });

  test("a selection email never tells a business it has won", () => {
    const { html, text } = renderEmail(
      "alajo.selected_for_consideration",
      SAMPLES["alajo.selected_for_consideration"],
      SITE,
    );
    const lowered = `${html} ${text}`.toLowerCase();
    assert.ok(!lowered.includes("congratulations"), "a consideration email said congratulations");
    assert.ok(!lowered.includes("you have won"), "a consideration email said you have won");
    assert.ok(
      lowered.includes("not a confirmation of support"),
      "a consideration email did not say it is not a confirmation",
    );
  });

  test("only the confirmation email states support is confirmed", () => {
    const { html } = renderEmail("alajo.support_confirmed", SAMPLES["alajo.support_confirmed"], SITE);
    assert.ok(html.toLowerCase().includes("confirmed"));
    assert.ok(html.includes("ask you for a fee"), "missing the anti-scam warning");
  });

  test("the received email restates that registering guarantees nothing", () => {
    const { text } = renderEmail(
      "alajo.application_received",
      SAMPLES["alajo.application_received"],
      SITE,
    );
    assert.ok(text.toLowerCase().includes("does not guarantee selection or support"));
  });

  test("dynamic values are escaped, so a business name cannot inject markup", () => {
    const rendered = renderEmail(
      "alajo.application_received",
      {
        name: "Tola",
        businessName: '<script>alert("x")</script> & Sons',
        dashboardUrl: `${SITE}/dashboard/alajo`,
      },
      SITE,
    );
    assert.ok(!rendered.html.includes("<script>"), "raw script tag reached the HTML");
    assert.ok(rendered.html.includes("&lt;script&gt;"));
  });

  test("escapeHtml handles every character that matters", () => {
    assert.equal(escapeHtml(`<a href="x">&'</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
  });

  test("plain text keeps links readable rather than dropping them", () => {
    const text = toPlainText('<p>Go <a href="https://example.com/x">here</a> now.</p>');
    assert.ok(text.includes("https://example.com/x"));
    assert.ok(text.includes("here"));
  });
});
