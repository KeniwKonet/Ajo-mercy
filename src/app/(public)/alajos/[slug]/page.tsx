import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, StatusChip } from "@/components/ui/primitives";
import { VerificationPanel, VerifiedMark } from "@/components/ui/trust";
import { AlajoRail } from "@/components/site/alajo-cards";
import { SupportPanel } from "./support-panel";
import { getAlajoBySlug, listAlajoSlugs, listRecentAlajos, publicMediaUrl } from "@/lib/data/alajos";
import { businessArt } from "@/lib/business-art";
import { CATEGORY_LABELS } from "@/lib/types";
import { formatDate, formatNaira, yearsOperating } from "@/lib/format";
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

      {/* ============================================================== hero
          A full-bleed photograph with the identity card sitting over its lower
          edge. Both actions live here because this is where somebody decides,
          and they should never have to scroll back to find them. */}
      <section className="relative">
        {/* A tall hero earns its height only when there is a photograph to
            fill it. Without one it collapses to a warm band, which reads as
            deliberate rather than as a missing image. */}
        <div
          className={
            coverUrl
              ? "relative h-[46vh] min-h-[20rem] w-full overflow-hidden bg-widget-black-2 sm:h-[54vh]"
              : "relative h-[34vh] min-h-[15rem] w-full overflow-hidden bg-widget-black-2 sm:h-[38vh]"
          }
        >
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`${profile.business_name} in ${location}`}
              fill
              sizes="100vw"
              unoptimized
              priority
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${businessArt(profile.slug ?? profile.business_name)}")` }}
            />
          )}
          {/* Enough scrim for the control to read on any photograph. */}
          {coverUrl && (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent"
            />
          )}
          <div className="absolute left-0 right-0 top-0">
            <Container className="pt-6">
              <Link
                href="/alajos"
                className="inline-flex items-center gap-2 rounded-full bg-panel-white/90 px-3.5 py-2 text-xs font-semibold text-ink backdrop-blur transition-colors hover:bg-panel-white"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
                  <path
                    d="M13 8H4M7.5 4l-4 4 4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back to discover
              </Link>
            </Container>
          </div>
        </div>

        <Container>
          <div className="widget relative -mt-16 flex flex-wrap items-start justify-between gap-6 p-6 sm:-mt-20 sm:p-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <VerifiedMark />
                {profile.status === "featured" && <StatusChip tone="feature">Featured</StatusChip>}
              </div>
              <h1 className="mt-4 font-display text-4xl leading-[1.04] sm:text-5xl">
                {profile.business_name}
              </h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-soft">
                <span className="font-semibold text-ink">{profile.founder_name}</span>
                <span aria-hidden="true" className="text-rule-strong">·</span>
                <span>{CATEGORY_LABELS[profile.business_category]}</span>
                <span aria-hidden="true" className="text-rule-strong">·</span>
                <span>{location}</span>
                {years && (
                  <>
                    <span aria-hidden="true" className="text-rule-strong">·</span>
                    <span>{years}</span>
                  </>
                )}
              </p>
            </div>

            <div className="w-full sm:w-auto sm:shrink-0">
              <SupportPanel
                alajoProfileId={profile.id}
                businessName={profile.business_name}
                requestedAmount={profile.requested_amount_ngn}
              />
            </div>
          </div>
        </Container>
      </section>

      {/* ============================================================== body */}
      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">

          {/* --------------------------------------------------- the story */}
          <div className="min-w-0">
            <article className="widget p-7 sm:p-9">
              <h2 className="font-display text-3xl">The story</h2>

              <h3 className="mt-7 text-base font-bold">Why I started</h3>
              <p className="mt-2.5 whitespace-pre-line text-base leading-relaxed text-ink-soft">
                {profile.story}
              </p>

              {profile.current_challenge && (
                <>
                  <h3 className="mt-8 text-base font-bold">What is in the way</h3>
                  <p className="mt-2.5 whitespace-pre-line text-base leading-relaxed text-ink-soft">
                    {profile.current_challenge}
                  </p>
                </>
              )}

              {profile.support_would_enable && (
                <>
                  <h3 className="mt-8 text-base font-bold">What support would let me do</h3>
                  <p className="mt-2.5 whitespace-pre-line text-base leading-relaxed text-ink-soft">
                    {profile.support_would_enable}
                  </p>
                </>
              )}

              <p className="mt-8 border-t border-rule pt-5 text-sm text-ink-faint">
                Written by {profile.founder_name}. Read by the Ajo Mercy review team before this
                page went live.
              </p>
            </article>

            {profile.gallery.length > 0 && (
              <section className="mt-8">
                <h2 className="text-xl font-bold tracking-tight">The business</h2>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {profile.gallery.slice(0, 6).map((item) => {
                    const url = publicMediaUrl(item.storage_path);
                    if (!url) return null;
                    return (
                      <figure key={item.id} className="media-frame relative aspect-square">
                        <Image
                          src={url}
                          alt={item.caption ?? profile.business_name}
                          fill
                          sizes="(min-width: 640px) 14rem, 45vw"
                          unoptimized
                          className="object-cover"
                        />
                      </figure>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* ------------------------------------------------------- the rail */}
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <VerificationPanel
              approvedOn={profile.approved_at ? formatDate(profile.approved_at) : null}
            />

            <div className="widget">
              <h2 className="text-sm font-bold">Business details</h2>
              <dl className="mt-4 space-y-3.5">
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
                    <div key={label} className="flex items-baseline justify-between gap-4">
                      <dt className="text-sm text-ink-faint">{label}</dt>
                      <dd className="text-right text-sm font-semibold text-ink">{value}</dd>
                    </div>
                  ))}
              </dl>

              {(profile.website_url || profile.instagram_handle || profile.tiktok_handle) && (
                <div className="mt-5 border-t border-rule pt-4">
                  <p className="eyebrow">Find them</p>
                  <ul className="mt-2.5 space-y-2">
                    {profile.website_url && (
                      <li>
                        <a
                          href={profile.website_url}
                          rel="nofollow noopener noreferrer"
                          target="_blank"
                          className="link-rule text-sm font-medium text-ink"
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
                          className="link-rule text-sm font-medium text-ink"
                        >
                          Instagram
                        </a>
                      </li>
                    )}
                    {profile.tiktok_handle && (
                      <li>
                        <a
                          href={`https://tiktok.com/@${profile.tiktok_handle}`}
                          rel="nofollow noopener noreferrer"
                          target="_blank"
                          className="link-rule text-sm font-medium text-ink"
                        >
                          TikTok
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* The rule that must never be blurred, stated where somebody is
                about to act on it. */}
            <div className="widget-tile p-5">
              <p className="text-sm font-bold text-ink">Choosing is not confirming</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                Backing this business tells us you are interested. The team confirms with both sides
                before anything is described as real, and Ajo Mercy never holds or transfers the
                money.
              </p>
            </div>
          </aside>
        </div>

        {others.length > 0 && (
          <section className="mt-16 border-t border-rule pt-12">
            <AlajoRail profiles={others} title="More businesses" href="/alajos" />
          </section>
        )}
      </Container>
    </>
  );
}
