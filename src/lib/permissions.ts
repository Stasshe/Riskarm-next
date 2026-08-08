import type { Finding, FindingStatus } from "@/types";

/**
 * Pure functions mirroring the firestore.rules permission logic, for
 * CLIENT-SIDE UI GATING ONLY (show/hide buttons). Firestore rules remain
 * the actual enforcement boundary; keep this file's transition table in
 * sync with firestore.rules if either ever changes.
 */

export type FindingStatusAction = "next" | "prev";

interface StatusTransition {
  from: FindingStatus;
  to: FindingStatus;
  action: FindingStatusAction;
  allowedRole: "assignee" | "reviewer" | "assigneeOrReviewer";
}

/** Ported from original/app/views/finding.py update_progress(). */
const STATUS_TRANSITIONS: readonly StatusTransition[] = [
  { from: "NOT_STARTED", to: "WIP", action: "next", allowedRole: "assignee" },
  { from: "WIP", to: "COMPLETED", action: "next", allowedRole: "assignee" },
  { from: "COMPLETED", to: "REVIEWED", action: "next", allowedRole: "reviewer" },
  { from: "REVIEWED", to: "COMPLETED", action: "prev", allowedRole: "assigneeOrReviewer" },
  { from: "COMPLETED", to: "WIP", action: "prev", allowedRole: "assignee" },
  { from: "WIP", to: "NOT_STARTED", action: "prev", allowedRole: "assignee" },
];

function hasRole(finding: Finding, uid: string, role: StatusTransition["allowedRole"]): boolean {
  const isAssignee = finding.assignedUserId === uid;
  const isReviewer = finding.reviewerUserId === uid;
  if (role === "assignee") return isAssignee;
  if (role === "reviewer") return isReviewer;
  return isAssignee || isReviewer;
}

function findTransition(
  status: FindingStatus,
  action: FindingStatusAction,
): StatusTransition | undefined {
  return STATUS_TRANSITIONS.find(
    (transition) => transition.from === status && transition.action === action,
  );
}

/** The status a `next`/`prev` action would move a finding to, or null if none applies. */
export function nextFindingStatus(
  currentStatus: FindingStatus,
  action: FindingStatusAction,
): FindingStatus | null {
  return findTransition(currentStatus, action)?.to ?? null;
}

export function canAdvanceStatus(
  finding: Finding,
  uid: string,
  action: FindingStatusAction,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  const transition = findTransition(finding.status, action);
  if (!transition) return false;
  return hasRole(finding, uid, transition.allowedRole);
}

/** Content fields (title/description/etc, excluding role & lifecycle fields). */
export function canEditContent(finding: Finding, uid: string, isAdmin: boolean): boolean {
  return isAdmin || finding.assignedUserId === uid;
}

/** Assignee may pick any reviewer except themself; admin may pick anyone. */
export function canSetReviewer(
  finding: Finding,
  uid: string,
  targetReviewerId: string | null,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (finding.assignedUserId !== uid) return false;
  return targetReviewerId !== uid;
}

/** Reassigning the assignee is admin-only, mirroring firestore.rules. */
export function canReassignUser(isAdmin: boolean): boolean {
  return isAdmin;
}

export function canDelete(isAdmin: boolean): boolean {
  return isAdmin;
}

export function canRestore(isAdmin: boolean): boolean {
  return isAdmin;
}
