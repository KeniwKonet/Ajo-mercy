import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

/**
 * Two faces, which is what the design uses.
 *
 * Manrope carries everything, display sizes included: it is a variable face,
 * so 400 through 800 costs one file. The dark widget design has no serif in
 * it at all, so there is no third family to load.
 */
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-face",
});

/** Reference numbers, timestamps and ids only. Never body copy. */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-mono-face",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ajo Mercy — Find a business worth backing",
    template: "%s · Ajo Mercy",
  },
  description:
    "Ajo Mercy connects verified Nigerian business owners with individuals and brands who want to back them. Every business is reviewed by a person before it appears here.",
  applicationName: "Ajo Mercy",
  keywords: [
    "Ajo Mercy",
    "Nigerian business support",
    "Alajo",
    "small business Nigeria",
    "business grants Nigeria",
    "Woli Arole",
  ],
  openGraph: {
    type: "website",
    siteName: "Ajo Mercy",
    locale: "en_NG",
    url: siteUrl,
    title: "Ajo Mercy — Find a business worth backing",
    description:
      "Verified Nigerian businesses, reviewed one at a time. Individuals and brands choose who to support.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ajo Mercy — Find a business worth backing",
    description: "Verified Nigerian businesses, reviewed one at a time.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#F3EEE3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${manrope.variable} ${mono.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-widget-black focus:px-4 focus:py-2 focus:text-sm focus:text-ivory-text"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
