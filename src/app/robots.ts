import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private surfaces, and the design explorations, stay out of the index.
        disallow: [
          "/admin",
          "/dashboard",
          "/account",
          "/designs",
          "/api",
          "/auth",
          "/login",
          "/register",
          "/reset-password",
          "/forgot-password",
          "/check-email",
          "/403",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
