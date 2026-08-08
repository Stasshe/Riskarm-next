import {
  collection,
  type DocumentSnapshot,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase";
import { computeRiskLevel } from "@/lib/riskMatrix";
import type { FindingTemplate, FindingTemplateInput } from "@/types";

const TEMPLATES_COLLECTION = "findingTemplates";

function templatesCollection() {
  return collection(getFirebaseDb(), TEMPLATES_COLLECTION);
}

function toTemplate(docSnap: DocumentSnapshot): FindingTemplate {
  return { id: docSnap.id, ...(docSnap.data() as Omit<FindingTemplate, "id">) };
}

export async function listTemplates(): Promise<FindingTemplate[]> {
  const snapshot = await getDocs(query(templatesCollection(), orderBy("createdAt", "desc")));
  return snapshot.docs.map(toTemplate);
}

export async function getTemplate(templateId: string): Promise<FindingTemplate | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, TEMPLATES_COLLECTION, templateId));
  if (!snap.exists()) return null;
  return toTemplate(snap);
}

export async function createTemplate(input: FindingTemplateInput): Promise<string> {
  const templateRef = doc(templatesCollection());
  await setDoc(templateRef, {
    ...input,
    riskLevel: computeRiskLevel(input.severity, input.feasibility),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return templateRef.id;
}

export async function updateTemplate(
  templateId: string,
  input: FindingTemplateInput,
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, TEMPLATES_COLLECTION, templateId), {
    ...input,
    riskLevel: computeRiskLevel(input.severity, input.feasibility),
    updatedAt: serverTimestamp(),
  });
}

/** Hard delete, matching original/app/models/finding_template.py (no soft-delete for templates). */
export async function deleteTemplate(templateId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, TEMPLATES_COLLECTION, templateId));
}
