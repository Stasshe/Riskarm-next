"use client";

import { useEffect, useState } from "react";
import type { Timestamp } from "firebase/firestore";

import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/Table";
import { useAuth } from "@/lib/auth";
import { listDomains, restoreDomain } from "@/lib/firestore/domains";
import { listFindings, restoreFinding } from "@/lib/firestore/findings";
import type { Domain, Finding } from "@/types";

function formatTimestamp(timestamp: Timestamp | null): string {
  if (!timestamp) return "-";
  return timestamp.toDate().toLocaleString("ja-JP");
}

export default function AdminDeletedItemsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDeletedItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const [allDomains, allFindings] = await Promise.all([
        listDomains({ includeDeleted: true }),
        listFindings({ includeDeleted: true }),
      ]);
      setDomains(allDomains.filter((domain) => domain.deleted));
      setFindings(allFindings.filter((finding) => finding.deleted));
    } catch (err) {
      console.error("failed to load deleted items", err);
      setError("削除済みアイテムの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    void loadDeletedItems();
  }, [authLoading, isAdmin]);

  const handleRestoreDomain = async (domainId: string) => {
    setRestoringId(domainId);
    setError(null);

    try {
      await restoreDomain(domainId);
      setDomains((current) => current.filter((domain) => domain.id !== domainId));
    } catch (err) {
      console.error("failed to restore domain", err);
      setError("ドメインの復元に失敗しました。");
    } finally {
      setRestoringId(null);
    }
  };

  const handleRestoreFinding = async (finding: Finding) => {
    setRestoringId(finding.id);
    setError(null);

    try {
      await restoreFinding(finding);
      setFindings((current) => current.filter((item) => item.id !== finding.id));
    } catch (err) {
      console.error("failed to restore finding", err);
      setError("指摘事項の復元に失敗しました。");
    } finally {
      setRestoringId(null);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return (
      <main className="p-8">
        <h1 className="mb-4 text-3xl font-bold text-light-text">削除済みアイテム</h1>
        <p className="rounded-md border border-danger-DEFAULT bg-dark-card p-4 text-danger-DEFAULT">
          このページを表示する権限がありません。管理者のみ利用できます。
        </p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-light-text">削除済みアイテム</h1>
      <ErrorMessage message={error} />

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-semibold text-light-text">削除済みドメイン</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>名前</TableHeaderCell>
              <TableHeaderCell>削除日時</TableHeaderCell>
              <TableHeaderCell className="text-center">操作</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.length > 0 &&
              domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell>{domain.id}</TableCell>
                  <TableCell>{domain.name}</TableCell>
                  <TableCell>{formatTimestamp(domain.deletedAt)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="success"
                      size="small"
                      disabled={restoringId === domain.id}
                      onClick={() => handleRestoreDomain(domain.id)}
                    >
                      復元
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {domains.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-medium-text">
                  削除されたドメインはありません。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold text-light-text">削除済み指摘事項</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>タイトル</TableHeaderCell>
              <TableHeaderCell>ドメイン</TableHeaderCell>
              <TableHeaderCell>削除日時</TableHeaderCell>
              <TableHeaderCell className="text-center">操作</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.length > 0 &&
              findings.map((finding) => (
                <TableRow key={finding.id}>
                  <TableCell>{finding.id}</TableCell>
                  <TableCell>
                    {finding.notFound && "[未検出] "}
                    {finding.title}
                  </TableCell>
                  <TableCell>{finding.domainName || "-"}</TableCell>
                  <TableCell>{formatTimestamp(finding.deletedAt)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="success"
                      size="small"
                      disabled={restoringId === finding.id}
                      onClick={() => handleRestoreFinding(finding)}
                    >
                      復元
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {findings.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-medium-text">
                  削除された指摘事項はありません。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
