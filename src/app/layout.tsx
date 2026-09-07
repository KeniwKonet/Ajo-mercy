import type { Metadata, Viewport } from "next";
import { Instrument_Serif, JetBrains_Mono, Manrope } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

/**
 * Two voices, deliberately.
 *
 * Manrope carries the product: navigation, forms, tables, every place someone
 * is trying to get something done. It is a variable face, so the whole weight
 * range costs one file.
 *
 * Instrument Serif is the editorial voice and appears only where the product
 * has something to say. Using it for every heading would spend the contrast
 * that makes it work.
 */
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-face",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display-face",
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
  themeColor: "#FBF7F0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${manrope.variable} ${instrument.variable} ${mono.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
