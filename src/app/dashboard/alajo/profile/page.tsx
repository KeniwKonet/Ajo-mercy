import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAlajoWorkspace } from "@/lib/data/applications";
import { publicMediaUrl } from "@/lib/data/media-url";
import { DashboardPage } from "@/components/dashboard/shell";
import { Alert, ButtonLink, EmptyState, StatusChip, Stat } from "@/components/ui/primitives";
import { ALAJO_PROFILE_STATUS_LABELS } from "@/lib/state-machine";
import { CATEGORY_LABELS } from "@/lib/types";
import { formatDate, formatNaira, yearsOperating } from "@/lib/format";

export const metadata: Metadata = { title: "Public profile", robots: { index: false, follow: false } };

export default async function AlajoPublicProfilePage() {
  const profile = await requireRole("alajo");
  const { application, media, profile: publicProfile } = await getAlajoWorkspace(profile.id);

  if (!publicProfile) {
    return (
      <DashboardPage title="Public profile">
        <EmptyState
          title="Your profile is not live yet"
          description="Your public profile is created when your application is approved. Everything you write in the application becomes the profile, so it is worth getting the story right."
          action={<ButtonLink href="/dashboard/alajo/application">Open my application</ButtonLink>}
        />
      </DashboardPage>
    );
  }

  const live = publicProfile.status === "approved" || publicProfile.status === "featured";
  const coverUrl = publicMediaUrl(
    media.find((m) => m.id === publicProfile.cover_media_id)?.storage_path ??
      media.find((m) => m.kind === "business_photo")?.storage_path,
  );

  return (
    <DashboardPage
      title="Public profile"
      description="What supporters and brands see when they find your business."
      actions={
        <StatusChip tone={publicProfile.status === "featured" ? "feature" : live ? "positive" : "negative"}>
          {ALAJO_PROFILE_STATUS_LABELS[publicProfile.status]}
        </StatusChip>
      }
    >
      <div className="max-w-3xl space-y-8">
        {publicProfile.status === "suspended" && (
          <Alert tone="negative" title="Your profile is suspended">
            It is not visible to anyone right now. Check your email, or get in touch and a person
            will explain what happened.
          </Alert>
        )}

        {publicProfile.status === "featured" && (
          <Alert tone="feature" title="You are featured">
            Your business is currently leading the homepage and appears first in the listing.
          </Alert>
        )}

        {live && (
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href={`/alajos/${publicProfile.slug}`} variant="secondary">
              View public profile
            </ButtonLink>
            <span className="font-mono text-xs text-ink-faint">/alajos/{publicProfile.slug}</span>
          </div>
        )}

        <section className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
          <div className="bg-paper px-5">
            <Stat value={publicProfile.view_count || null} label="Profile views" />
          </div>
          <div className="bg-paper px-5">
            <Stat
              value={publicProfile.approved_at ? formatDate(publicProfile.approved_at) : null}
              label="Live since"
            />
          </div>
          <div className="bg-paper px-5">
            <Stat
              value={
                publicProfile.requested_amount_ngn
                  ? formatNaira(publicProfile.requested_amount_ngn)
                  : null
              }
              label="Support sought"
            />
          </div>
        </section>

        {/* A read-only rendering of the live profile, so what is public is
            never a mystery to the person it is about. */}
        <section className="widget !p-0">
          <h2 className="border-b border-rule px-5 py-3 font-display text-lg">
            What is published
          </h2>

          {coverUrl && (
            <div className="relative aspect-[16/9] border-b border-rule bg-widget-black-2">
              <Image
                src={coverUrl}
                alt={publicProfile.business_name}
                fill
                sizes="700px"
                unoptimized
                className="object-cover"
              />
            </div>
          )}

          <dl className="divide-y divide-rule">
            {[
              ["Business name", publicProfile.business_name],
              ["Founder", publicProfile.founder_name],
              ["Category", CATEGORY_LABELS[publicProfile.business_category]],
              ["Location", [publicProfile.city, publicProfile.state].filter(Boolean).join(", ")],
              ["Operating", yearsOperating(publicProfile.year_started)],
              ["Story", publicProfile.story],
              ["Challenge", publicProfile.current_challenge],
              ["Support would enable", publicProfile.support_would_enable],
            ].map(([label, value]) => (
              <div key={String(label)} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
                <dt className="text-sm text-ink-faint">{label}</dt>
                <dd className="whitespace-pre-line text-sm leading-relaxed text-ink">
                  {value ? String(value) : <span className="text-ink-faint">Not provided</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <Alert tone="neutral" title="Changing what is published">
          Your profile is built from your application, so edits go through the same review. Ask us to
          reopen it and we will unlock the form, then republish once we have read the changes.{" "}
          <Link href="/contact?topic=application_help" className="link-rule font-medium text-ink">
            Get in touch
          </Link>
        </Alert>

        <p className="border-t border-rule pt-5 text-xs leading-relaxed text-ink-faint">
          Your identity document, home address, date of birth and personal phone number are never
          published. Only the Ajo Mercy review team can see them.
          {application?.business_phone
            ? " Your business phone number is not published either."
            : ""}
        </p>
      </div>
    </DashboardPage>
  );
}
