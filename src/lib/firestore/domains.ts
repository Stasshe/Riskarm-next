import {
  addDoc,
  collection,
  type DocumentSnapshot,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { parseCsvToDomainInputs } from "@/lib/csv";
import { getFirebaseDb } from "@/lib/firebase";
import { batchedUpdate } from "@/lib/firestore/batch";
import type { Domain, DomainInput } from "@/types";

const DOMAINS_COLLECTION = "domains";
const FINDINGS_COLLECTION = "findings";
const BULK_BATCH_LIMIT = 500;

function domainsCollection() {
  return collection(getFirebaseDb(), DOMAINS_COLLECTION);
}

function toDomain(docSnap: DocumentSnapshot): Domain {
  return { id: docSnap.id, ...(docSnap.data() as Omit<Domain, "id">) };
}

export async function listDomains(options: { includeDeleted?: boolean } = {}): Promise<Domain[]> {
  const baseQuery = options.includeDeleted
    ? query(domainsCollection(), orderBy("createdAt", "desc"))
    : query(domainsCollection(), where("deleted", "==", false), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(baseQuery);
  return snapshot.docs.map(toDomain);
}

export async function getDomain(domainId: string): Promise<Domain | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, DOMAINS_COLLECTION, domainId));
  if (!snap.exists()) return null;
  return toDomain(snap);
}

export async function createDomain(input: DomainInput): Promise<string> {
  const docRef = await addDoc(domainsCollection(), {
    ...input,
    deleted: false,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    findingsCount: 0,
  });
  return docRef.id;
}

export async function updateDomain(domainId: string, input: DomainInput): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, DOMAINS_COLLECTION, domainId), {
    ...input,
    updatedAt: serverTimestamp(),
  });
  await propagateToFindings(domainId, () => ({ domainName: input.name }));
}

export async function softDeleteDomain(domainId: string): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, DOMAINS_COLLECTION, domainId), {
    deleted: true,
    deletedAt: serverTimestamp(),
  });
  await propagateToFindings(domainId, () => ({ domainDeleted: true }));
}

export async function restoreDomain(domainId: string): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, DOMAINS_COLLECTION, domainId), { deleted: false, deletedAt: null });
  await propagateToFindings(domainId, () => ({ domainDeleted: false }));
}

async function propagateToFindings(
  domainId: string,
  buildUpdate: () => { domainName: string } | { domainDeleted: boolean },
): Promise<void> {
  const db = getFirebaseDb();
  const findingsSnap = await getDocs(
    query(collection(db, FINDINGS_COLLECTION), where("domainId", "==", domainId)),
  );
  await batchedUpdate(findingsSnap.docs, buildUpdate);
}

/** Parses CSV text (src/lib/csv.ts) and writes all rows via batched writes (<=500/batch). */
export async function bulkAddDomains(csvText: string): Promise<number> {
  const inputs = parseCsvToDomainInputs(csvText);
  const db = getFirebaseDb();

  let batch = writeBatch(db);
  let opsInBatch = 0;

  for (const input of inputs) {
    const domainRef = doc(domainsCollection());
    batch.set(domainRef, {
      ...input,
      deleted: false,
      deletedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      findingsCount: 0,
    });
    opsInBatch++;
    if (opsInBatch === BULK_BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      opsInBatch = 0;
    }
  }
  if (opsInBatch > 0) {
    await batch.commit();
  }
  return inputs.length;
}
