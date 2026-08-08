"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import FindingReportBlock from "@/components/FindingReportBlock";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getDomain } from "@/lib/firestore/domains";
import { getFinding } from "@/lib/firestore/findings";
import type { Domain, Finding } from "@/types";

function readParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  return null;
}

export default function FindingReportPage() {
  const params = useParams();
  const findingId = readParam(params.findingId);
  const [finding, setFinding] = useState<Finding | null>(null);
  const [domain, setDomain] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!findingId) {
      setError("指摘事項IDが指定されていません。");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getFinding(findingId)
      .then(async (loadedFinding) => {
        if (!loadedFinding) return { loadedFinding, loadedDomain: null };

        let loadedDomain: Domain | null = null;
        if (loadedFinding.domainId) {
          loadedDomain = await getDomain(loadedFinding.domainId);
        }
        return { loadedFinding, loadedDomain };
      })
      .then(({ loadedFinding, loadedDomain }) => {
        if (!active) return;
        setFinding(loadedFinding);
        setDomain(loadedDomain);
      })
      .catch((err) => {
        console.error("failed to load finding report", err);
        if (active) setError("指摘事項レポートの取得に失敗しました。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [findingId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <main className="p-8">
        <ErrorMessage message={error} />
      </main>
    );
  }

  if (!finding) {
    return (
      <div className="flex h-screen items-center justify-center">指摘事項が見つかりません。</div>
    );
  }

  return (
    <>
      <div className="fixed right-6 top-6 z-50 print:hidden">
        <Button type="button" variant="primary" onClick={() => window.print()}>
          印刷
        </Button>
      </div>
      {domain && (
        <div className="sr-only">
          {domain.name}
          {domain.url}
        </div>
      )}
      <table className="m-0 p-0">
        <thead>
          <tr>
            <td>
              {/* biome-ignore lint/performance/noImgElement: print CSS targets the original report header image markup. */}
              <img className="header-icon" alt="" src="/images/header.svg" />
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <FindingReportBlock finding={finding} index={0} />
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
