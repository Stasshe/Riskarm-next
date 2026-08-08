import { type QueryDocumentSnapshot, writeBatch } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase";

const BATCH_LIMIT = 500;

type BatchPatch = Record<string, string | boolean | null>;

/**
 * Applies `buildUpdate(docSnap)` to every doc in `docs` via writeBatch,
 * committing every BATCH_LIMIT docs to stay under Firestore's per-batch
 * write cap. Used for denormalization fan-out: propagating a domain
 * rename/delete or a user displayName change onto the findings that
 * denormalize that data (see plan section 1).
 */
export async function batchedUpdate(
  docs: QueryDocumentSnapshot[],
  buildUpdate: (docSnap: QueryDocumentSnapshot) => BatchPatch,
): Promise<void> {
  const db = getFirebaseDb();
  let batch = writeBatch(db);
  let opsInBatch = 0;

  for (const docSnap of docs) {
    batch.update(docSnap.ref, buildUpdate(docSnap));
    opsInBatch++;
    if (opsInBatch === BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      opsInBatch = 0;
    }
  }
  if (opsInBatch > 0) {
    await batch.commit();
  }
}
