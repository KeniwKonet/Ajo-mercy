import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getReviewDetail, listReviewQueue } from "@/lib/data/applications";
import { ReviewRail } from "@/components/dashboard/review-rail";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { publicMediaUrl } from "@/lib/data/media-url";
import { can } from "@/lib/rbac";
import { ReviewPanel } from "./review-panel";
import { ProfileControls } from "./profile-controls";
import { Alert, StatusChip } from "@/components/ui/primitives";
import { CATEGORY_LABELS } from "@/lib/types";
import { formatBytes, formatDate, formatDateTime, formatNaira, yearsOperating } from "@/lib/format";

export const metadata: Metadata = { title: "Review application", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ReviewApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reviewer = await requirePermission("alajo.review");
  const detail = await getReviewDetail(id);
  if (!detail) notFound();

  const { application, applicant, media, allRequests, profile, notes, completeness, missing } = detail;

  // The open queue, so the reviewer can move to the next one without going
  // back to the list. Oldest first, matching the queue page exactly.
  const queue = await listReviewQueue({
    status: ["submitted", "under_review"],
    page: 1,
    pageSize: 40,
  });

  // Documents live in a private bucket, so the reviewer gets short-lived signed
  // URLs rather than anything permanently reachable.
  const documents = media.filter((m) => m.kind === "document");
  const signedDocuments = await signDocuments(documents.map((d) => d.storage_path));

  const photos = media.filter((m) => m.kind === "profile_photo" || m.kind === "business_photo");
  const videos = media.filter((m) => m.kind === "video");

  return (
    <div className="px-5 py-6 sm:px-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <div>
          <Link href="/admin/alajos" className="link-rule text-xs text-ink-faint hover:text-ink">
            ← Applications
          </Link>
          <h1 className="mt-1.5 font-display text-2xl">
            {application.business_name ?? "Untitled application"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-faint tabular">{completeness}% complete</span>
          {profile && <StatusChip tone="positive">Profile {profile.status}</StatusChip>}
        </div>
      </div>

      {/* Three columns on a wide screen; a single readable stack on anything
          narrower, because reviewing on a phone is a real scenario here. */}
      <div className="grid gap-8 pt-6 xl:grid-cols-[14rem_minmax(0,1fr)_19rem] xl:gap-7">
        {/* LEFT: what else is waiting. */}
        <ReviewRail items={queue.items} currentId={application.id} total={queue.total} />

        {/* CENTRE: the applicant and the business, read top to bottom. */}
        <div className="min-w-0 space-y-10">
        {/* ------------------------------------------------ applicant ----- */}
        <section aria-labelledby="applicant" className="min-w-0">
          <h2 id="applicant" className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
            The applicant
          </h2>

          <div className="mt-3 flex items-center gap-3">
            {(() => {
              const avatar = media.find((m) => m.kind === "profile_photo");
              const url = publicMediaUrl(avatar?.storage_path);
              return url ? (
                <Image
                  src={url}
                  alt={applicant.full_name}
                  width={56}
                  height={56}
                  unoptimized
                  className="size-14 object-cover"
                />
              ) : (
                <div className="flex size-14 items-center justify-center bg-widget-black-2 font-display text-lg text-ink-faint">
                  {applicant.full_name.slice(0, 1) || "?"}
                </div>
              );
            })()}
            <div className="min-w-0">
              <p className="font-medium text-ink">{application.founder_name ?? applicant.full_name}</p>
              <p className="truncate text-xs text-ink-faint">{applicant.email}</p>
            </div>
          </div>

          <dl className="mt-5 grid-rules border-t border-rule">
            {[
              ["Account created", formatDate(applicant.created_at)],
              ["Account status", applicant.status],
              ["Date of birth", application.date_of_birth ? formatDate(application.date_of_birth) : null],
              ["Personal phone", application.personal_phone],
              ["Personal address", application.personal_address],
              ["Submitted", application.submitted_at ? formatDateTime(application.submitted_at) : "Not submitted"],
            ].map(([label, value]) => (
              <div key={String(label)} className="py-2.5">
                <dt className="text-xs text-ink-faint">{label}</dt>
                <dd className="mt-0.5 text-sm text-ink">
                  {value ? String(value) : <span className="text-ink-faint">Not provided</span>}
                </dd>
              </div>
            ))}
          </dl>

          {/* -------------------------------------------------- documents -- */}
          <h2 className="mt-8 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
            Documents
          </h2>
          {documents.length === 0 ? (
            <Alert tone="attention" className="mt-3">
              No identity document uploaded. This application cannot be verified without one.
            </Alert>
          ) : (
            <ul className="mt-3 space-y-2">
              {documents.map((doc, index) => {
                const url = signedDocuments[index];
                return (
                  <li key={doc.id} className="widget !p-0 px-3 py-2.5">
                    <p className="text-sm font-medium text-ink">
                      {(doc.document_type ?? "document").replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {doc.mime_type} · {formatBytes(doc.size_bytes)}
                    </p>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-rule mt-1.5 inline-block text-xs font-medium text-ink"
                      >
                        Open document
                      </a>
                    ) : (
                      <p className="mt-1.5 text-xs text-danger">Could not generate a link.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* ------------------------------------------------------- notes -- */}
          {notes.length > 0 && (
            <>
              <h2 className="mt-8 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                Team notes
              </h2>
              <ul className="mt-3 space-y-2.5">
                {notes.map((note) => (
                  <li key={note.id} className="border-l-2 border-muted-on-black/25 pl-3">
                    <p className="text-sm text-ink">{note.body}</p>
                    <p className="mt-0.5 text-2xs text-ink-faint">
                      {note.author_name ?? "Team"} · {formatDateTime(note.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ---------------------------------------------- business + media - */}
        <section aria-labelledby="business" className="min-w-0">
          <h2 id="business" className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
            The business
          </h2>

          <dl className="mt-3 grid-rules border-t border-rule">
            {[
              ["Category", application.business_category ? CATEGORY_LABELS[application.business_category] : null],
              ["Location", [application.city, application.state].filter(Boolean).join(", ")],
              ["Operating", yearsOperating(application.year_started)],
              ["Employees", application.employee_count],
              ["Business phone", application.business_phone],
              ["Business address", application.business_address],
              ["Website", application.website_url],
              ["Instagram", application.instagram_handle ? `@${application.instagram_handle}` : null],
              ["TikTok", application.tiktok_handle ? `@${application.tiktok_handle}` : null],
              ["Asking for", application.requested_amount_ngn ? formatNaira(application.requested_amount_ngn) : null],
            ].map(([label, value]) => (
              <div key={String(label)} className="grid grid-cols-[8rem_1fr] gap-3 py-2.5">
                <dt className="text-xs text-ink-faint">{label}</dt>
                <dd className="min-w-0 break-words text-sm text-ink">
                  {value ? String(value) : <span className="text-ink-faint">Not provided</span>}
                </dd>
              </div>
            ))}
          </dl>

          {application.business_description && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-ink">What they do</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {application.business_description}
              </p>
            </div>
          )}

          {application.story && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-ink">Their story</h3>
              <div className="mt-1.5 space-y-3">
                {application.story.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={index} className="text-sm leading-relaxed text-ink-soft">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}

          {application.current_challenge && (
            <div className="mt-6 border-l-2 border-terracotta pl-4">
              <h3 className="text-sm font-medium text-ink">The challenge</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {application.current_challenge}
              </p>
            </div>
          )}

          {application.support_would_enable && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-ink">What support would enable</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {application.support_would_enable}
              </p>
            </div>
          )}

          <h3 className="mt-8 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
            Photographs
          </h3>
          {photos.length === 0 ? (
            <Alert tone="attention" className="mt-3">
              No photographs uploaded.
            </Alert>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((photo) => {
                const url = publicMediaUrl(photo.storage_path);
                if (!url) return null;
                return (
                  <a
                    key={photo.id}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square bg-widget-black-2"
                  >
                    <Image
                      src={url}
                      alt={photo.caption ?? "Business photograph"}
                      fill
                      sizes="200px"
                      unoptimized
                      className="object-cover"
                    />
                  </a>
                );
              })}
            </div>
          )}

          {videos.length > 0 && (
            <div className="mt-6 space-y-3">
              {videos.map((video) => {
                const url = publicMediaUrl(video.storage_path);
                if (!url) return null;
                return (
                  <video key={video.id} src={url} controls preload="metadata" className="w-full bg-ink">
                    Your browser cannot play this video.
                  </video>
                );
              })}
            </div>
          )}

          {allRequests.length > 0 && (
            <div className="mt-8">
              <h3 className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                Information requests
              </h3>
              <ul className="mt-3 space-y-2">
                {allRequests.map((request) => (
                  <li key={request.id} className="widget !p-0 px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-ink">{request.message}</p>
                      <StatusChip tone={request.resolved_at ? "positive" : "attention"}>
                        {request.resolved_at ? "Answered" : "Open"}
                      </StatusChip>
                    </div>
                    <p className="mt-1 text-2xs text-ink-faint">
                      {formatDateTime(request.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        </div>

        {/* ------------------------------------------------------ decision - */}
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <ReviewPanel
            applicationId={application.id}
            status={application.status}
            businessName={application.business_name ?? "this application"}
            permissions={{
              approve: can(reviewer, "alajo.approve"),
              reject: can(reviewer, "alajo.reject"),
              requestInfo: can(reviewer, "alajo.request_info"),
            }}
            missing={missing}
          />

          {profile && (
            <div className="mt-8 border-t border-rule pt-5">
              <ProfileControls
                profileId={profile.id}
                status={profile.status}
                slug={profile.slug}
                businessName={profile.business_name}
                canFeature={can(reviewer, "alajo.feature")}
                canSuspend={can(reviewer, "alajo.suspend")}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Signed URLs expire in ten minutes, which is long enough to read a document. */
async function signDocuments(paths: string[]): Promise<Array<string | null>> {
  if (paths.length === 0) return [];
  try {
    const admin = createAdminSupabase();
    const { data } = await admin.storage.from("alajo-documents").createSignedUrls(paths, 600);
    return (data ?? []).map((entry) => entry.signedUrl ?? null);
  } catch (err) {
    console.error("[admin] could not sign documents", err);
    return paths.map(() => null);
  }
}
