import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, StatusChip } from "@/components/ui/primitives";
import { AlajoRail } from "@/components/site/alajo-cards";
import { SupportPanel } from "./support-panel";
import { getAlajoBySlug, listAlajoSlugs, listRecentAlajos, publicMediaUrl } from "@/lib/data/alajos";
import { CATEGORY_LABELS } from "@/lib/types";
import { formatNaira, yearsOperating } from "@/lib/format";
import { siteUrl } from "@/lib/env";

export const revalidate = 300;

/** Pre-render the verified profiles that exist at build time. */
export async function generateStaticParams() {
  const slugs = await listAlajoSlugs();
  return slugs.slice(0, 200).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getAlajoBySlug(slug);
  if (!profile) return { title: "Business not found" };

  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const description = `${profile.business_name} in ${location}. ${
    profile.current_challenge ?? profile.story
  }`.slice(0, 155);

  const image = publicMediaUrl(profile.cover?.storage_path);

  return {
    title: `${profile.business_name} — ${CATEGORY_LABELS[profile.business_category]} in ${location}`,
    description,
    alternates: { canonical: `/alajos/${profile.slug}` },
    openGraph: {
      type: "profile",
      title: profile.business_name,
      description,
      url: `${siteUrl}/alajos/${profile.slug}`,
      ...(image ? { images: [{ url: image, alt: profile.business_name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: profile.business_name,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function AlajoProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getAlajoBySlug(slug);

  // Draft, suspended and archived profiles are invisible to RLS for anonymous
  // readers, so a miss here is genuinely a 404.
  if (!profile || !["approved", "featured"].includes(profile.status)) notFound();

  const [more] = await Promise.all([listRecentAlajos(5)]);
  const others = more.filter((item) => item.id !== profile.id).slice(0, 4);

  const coverUrl = publicMediaUrl(profile.cover?.storage_path);
  const avatarUrl = publicMediaUrl(profile.avatar?.storage_path);
  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const years = yearsOperating(profile.year_started);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.business_name,
    description: profile.story.slice(0, 300),
    address: { "@type": "PostalAddress", addressLocality: profile.city, addressRegion: profile.state, addressCountry: "NG" },
    founder: { "@type": "Person", name: profile.founder_name },
    ...(coverUrl ? { image: coverUrl } : {}),
    ...(profile.website_url ? { url: profile.website_url } : {}),
    url: `${siteUrl}/alajos/${profile.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Values come from our own database and are serialised, not interpolated.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ---------------------------------------------------------- masthead */}
      <Container className="pt-8">
        <nav aria-label="Breadcrumb" className="text-xs text-ink-faint">
          <Link href="/alajos" className="link-rule hover:text-ink">
            Businesses
          </Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <Link
            href={`/alajos?category=${profile.business_category}`}
            className="link-rule hover:text-ink"
          >
            {CATEGORY_LABELS[profile.business_category]}
          </Link>
        </nav>
      </Container>

      <Container className="py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.55fr] lg:gap-16">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip tone="positive">Verified by Ajo Mercy</StatusChip>
              {profile.status === "featured" && <StatusChip tone="feature">Featured</StatusChip>}
            </div>

            <h1 className="mt-4 font-display text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">
              {profile.business_name}
            </h1>

            <p className="mt-5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
              {CATEGORY_LABELS[profile.business_category]}
              <span className="mx-2 text-rule-strong">/</span>
              {location}
              {years && (
                <>
                  <span className="mx-2 text-rule-strong">/</span>
                  {years} in business
                </>
              )}
            </p>
          </div>

          <div className="flex items-end">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={profile.founder_name}
                  width={64}
                  height={64}
                  className="size-16 shrink-0 object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex size-16 shrink-0 items-center justify-center bg-forest-wash font-display text-xl text-forest"
                >
                  {profile.founder_name.slice(0, 1)}
                </div>
              )}
              <div>
                <p className="text-xs text-ink-faint">Founder</p>
                <p className="font-display text-lg">{profile.founder_name}</p>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* ------------------------------------------------------------- cover */}
      {coverUrl && (
        <Container>
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-paper-deep sm:aspect-[21/9]">
            <Image
              src={coverUrl}
              alt={`${profile.business_name} in ${location}`}
              fill
              priority
              sizes="(min-width: 1400px) 1344px, 100vw"
              className="object-cover"
            />
          </div>
          {profile.cover?.caption && (
            <p className="mt-2 text-xs text-ink-faint">{profile.cover.caption}</p>
          )}
        </Container>
      )}

      {/* -------------------------------------------------------- the story */}
      <Container className="py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-20">
          <article className="min-w-0">
            <div className="prose-editorial">
              {profile.story.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {profile.current_challenge && (
              <section className="mt-12 border-l-2 border-terracotta pl-6">
                <h2 className="font-mono text-2xs uppercase tracking-[0.14em] text-terracotta">
                  What is in the way
                </h2>
                <p className="mt-3 font-display text-xl leading-[1.45] text-ink sm:text-2xl">
                  {profile.current_challenge}
                </p>
              </section>
            )}

            {profile.support_would_enable && (
              <section className="mt-12">
                <h2 className="font-display text-xl">What support would let them do</h2>
                <p className="mt-3 max-w-prose leading-relaxed text-ink-soft">
                  {profile.support_would_enable}
                </p>
              </section>
            )}

            {/* ------------------------------------------------------ gallery */}
            {profile.gallery.length > 1 && (
              <section className="mt-14">
                <h2 className="border-b border-rule pb-3 font-display text-xl">The business</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {profile.gallery.slice(0, 6).map((item) => {
                    const url = publicMediaUrl(item.storage_path);
                    if (!url) return null;
                    if (item.kind === "video") {
                      return (
                        <video
                          key={item.id}
                          src={url}
                          controls
                          preload="metadata"
                          className="aspect-[4/3] w-full bg-ink object-cover sm:col-span-2"
                        >
                          Your browser cannot play this video.
                        </video>
                      );
                    }
                    return (
                      <figure key={item.id} className="relative aspect-[4/3] bg-paper-deep">
                        <Image
                          src={url}
                          alt={item.caption ?? `${profile.business_name}`}
                          fill
                          sizes="(min-width: 640px) 40vw, 100vw"
                          className="object-cover"
                        />
                      </figure>
                    );
                  })}
                </div>
              </section>
            )}
          </article>

          {/* --------------------------------------------------------- rail */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <SupportPanel
              alajoProfileId={profile.id}
              businessName={profile.business_name}
              requestedAmount={profile.requested_amount_ngn}
            />

            <dl className="mt-8 border-t border-rule">
              {[
                ["Category", CATEGORY_LABELS[profile.business_category]],
                ["Location", location],
                years ? ["Operating", years] : null,
                profile.requested_amount_ngn
                  ? ["Support sought", formatNaira(profile.requested_amount_ngn)]
                  : null,
              ]
                .filter((row): row is [string, string] => row !== null)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-rule py-3">
                    <dt className="text-sm text-ink-faint">{label}</dt>
                    <dd className="text-right text-sm font-medium text-ink">{value}</dd>
                  </div>
                ))}
            </dl>

            {(profile.website_url || profile.instagram_handle || profile.tiktok_handle) && (
              <div className="mt-6">
                <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">Find them</p>
                <ul className="mt-2.5 space-y-1.5">
                  {profile.website_url && (
                    <li>
                      <a
                        href={profile.website_url}
                        rel="nofollow noopener noreferrer"
                        target="_blank"
                        className="link-rule text-sm text-ink"
                      >
                        Website
                      </a>
                    </li>
                  )}
                  {profile.instagram_handle && (
                    <li>
                      <a
                        href={`https://instagram.com/${profile.instagram_handle}`}
                        rel="nofollow noopener noreferrer"
                        target="_blank"
                        className="link-rule text-sm text-ink"
                      >
                        @{profile.instagram_handle}
                      </a>
                    </li>
                  )}
                  {profile.tiktok_handle && (
                    <li>
                      <a
                        href={`https://tiktok.com/@${profile.tiktok_handle}`}
                        rel="nofollow noopener noreferrer"
                        target="_blank"
                        className="link-rule text-sm text-ink"
                      >
                        TikTok
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}

            <p className="mt-8 border-t border-rule pt-4 text-xs leading-relaxed text-ink-faint">
              Ajo Mercy verified this business but does not handle any money. Support is arranged
              directly, and selection does not guarantee support.
            </p>
          </aside>
        </div>
      </Container>

      {others.length > 0 && (
        <Container className="pb-8">
          <AlajoRail profiles={others} title="Other businesses" href="/alajos" />
        </Container>
      )}
    </>
  );
}
