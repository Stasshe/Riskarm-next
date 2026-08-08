import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase";
import { DEFAULT_SETTING, type Setting } from "@/types";

const SETTINGS_DOC_ID = "app";

function settingsRef() {
  return doc(getFirebaseDb(), "settings", SETTINGS_DOC_ID);
}

export async function getSettings(): Promise<Setting> {
  const snap = await getDoc(settingsRef());
  if (!snap.exists()) return DEFAULT_SETTING;
  return snap.data() as Setting;
}

/** Admin-only (enforced by firestore.rules). */
export async function updateSettings(
  input: Pick<Setting, "reportTitle" | "notFoundPrefix">,
): Promise<void> {
  await setDoc(settingsRef(), { ...input, updatedAt: serverTimestamp() }, { merge: true });
}
