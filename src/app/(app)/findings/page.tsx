"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
import { listFindings } from "@/lib/firestore/findings";
import type { Finding, FindingStatus } from "@/types";

const STATUS_LABELS: Record<FindingStatus, string> = {
  NOT_STARTED: "未着手",
  WIP: "作業中",
  COMPLETED: "完了",
  REVIEWED: "レビュー済み",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "指摘事項一覧の取得に失敗しました。";
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadFindings() {
      setLoading(true);
      setError(null);
      try {
        const loaded = await listFindings();
        if (active) {
          setFindings(loaded);
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadFindings();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-light-text">指摘事項一覧</h1>
      <ErrorMessage message={error} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>ドメイン</TableHeaderCell>
            <TableHeaderCell>タイトル</TableHeaderCell>
            <TableHeaderCell className="text-center">危険度</TableHeaderCell>
            <TableHeaderCell className="text-center">被害度</TableHeaderCell>
            <TableHeaderCell className="text-center">実現度</TableHeaderCell>
            <TableHeaderCell className="text-center">担当者</TableHeaderCell>
            <TableHeaderCell className="text-center">レビュア</TableHeaderCell>
            <TableHeaderCell className="text-center">進捗状況</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((finding) => (
            <TableRow key={finding.id}>
              <TableCell>
                {finding.domainId ? (
                  <Link
                    href={`/domains/${finding.domainId}`}
                    className="text-link-DEFAULT hover:text-link-hover hover:underline"
                  >
                    {finding.domainName}
                  </Link>
                ) : (
                  <span className="text-medium-text">{finding.domainName || "-"}</span>
                )}
              </TableCell>
              <TableCell>
                <Link
                  href={`/findings/${finding.id}`}
                  className="text-link-DEFAULT hover:text-link-hover hover:underline"
                >
                  {finding.notFound && "[未検出] "}
                  {finding.title}
                </Link>
              </TableCell>
              <TableCell className="text-center">{finding.riskLevel}</TableCell>
              <TableCell className="text-center">{finding.severity}</TableCell>
              <TableCell className="text-center">{finding.feasibility}</TableCell>
              <TableCell className="text-center">{finding.assignedUserName || "未設定"}</TableCell>
              <TableCell className="text-center">{finding.reviewerUserName || "未設定"}</TableCell>
              <TableCell className="text-center">{STATUS_LABELS[finding.status]}</TableCell>
            </TableRow>
          ))}
          {findings.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-medium-text">
                指摘事項が見つかりませんでした。
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}
