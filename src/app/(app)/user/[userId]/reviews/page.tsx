"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
import { getUserProfile } from "@/lib/firestore/users";
import type { Finding, UserProfile } from "@/types";

const STATUS_LABELS = {
  NOT_STARTED: "未着手",
  WIP: "作業中",
  COMPLETED: "レビュー待ち",
  REVIEWED: "レビュー済み",
} as const;

function readParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  return null;
}

export default function UserReviewsPage() {
  const params = useParams();
  const userId = readParam(params.userId);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setError("ユーザーIDが指定されていません。");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([getUserProfile(userId), listFindings({ reviewerUserId: userId })])
      .then(([profile, reviewedFindings]) => {
        if (!active) return;
        setUser(profile);
        setFindings(reviewedFindings);
      })
      .catch((err) => {
        console.error("failed to load review findings", err);
        if (active) setError("レビュー対象指摘事項の取得に失敗しました。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  let title = "レビュー対象指摘事項";
  if (user) {
    title = `${user.displayName}のレビュー対象指摘事項`;
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-light-text">{title}</h1>
      <ErrorMessage message={error} />
      {!user && !error && <p className="text-medium-text">ユーザーが見つかりません。</p>}
      {user && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>ドメイン</TableHeaderCell>
              <TableHeaderCell>タイトル</TableHeaderCell>
              <TableHeaderCell className="text-center">危険度</TableHeaderCell>
              <TableHeaderCell className="text-center">被害度</TableHeaderCell>
              <TableHeaderCell className="text-center">実現度</TableHeaderCell>
              <TableHeaderCell className="text-center">担当者</TableHeaderCell>
              <TableHeaderCell className="text-center">進捗状況</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {findings.length > 0 &&
              findings.map((finding) => (
                <TableRow key={finding.id}>
                  <TableCell>{finding.domainName || "-"}</TableCell>
                  <TableCell>
                    <Link className="text-accent-color hover:underline" href={`/findings/${finding.id}`}>
                      {finding.notFound && "[未検出] "}
                      {finding.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{finding.riskLevel}</TableCell>
                  <TableCell className="text-center">{finding.severity}</TableCell>
                  <TableCell className="text-center">{finding.feasibility}</TableCell>
                  <TableCell className="text-center">{finding.assignedUserName || "未設定"}</TableCell>
                  <TableCell className="text-center">{STATUS_LABELS[finding.status]}</TableCell>
                </TableRow>
              ))}
            {findings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-medium-text">
                  レビュー対象指摘事項が見つかりませんでした。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
