"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
import { notifyDiscord } from "@/lib/discordNotify";
import { getDomain, softDeleteDomain } from "@/lib/firestore/domains";
import { listFindings } from "@/lib/firestore/findings";
import type { Domain, Finding, FindingStatus } from "@/types";

const STATUS_LABELS: Record<FindingStatus, string> = {
  NOT_STARTED: "未着手",
  WIP: "作業中",
  COMPLETED: "完了",
  REVIEWED: "レビュー済み",
};

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  return value;
}

function formatLocations(finding: Finding): string {
  const urls = finding.locations
    .map((location) => location.url)
    .filter((url) => url.length > 0)
    .join(", ");
  if (!urls) {
    return "-";
  }
  return urls;
}

export default function DomainDetailPage() {
  const params = useParams<{ domainId: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const domainId = params.domainId;
  const [domain, setDomain] = useState<Domain | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      setLoading(true);
      setError(null);
      try {
        const [loadedDomain, loadedFindings] = await Promise.all([
          getDomain(domainId),
          listFindings({ domainId }),
        ]);
        if (active) {
          setDomain(loadedDomain);
          setFindings(loadedFindings);
        }
      } catch (loadError) {
        if (active) {
          let message = "ドメイン情報の取得に失敗しました。";
          if (loadError instanceof Error) {
            message = loadError.message;
          }
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      active = false;
    };
  }, [domainId]);

  const handleDelete = async () => {
    if (!domain) {
      return;
    }
    const confirmed = window.confirm(
      "このドメインを削除してもよろしいですか？関連する指摘事項は削除されませんが、非表示になります。",
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await softDeleteDomain(domain.id);
      void notifyDiscord(`ドメインを削除しました: ${domain.name}`);
      router.push("/domains");
    } catch (deleteError) {
      let message = "ドメインの削除に失敗しました。";
      if (deleteError instanceof Error) {
        message = deleteError.message;
      }
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!domain) {
    return (
      <main className="p-8">
        <ErrorMessage message={error} />
        <div className="text-medium-text">ドメインが見つかりません。</div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="mb-4">
        <Link href="/domains">
          <Button variant="secondary" outline size="small">
            ドメイン一覧に戻る
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-light-text">ドメイン詳細</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/domains/${domain.id}/add-finding`}>
            <Button variant="primary">指摘事項追加</Button>
          </Link>
          {isAdmin && (
            <>
              <Link href={`/domains/${domain.id}/edit`}>
                <Button variant="secondary" outline>
                  編集
                </Button>
              </Link>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                削除
              </Button>
            </>
          )}
        </div>
      </div>

      <ErrorMessage message={error} />

      <section className="mb-8 rounded-lg border border-dark-border bg-dark-card p-6 shadow-md">
        <h2 className="mb-4 text-2xl font-bold text-light-text">{domain.name}</h2>
        <dl className="grid gap-4 text-sm md:grid-cols-[10rem_1fr]">
          <dt className="font-semibold text-light-text">説明</dt>
          <dd className="whitespace-pre-wrap text-medium-text">{domain.description}</dd>
          <dt className="font-semibold text-light-text">URL</dt>
          <dd>
            <a
              href={domain.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link-DEFAULT hover:text-link-hover hover:underline"
            >
              {domain.url}
            </a>
          </dd>
          <dt className="font-semibold text-light-text">診断期間</dt>
          <dd className="text-medium-text">
            {formatDate(domain.startDate)} 〜 {formatDate(domain.endDate)}
          </dd>
          <dt className="font-semibold text-light-text">検査実施項目</dt>
          <dd>
            <ul className="list-disc space-y-1 pl-5 text-medium-text">
              {domain.surveyItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </dd>
        </dl>
      </section>

      <h2 className="mb-4 text-2xl font-bold text-light-text">関連する指摘事項</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>タイトル</TableHeaderCell>
            <TableHeaderCell>URL</TableHeaderCell>
            <TableHeaderCell className="text-center">危険度</TableHeaderCell>
            <TableHeaderCell className="text-center">被害度</TableHeaderCell>
            <TableHeaderCell className="text-center">実現度</TableHeaderCell>
            <TableHeaderCell className="text-center">担当者</TableHeaderCell>
            <TableHeaderCell className="text-center">レビュア</TableHeaderCell>
            <TableHeaderCell className="text-center">進捗</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {findings.map((finding) => (
            <TableRow key={finding.id}>
              <TableCell>
                <Link
                  href={`/findings/${finding.id}`}
                  className="text-link-DEFAULT hover:text-link-hover hover:underline"
                >
                  {finding.notFound && "[未検出] "}
                  {finding.title}
                </Link>
              </TableCell>
              <TableCell className="text-medium-text">{formatLocations(finding)}</TableCell>
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
