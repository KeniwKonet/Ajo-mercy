/**
 * Email shell. Table-based and inline-styled because email clients are not
 * browsers: no flexbox, no external stylesheets, no web fonts we can rely on.
 * The type stack mirrors the site (editorial serif + grotesque) using faces
 * that are actually present on mail clients.
 */

export const BRAND = {
  paper: "#FBF7F0",
  card: "#FFFFFF",
  ink: "#181410",
  inkSoft: "#5B534A",
  inkFaint: "#8C8378",
  forest: "#0F3D2E",
  terracotta: "#C9531F",
  ochre: "#E8B33A",
  rule: "#E3DACB",
  serif: "Georgia, 'Times New Roman', Times, serif",
  sans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
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

export function button(label: string, href: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="background-color:${BRAND.forest};border-radius:2px;">
        <a href="${escapeHtml(href)}"
           style="display:inline-block;padding:14px 28px;font-family:${BRAND.sans};font-size:15px;font-weight:600;letter-spacing:0.01em;color:#FFFFFF;text-decoration:none;">
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
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.rule};font-family:${BRAND.sans};font-size:13px;color:${BRAND.inkFaint};text-transform:uppercase;letter-spacing:0.06em;width:44%;vertical-align:top;">${escapeHtml(label)}</td>
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
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 24px;">
    <tr>
      <td style="padding:20px 22px;background-color:#FBF3E8;border-left:3px solid ${BRAND.terracotta};">
        <p style="margin:0 0 12px;font-family:${BRAND.sans};font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${BRAND.terracotta};">${escapeHtml(title)}</p>
        <ul style="margin:0;padding-left:18px;">${list}</ul>
      </td>
    </tr>
  </table>`;
}

export function quote(text: string, attribution?: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 24px;">
    <tr>
      <td style="padding:4px 0 4px 20px;border-left:2px solid ${BRAND.ochre};">
        <p style="margin:0;font-family:${BRAND.serif};font-size:19px;line-height:1.5;color:${BRAND.ink};font-style:italic;">${escapeHtml(text)}</p>
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
            <td style="padding:0 0 24px;">
              <a href="${escapeHtml(siteUrl)}" style="text-decoration:none;">
                <span style="font-family:${BRAND.serif};font-size:22px;font-weight:700;letter-spacing:-0.01em;color:${BRAND.forest};">Ajo</span><span style="font-family:${BRAND.serif};font-size:22px;font-weight:400;font-style:italic;color:${BRAND.terracotta};">&nbsp;Mercy</span>
              </a>
            </td>
          </tr>

          <tr>
            <td style="background-color:${BRAND.card};border:1px solid ${BRAND.rule};padding:36px 32px;">
              ${
                kicker
                  ? `<p style="margin:0 0 14px;font-family:${BRAND.sans};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${BRAND.inkFaint};">${escapeHtml(kicker)}</p>`
                  : ""
              }
              <h1 style="margin:0 0 20px;font-family:${BRAND.serif};font-size:30px;line-height:1.2;font-weight:600;letter-spacing:-0.015em;color:${BRAND.ink};">${escapeHtml(headline)}</h1>
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
