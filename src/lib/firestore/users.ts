import {
  collection,
  type DocumentSnapshot,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { batchedUpdate } from "@/lib/firestore/batch";
import type { UserProfile } from "@/types";

const USERS_COLLECTION = "users";
const FINDINGS_COLLECTION = "findings";

function usersCollection() {
  return collection(getFirebaseDb(), USERS_COLLECTION);
}

function toUserProfile(docSnap: DocumentSnapshot): UserProfile {
  return { uid: docSnap.id, ...(docSnap.data() as Omit<UserProfile, "uid">) };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return toUserProfile(snap);
}

export async function listUserProfiles(): Promise<UserProfile[]> {
  const snapshot = await getDocs(usersCollection());
  return snapshot.docs.map(toUserProfile);
}

/**
 * Self: displayName only. Admin: any field (enforced by firestore.rules).
 * A displayName change fans out to findings.assignedUserName /
 * reviewerUserName for every finding referencing this user.
 */
export async function updateUserProfile(
  uid: string,
  input: Partial<Pick<UserProfile, "displayName" | "isAdmin">>,
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, USERS_COLLECTION, uid), input);

  if (input.displayName !== undefined) {
    await propagateDisplayNameChange(uid, input.displayName);
  }
}

async function propagateDisplayNameChange(uid: string, displayName: string): Promise<void> {
  const db = getFirebaseDb();
  const findingsRef = collection(db, FINDINGS_COLLECTION);

  const assignedSnap = await getDocs(query(findingsRef, where("assignedUserId", "==", uid)));
  await batchedUpdate(assignedSnap.docs, () => ({ assignedUserName: displayName }));

  const reviewedSnap = await getDocs(query(findingsRef, where("reviewerUserId", "==", uid)));
  await batchedUpdate(reviewedSnap.docs, () => ({ reviewerUserName: displayName }));
}
