import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { listEmailEvents } from "@/lib/data/admin";
import { can } from "@/lib/rbac";
import { DashboardPage } from "@/components/dashboard/shell";
import { Alert, DataTable, EmptyState, StatusChip, Td, Th } from "@/components/ui/primitives";
import { RetryEmailButton } from "./retry-button";
import { formatDateTime } from "@/lib/format";
import type { EmailStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Email delivery", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TONES: Record<EmailStatus, "neutral" | "progress" | "positive" | "negative"> = {
  queued: "neutral",
  sending: "progress",
  sent: "positive",
  delivered: "positive",
  bounced: "negative",
  complained: "negative",
  failed: "negative",
};

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await requirePermission("email.view");
  const { status } = await searchParams;

  const statuses: EmailStatus[] | undefined =
    status === "failed"
      ? ["failed", "bounced", "complained"]
      : status === "sent"
        ? ["sent", "delivered"]
        : undefined;

  const events = await listEmailEvents({ ...(statuses ? { status: statuses } : {}), limit: 150 });
  const failures = events.filter((e) => ["failed", "bounced", "complained"].includes(e.status));
  const canRetry = can(admin, "email.retry");

  return (
    <DashboardPage
      title="Email delivery"
      description="Every message the platform has tried to send, and whether it arrived."
      actions={
        <div className="flex gap-3 text-sm">
          <Link href="/admin/emails" className="link-rule text-ink-soft hover:text-ink">
            All
          </Link>
          <Link href="/admin/emails?status=failed" className="link-rule text-ink-soft hover:text-ink">
            Failures
          </Link>
          <Link href="/admin/emails?status=sent" className="link-rule text-ink-soft hover:text-ink">
            Delivered
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {failures.length > 0 && !status && (
          <Alert tone="negative" title={`${failures.length} did not arrive`}>
            Each of these is somebody who is waiting on a message that never reached them. Retry
            after checking the error, so you are not resending into the same failure.
          </Alert>
        )}

        {events.length === 0 ? (
          <EmptyState
            title="Nothing sent yet"
            description="Transactional email is logged here as soon as the platform sends anything."
          />
        ) : (
          <DataTable className="min-w-[56rem]">
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>Recipient</Th>
                <Th>Subject</Th>
                <Th>Status</Th>
                <Th>Queued</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="align-top">
                  <Td>
                    <span className="font-mono text-2xs text-ink-soft">{event.event_type}</span>
                  </Td>
                  <Td className="text-ink-soft">{event.recipient_email}</Td>
                  <Td>
                    <span className="text-ink">{event.subject}</span>
                    {event.error_message && (
                      <p className="mt-1 max-w-md font-mono text-2xs leading-relaxed text-danger">
                        {event.error_message}
                      </p>
                    )}
                    {event.provider_message_id && (
                      <p className="mt-1 font-mono text-2xs text-ink-faint">
                        {event.provider}: {event.provider_message_id}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <StatusChip tone={TONES[event.status]}>{event.status}</StatusChip>
                    {event.attempts > 0 && (
                      <p className="mt-1 text-2xs text-ink-faint tabular">
                        {event.attempts} retr{event.attempts === 1 ? "y" : "ies"}
                      </p>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-2xs text-ink-faint">
                    {formatDateTime(event.queued_at)}
                  </Td>
                  <Td>
                    {canRetry && ["failed", "bounced"].includes(event.status) && (
                      <RetryEmailButton emailEventId={event.id} />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </div>
    </DashboardPage>
  );
}
