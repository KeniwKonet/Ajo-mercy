/**
 * Email shell. Table-based and inline-styled because email clients are not
 * browsers: no flexbox, no external stylesheets, and no web fonts we can rely
 * on, so Manrope is named first and degrades to whatever grotesque the client
 * has. There is no serif, because the design has none.
 *
 * The site's language is near-black widgets on a warm cream page. That is
 * reproduced here with one deliberate change: the reading surface stays white
 * rather than near-black. A long dark card is where mail clients start
 * fighting you, inverting colours in dark mode and stripping backgrounds while
 * leaving the text they were written against. So the black is spent on the
 * masthead and on short accent blocks, where a client that drops the fill
 * still leaves something readable behind.
 */

export const BRAND = {
  paper: "#F3EEE3",
  card: "#FFFFFF",
  widget: "#0B120E",
  widgetSoft: "#10180F",
  ink: "#181410",
  inkSoft: "#5B534A",
  inkFaint: "#8C8378",
  ivory: "#F5F1E8",
  mutedOnBlack: "#8A9186",
  lime: "#C6E24C",
  /* Lime and orange are background colours. As text on cream they measure
     about 1.3:1 and 2.4:1, so the ink-side twins are what any wording uses. */
  limeInk: "#4E6E14",
  orange: "#FF6B3D",
  orangeInk: "#A33F14",
  ochre: "#E8B33A",
  ochreInk: "#7A5A09",
  rule: "#E3DACB",
  sans: "Manrope, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace",
} as const;

export interface LayoutOptions {
  previewText: string;
  /** Small label above the headline, e.g. "Application update". Optional. */
  kicker?: string;
  headline: string;
  body: string;
  siteUrl: string;
  /** Rendered under the signature; used for legal/context notes. */
  footnote?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PARAGRAPH_STYLE = `margin:0 0 16px;font-family:${BRAND.sans};font-size:16px;line-height:1.65;color:${BRAND.inkSoft};`;

/**
 * Escapes its argument. Templates interpolate applicant-controlled values —
 * business names, founder names, reviewer messages — so the default has to be
 * safe. Use `paragraphRaw` for the few paragraphs that carry deliberate markup.
 */
export function paragraph(text: string): string {
  return `<p style="${PARAGRAPH_STYLE}">${escapeHtml(text)}</p>`;
}

/**
 * For paragraphs that intentionally contain a link. Every dynamic value inside
 * must be passed through `escapeHtml` at the call site.
 */
export function paragraphRaw(html: string): string {
  return `<p style="${PARAGRAPH_STYLE}">${html}</p>`;
}

/**
 * An inline link inside a sentence. Uses the ink-side orange, because the neon
 * orange measures about 2.4:1 on white and would not be readable as text.
 */
export function link(label: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${BRAND.orangeInk};font-weight:700;">${escapeHtml(label)}</a>`;
}

export function button(label: string, href: string): string {
  // Lime pill with near-black wording, matching the site's primary action.
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;">
    <tr>
      <td style="background-color:${BRAND.lime};border-radius:999px;">
        <a href="${escapeHtml(href)}"
           style="display:inline-block;padding:15px 30px;font-family:${BRAND.sans};font-size:15px;font-weight:800;letter-spacing:-0.01em;color:${BRAND.widgetSoft};text-decoration:none;border-radius:999px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

/** Key/value block for application details, support amounts and similar. */
export function detailList(rows: Array<[string, string]>): string {
  if (rows.length === 0) return "";
  const body = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.rule};font-family:${BRAND.sans};font-size:13px;color:${BRAND.inkFaint};font-weight:800;text-transform:uppercase;letter-spacing:0.08em;width:44%;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.rule};font-family:${BRAND.sans};font-size:15px;color:${BRAND.ink};vertical-align:top;">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 24px;">${body}</table>`;
}

/** Callout used for "here is what we need from you" content. */
export function noticePanel(title: string, items: string[]): string {
  const list = items
    .map(
      (item) =>
        `<li style="margin:0 0 10px;font-family:${BRAND.sans};font-size:15px;line-height:1.6;color:${BRAND.ink};">${escapeHtml(item)}</li>`,
    )
    .join("");
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 26px;">
    <tr>
      <td style="padding:20px 22px;background-color:#FDF4DD;border-radius:16px;">
        <p style="margin:0 0 12px;font-family:${BRAND.sans};font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.ochreInk};">${escapeHtml(title)}</p>
        <ul style="margin:0;padding-left:18px;">${list}</ul>
      </td>
    </tr>
  </table>`;
}

/**
 * The orange card the site uses for "Choosing is not confirming".
 *
 * Reserved for the distinction the product must never blur: a supporter
 * picking a business is not support, and nothing is real until a person on the
 * team confirms it. Orange, because on this platform orange means in progress.
 */
