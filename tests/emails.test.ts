import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ALL_EMAIL_EVENT_TYPES, renderEmail, type EmailEventType } from "@/emails/templates";
import { escapeHtml, toPlainText } from "@/emails/layout";
import { SAMPLES, SITE } from "./email-samples";

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
