/**
 * Renders every transactional email to an HTML file so the branding can be
 * looked at rather than guessed at. Uses the same fixtures the tests use, so a
 * preview can never drift from what the suite checks.
 *
 *   npx tsx scripts/preview-emails.mts <output-dir>
 */
import fs from "node:fs";
import path from "node:path";
import { ALL_EMAIL_EVENT_TYPES, renderEmail, type EmailEventType } from "@/emails/templates";
import { SAMPLES } from "../tests/email-samples";

const SITE = "https://ajomercy.com";
const out = process.argv[2] ?? "email-preview";
fs.mkdirSync(out, { recursive: true });

const index: string[] = [];
for (const type of ALL_EMAIL_EVENT_TYPES) {
  const rendered = renderEmail(type as EmailEventType, SAMPLES[type] as never, SITE);
  const file = `${type}.html`;
  fs.writeFileSync(path.join(out, file), rendered.html);
  index.push(`<li><a href="${file}">${type}</a> — ${rendered.subject}</li>`);
}

fs.writeFileSync(
  path.join(out, "index.html"),
  `<meta charset="utf-8"><body style="font:14px system-ui;padding:32px;background:#F3EEE3">
<h1 style="font-weight:800">Ajo Mercy email templates</h1><ol>${index.join("")}</ol></body>`,
);

console.log(`rendered ${ALL_EMAIL_EVENT_TYPES.length} templates into ${out}/`);
