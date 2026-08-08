import {
  collection,
  type DocumentSnapshot,
  doc,
  getDoc,
  getDocs,
  increment,
  type QueryConstraint,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase";
import { type FindingStatusAction, nextFindingStatus } from "@/lib/permissions";
import { computeRiskLevel } from "@/lib/riskMatrix";
import type { Finding, FindingContentInput } from "@/types";

const FINDINGS_COLLECTION = "findings";
const DOMAINS_COLLECTION = "domains";

function findingsCollection() {
  return collection(getFirebaseDb(), FINDINGS_COLLECTION);
}

function toFinding(docSnap: DocumentSnapshot): Finding {
  return { id: docSnap.id, ...(docSnap.data() as Omit<Finding, "id">) };
}

export interface FindingListFilter {
  domainId?: string;
  assignedUserId?: string;
  reviewerUserId?: string;
  includeDeleted?: boolean;
}

export async function listFindings(filter: FindingListFilter = {}): Promise<Finding[]> {
  const constraints: QueryConstraint[] = [];
  if (filter.domainId) constraints.push(where("domainId", "==", filter.domainId));
  if (filter.assignedUserId) constraints.push(where("assignedUserId", "==", filter.assignedUserId));
  if (filter.reviewerUserId) constraints.push(where("reviewerUserId", "==", filter.reviewerUserId));
  if (!filter.includeDeleted) constraints.push(where("deleted", "==", false));

  const snapshot = await getDocs(query(findingsCollection(), ...constraints));
  return snapshot.docs.map(toFinding);
}

export async function getFinding(findingId: string): Promise<Finding | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, FINDINGS_COLLECTION, findingId));
  if (!snap.exists()) return null;
  return toFinding(snap);
}

interface CreateFindingParams {
  domainId: string;
  domainName: string;
  content: FindingContentInput;
  assignedUserId: string;
  assignedUserName: string;
}

/** Creator becomes the assignee; status always starts NOT_STARTED (mirrors firestore.rules create check). */
export async function createFinding(params: CreateFindingParams): Promise<string> {
  const db = getFirebaseDb();
  const riskLevel = computeRiskLevel(params.content.severity, params.content.feasibility);
  const findingRef = doc(findingsCollection());

  await setDoc(findingRef, {
    ...params.content,
    domainId: params.domainId,
    domainName: params.domainName,
    domainDeleted: false,
    assignedUserId: params.assignedUserId,
    assignedUserName: params.assignedUserName,
    reviewerUserId: null,
    reviewerUserName: "",
    status: "NOT_STARTED",
    riskLevel,
    deleted: false,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, DOMAINS_COLLECTION, params.domainId), { findingsCount: increment(1) });

  return findingRef.id;
}

/** Content edit by the assignee: recomputes riskLevel from severity/feasibility. */
export async function updateFindingContent(
  findingId: string,
  content: FindingContentInput,
): Promise<void> {
  const db = getFirebaseDb();
  const riskLevel = computeRiskLevel(content.severity, content.feasibility);
  await updateDoc(doc(db, FINDINGS_COLLECTION, findingId), {
    ...content,
    riskLevel,
    updatedAt: serverTimestamp(),
  });
}

/** Advances/reverts status per the ported state machine (see src/lib/permissions.ts). */
export async function transitionFindingStatus(
  finding: Finding,
  action: FindingStatusAction,
): Promise<void> {
  const db = getFirebaseDb();
  const target = nextFindingStatus(finding.status, action);
  if (!target) {
    throw new Error(`No valid "${action}" transition from status ${finding.status}.`);
  }
  await updateDoc(doc(db, FINDINGS_COLLECTION, finding.id), {
    status: target,
    updatedAt: serverTimestamp(),
  });
}

/** Admin-only reassignment (enforced by firestore.rules). */
export async function assignFindingUser(
  findingId: string,
  userId: string,
  userName: string,
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, FINDINGS_COLLECTION, findingId), {
    assignedUserId: userId,
    assignedUserName: userName,
    updatedAt: serverTimestamp(),
  });
}

/** Assignee (or admin) sets/clears the reviewer; assignee may not appoint themself. */
export async function assignFindingReviewer(
  findingId: string,
  reviewerId: string | null,
  reviewerName: string,
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, FINDINGS_COLLECTION, findingId), {
    reviewerUserId: reviewerId,
    reviewerUserName: reviewerName,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteFinding(finding: Finding): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, FINDINGS_COLLECTION, finding.id), {
    deleted: true,
    deletedAt: serverTimestamp(),
  });
  if (finding.domainId) {
    await updateDoc(doc(db, DOMAINS_COLLECTION, finding.domainId), {
      findingsCount: increment(-1),
    });
  }
}

export async function restoreFinding(finding: Finding): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, FINDINGS_COLLECTION, finding.id), { deleted: false, deletedAt: null });
  if (finding.domainId) {
    await updateDoc(doc(db, DOMAINS_COLLECTION, finding.domainId), { findingsCount: increment(1) });
  }
}
