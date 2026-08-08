"use client";

import { onSnapshot, type Query, type QueryDocumentSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

export interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Thin live-updating wrapper around Firestore onSnapshot for a collection
 * query. Pass `null` for `queryRef` to skip subscribing (e.g. while a
 * dependent id is not yet known).
 */
export function useCollection<T>(
  queryRef: Query | null,
  mapDoc: (docSnap: QueryDocumentSnapshot) => T,
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mapDoc is intentionally excluded; including it would resubscribe on every render for inline mappers.
  useEffect(() => {
    if (!queryRef) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot) => {
        setData(snapshot.docs.map(mapDoc));
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [queryRef]);

  return { data, loading, error };
}
