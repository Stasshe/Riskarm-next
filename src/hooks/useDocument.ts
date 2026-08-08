"use client";

import { type DocumentReference, type DocumentSnapshot, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

export interface UseDocumentResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Thin live-updating wrapper around Firestore onSnapshot for a single
 * document. Pass `null` for `docRef` to skip subscribing (e.g. while a
 * dependent id is not yet known).
 */
export function useDocument<T>(
  docRef: DocumentReference | null,
  mapDoc: (docSnap: DocumentSnapshot) => T | null,
): UseDocumentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mapDoc is intentionally excluded; including it would resubscribe on every render for inline mappers.
  useEffect(() => {
    if (!docRef) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        setData(mapDoc(snapshot));
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [docRef]);

  return { data, loading, error };
}
