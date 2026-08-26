import type {
  AlajoProfileStatus,
  ApplicationStatus,
  CampaignStatus,
  ConfirmationStatus,
  SelectionStatus,
  UserStatus,
} from "@/lib/types";

/**
 * The same edge list the database enforces in 0002_functions_and_state_machines.
 * Duplicated deliberately: the app uses it to decide which buttons to render,
 * the database uses it to make sure nobody skips a step regardless.
 * `tests/state-machine.test.ts` asserts the two stay identical.
 */

export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["under_review", "more_information_required", "approved", "rejected", "withdrawn"],
  under_review: ["more_information_required", "approved", "rejected", "submitted", "withdrawn"],
  more_information_required: ["submitted", "withdrawn"],
  approved: ["suspended", "withdrawn"],
  rejected: ["under_review"],
  suspended: ["approved", "rejected"],
  withdrawn: ["draft"],
};

export const ALAJO_PROFILE_TRANSITIONS: Record<AlajoProfileStatus, AlajoProfileStatus[]> = {
  private: ["pending"],
  pending: ["approved", "private"],
  approved: ["featured", "suspended", "archived"],
  featured: ["approved", "suspended", "archived"],
  suspended: ["approved", "archived"],
  archived: ["private"],
};

export const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["selection_period", "cancelled"],
  selection_period: ["under_review", "cancelled"],
  under_review: ["confirmed", "selection_period", "cancelled"],
  confirmed: ["announced", "cancelled"],
  announced: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const CONFIRMATION_TRANSITIONS: Record<ConfirmationStatus, ConfirmationStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["announced", "cancelled"],
  announced: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const SELECTION_TRANSITIONS: Record<SelectionStatus, SelectionStatus[]> = {
  recorded: ["shortlisted", "declined", "withdrawn"],
  shortlisted: ["confirmed", "declined", "withdrawn"],
  confirmed: ["withdrawn"],
  declined: [],
  withdrawn: [],
};

export const USER_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  pending: ["approved", "rejected", "suspended"],
  approved: ["suspended", "rejected"],
  suspended: ["approved", "rejected"],
  rejected: ["pending"],
};

export const TRANSITION_TABLES = {
  application: APPLICATION_TRANSITIONS,
  alajo_profile: ALAJO_PROFILE_TRANSITIONS,
  campaign: CAMPAIGN_TRANSITIONS,
  confirmation: CONFIRMATION_TRANSITIONS,
  selection: SELECTION_TRANSITIONS,
  user: USER_TRANSITIONS,
} as const;

export type TransitionEntity = keyof typeof TRANSITION_TABLES;

export function canTransition(entity: TransitionEntity, from: string, to: string): boolean {
  if (from === to) return true;
  const table = TRANSITION_TABLES[entity] as Record<string, string[]>;
  return (table[from] ?? []).includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(entity: TransitionEntity, from: string, to: string) {
    super(`Cannot move ${entity} from "${from}" to "${to}".`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(entity: TransitionEntity, from: string, to: string): void {
  if (!canTransition(entity, from, to)) throw new InvalidTransitionError(entity, from, to);
}

// -------------------------------------------------------------- display ----

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  more_information_required: "More information needed",
  approved: "Approved",
  rejected: "Not approved",
  suspended: "Suspended",
  withdrawn: "Withdrawn",
};

export const ALAJO_PROFILE_STATUS_LABELS: Record<AlajoProfileStatus, string> = {
  private: "Private",
  pending: "Awaiting publication",
  approved: "Live",
  featured: "Featured",
  suspended: "Suspended",
  archived: "Archived",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  open: "Open",
  selection_period: "Selection open",
  under_review: "Under review",
  confirmed: "Confirmed",
  announced: "Announced",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CONFIRMATION_STATUS_LABELS: Record<ConfirmationStatus, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  announced: "Announced",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Visual weight for status chips. Keeps colour decisions out of components. */
export type StatusTone = "neutral" | "progress" | "positive" | "attention" | "negative";

export function applicationTone(status: ApplicationStatus): StatusTone {
  switch (status) {
    case "approved":
      return "positive";
    case "rejected":
    case "suspended":
      return "negative";
    case "more_information_required":
      return "attention";
    case "submitted":
    case "under_review":
      return "progress";
    default:
      return "neutral";
  }
}
