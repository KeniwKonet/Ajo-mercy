import "server-only";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { getRequestContext } from "@/lib/request-context";
import type { Profile } from "@/lib/types";

/** Every administrative verb the platform can record. */
export const AUDIT_ACTIONS = {
  ALAJO_APPLICATION_APPROVED: "alajo.application.approved",
  ALAJO_APPLICATION_REJECTED: "alajo.application.rejected",
  ALAJO_APPLICATION_INFO_REQUESTED: "alajo.application.info_requested",
  ALAJO_APPLICATION_REVIEW_STARTED: "alajo.application.review_started",
  ALAJO_PROFILE_FEATURED: "alajo.profile.featured",
  ALAJO_PROFILE_UNFEATURED: "alajo.profile.unfeatured",
  ALAJO_PROFILE_SUSPENDED: "alajo.profile.suspended",
  ALAJO_PROFILE_RESTORED: "alajo.profile.restored",
  ALAJO_PROFILE_ARCHIVED: "alajo.profile.archived",
  SUPPORTER_APPROVED: "supporter.approved",
  SUPPORTER_REJECTED: "supporter.rejected",
  SUPPORTER_INFO_REQUESTED: "supporter.info_requested",
  BRAND_APPROVED: "brand.approved",
  BRAND_REJECTED: "brand.rejected",
  BRAND_INFO_REQUESTED: "brand.info_requested",
  CAMPAIGN_CREATED: "campaign.created",
  CAMPAIGN_STATUS_CHANGED: "campaign.status_changed",
  CAMPAIGN_ALAJO_ADDED: "campaign.alajo_added",
  CAMPAIGN_ALAJO_REMOVED: "campaign.alajo_removed",
  SELECTION_RECORDED: "selection.recorded",
  SELECTION_SHORTLISTED: "selection.shortlisted",
  SELECTION_DECLINED: "selection.declined",
  CONFIRMATION_CREATED: "confirmation.created",
  CONFIRMATION_CONFIRMED: "confirmation.confirmed",
  CONFIRMATION_ANNOUNCED: "confirmation.announced",
  CONFIRMATION_COMPLETED: "confirmation.completed",
  CONFIRMATION_CANCELLED: "confirmation.cancelled",
  USER_SUSPENDED: "user.suspended",
  USER_RESTORED: "user.restored",
  STAFF_ROLE_CHANGED: "staff.role_changed",
  STAFF_PERMISSIONS_CHANGED: "staff.permissions_changed",
  EMAIL_RETRIED: "email.retried",
  ANNOUNCEMENT_PUBLISHED: "announcement.published",
  ADMIN_NOTE_ADDED: "admin.note_added",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface AuditInput {
  actor: Pick<Profile, "id" | "email" | "role"> | null;
  action: AuditAction;
  entityTable: string;
  entityId?: string | null;
  /** Human label so the log reads without joining, e.g. "Mama T's Kitchen". */
  entityLabel?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
}

/**
 * Writes an audit row. Deliberately non-throwing: an audit failure must never
 * roll back a completed administrative action, but it is logged loudly.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const ctx = await getRequestContext();
    const admin = createAdminSupabase();
    const { error } = await admin.from("audit_logs").insert({
      actor_id: input.actor?.id ?? null,
      actor_email: input.actor?.email ?? null,
      actor_role: input.actor?.role ?? null,
      action: input.action,
      entity_table: input.entityTable,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      reason: input.reason ?? null,
      ip_hash: ctx.ipHash,
    });
    if (error) console.error("[audit] insert failed", error.message, input.action);
  } catch (err) {
    console.error("[audit] unexpected failure", err);
  }
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "alajo.application.approved": "Approved Alajo",
  "alajo.application.rejected": "Rejected application",
  "alajo.application.info_requested": "Requested more information",
  "alajo.application.review_started": "Started review",
  "alajo.profile.featured": "Featured profile",
  "alajo.profile.unfeatured": "Removed feature",
  "alajo.profile.suspended": "Suspended profile",
  "alajo.profile.restored": "Restored profile",
  "alajo.profile.archived": "Archived profile",
  "supporter.approved": "Approved supporter",
  "supporter.rejected": "Rejected supporter",
  "supporter.info_requested": "Requested supporter information",
  "brand.approved": "Approved brand",
  "brand.rejected": "Rejected brand",
  "brand.info_requested": "Requested brand information",
  "campaign.created": "Created campaign",
  "campaign.status_changed": "Changed campaign status",
  "campaign.alajo_added": "Added Alajo to campaign",
  "campaign.alajo_removed": "Removed Alajo from campaign",
  "selection.recorded": "Recorded selection",
  "selection.shortlisted": "Shortlisted selection",
  "selection.declined": "Declined selection",
  "confirmation.created": "Created support record",
  "confirmation.confirmed": "Confirmed support recipient",
  "confirmation.announced": "Announced support",
  "confirmation.completed": "Marked support complete",
  "confirmation.cancelled": "Cancelled support",
  "user.suspended": "Suspended account",
  "user.restored": "Restored account",
  "staff.role_changed": "Changed staff role",
  "staff.permissions_changed": "Changed staff permissions",
  "email.retried": "Retried email",
  "announcement.published": "Published announcement",
  "admin.note_added": "Added note",
};