export function accentPanel(title: string, body: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 26px;">
    <tr>
      <td style="padding:20px 22px;background-color:${BRAND.orange};border-radius:20px;">
        <p style="margin:0 0 8px;font-family:${BRAND.sans};font-size:15px;font-weight:800;letter-spacing:-0.01em;color:${BRAND.widgetSoft};">${escapeHtml(title)}</p>
        <p style="margin:0;font-family:${BRAND.sans};font-size:13px;line-height:1.55;color:${BRAND.widgetSoft};">${escapeHtml(body)}</p>
      </td>
    </tr>
  </table>`;
}

/** A near-black tile, for figures and machine detail rather than for reading. */
export function darkPanel(rows: Array<[string, string]>): string {
  if (rows.length === 0) return "";
  const body = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:6px 0;font-family:${BRAND.sans};font-size:12px;color:${BRAND.mutedOnBlack};">${escapeHtml(label)}</td>
        <td align="right" style="padding:6px 0;font-family:${BRAND.sans};font-size:14px;font-weight:800;color:${BRAND.ivory};">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("");
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 26px;">
    <tr>
      <td style="padding:18px 22px;background-color:${BRAND.widget};border-radius:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${body}</table>
      </td>
    </tr>
  </table>`;
}

/**
 * A status pill. Lime is reserved for what a person has actually confirmed;
 * ochre is waiting on someone; orange is in progress or needs attention.
 */
export function statusPill(label: string, tone: "confirmed" | "waiting" | "attention" = "waiting"): string {
  const tones = {
    confirmed: { bg: "#EAF8D5", fg: BRAND.limeInk },
    waiting: { bg: "#FDF4DD", fg: BRAND.ochreInk },
    attention: { bg: "#FBF3E8", fg: BRAND.orangeInk },
  } as const;
  const { bg, fg } = tones[tone];
  return `<span style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:${bg};font-family:${BRAND.sans};font-size:11px;font-weight:800;color:${fg};">${escapeHtml(label)}</span>`;
}

export function quote(text: string, attribution?: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 24px;">
    <tr>
      <td style="padding:4px 0 4px 20px;border-left:3px solid ${BRAND.lime};">
        <p style="margin:0;font-family:${BRAND.sans};font-size:18px;line-height:1.5;font-weight:700;letter-spacing:-0.01em;color:${BRAND.ink};">${escapeHtml(text)}</p>
        ${attribution ? `<p style="margin:10px 0 0;font-family:${BRAND.sans};font-size:13px;color:${BRAND.inkFaint};">${escapeHtml(attribution)}</p>` : ""}
      </td>
    </tr>
  </table>`;
}

export function renderLayout(opts: LayoutOptions): string {
  const { previewText, kicker, headline, body, siteUrl, footnote } = opts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(headline)}</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.paper};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">

          <tr>
            <td style="padding:0 0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:${BRAND.widget};border-radius:999px;padding:12px 22px 12px 14px;">
                    <a href="${escapeHtml(siteUrl)}" style="text-decoration:none;">
                      <span style="display:inline-block;width:14px;height:14px;background-color:${BRAND.lime};border-radius:5px;">&nbsp;</span><span style="font-family:${BRAND.sans};font-size:16px;font-weight:800;letter-spacing:-0.01em;color:${BRAND.ivory};">&nbsp;&nbsp;Ajo</span><span style="font-family:${BRAND.sans};font-size:16px;font-weight:800;letter-spacing:-0.01em;color:${BRAND.orange};">Mercy</span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color:${BRAND.card};border-radius:24px;padding:36px 32px;">
              ${
                kicker
                  ? `<p style="margin:0 0 14px;font-family:${BRAND.sans};font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.orangeInk};">${escapeHtml(kicker)}</p>`
                  : ""
              }
              <h1 style="margin:0 0 20px;font-family:${BRAND.sans};font-size:30px;line-height:1.15;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink};">${escapeHtml(headline)}</h1>
              ${body}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
                <tr><td style="border-top:1px solid ${BRAND.rule};padding-top:20px;">
                  <p style="margin:0;font-family:${BRAND.sans};font-size:14px;line-height:1.6;color:${BRAND.inkFaint};">
                    The Ajo Mercy team
                  </p>
                </td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 4px 0;">
              ${
                footnote
                  ? `<p style="margin:0 0 12px;font-family:${BRAND.sans};font-size:12px;line-height:1.6;color:${BRAND.inkFaint};">${footnote}</p>`
                  : ""
              }
              <p style="margin:0 0 8px;font-family:${BRAND.sans};font-size:12px;line-height:1.6;color:${BRAND.inkFaint};">
                Ajo Mercy is a discovery, verification and coordination platform. We do not hold, transfer or process support funds.
              </p>
              <p style="margin:0;font-family:${BRAND.sans};font-size:12px;line-height:1.6;color:${BRAND.inkFaint};">
                <a href="${escapeHtml(siteUrl)}" style="color:${BRAND.inkFaint};">ajomercy.com</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(siteUrl)}/contact" style="color:${BRAND.inkFaint};">Contact</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Strips the HTML we generate back to a readable plain-text alternative. */
export function toPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<li[^>]*>/gi, "\n  - ")
    .replace(/<\/(p|h1|h2|h3|tr|div|ul)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}
