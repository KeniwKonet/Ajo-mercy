import type { MetadataRoute } from "next";
import { listAlajoSlugs } from "@/lib/data/alajos";
import { siteUrl } from "@/lib/env";

export const revalidate = 3600;

/** Static pages plus every live business profile. Private routes are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = ([
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/alajos`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/become-an-alajo`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/support`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/brands`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/how-it-works`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/impact`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ] satisfies MetadataRoute.Sitemap).map((entry) => ({ ...entry, lastModified: new Date() }));

  const profiles = await listAlajoSlugs();

  return [
    ...staticRoutes,
    ...profiles.map((profile) => ({
      url: `${siteUrl}/alajos/${profile.slug}`,
      lastModified: new Date(profile.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
