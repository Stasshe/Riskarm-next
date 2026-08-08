"use client";

import { type DocumentSnapshot, doc } from "firebase/firestore";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import Select from "@/components/Select";
import { useDocument } from "@/hooks/useDocument";
import { useAuth } from "@/lib/auth";
import { notifyDiscord } from "@/lib/discordNotify";
import { getFirebaseDb } from "@/lib/firebase";
import {
  assignFindingReviewer,
  assignFindingUser,
  restoreFinding,
  softDeleteFinding,
  transitionFindingStatus,
} from "@/lib/firestore/findings";
import { listUserProfiles } from "@/lib/firestore/users";
import { renderMarkdown } from "@/lib/markdown";
import {
  canAdvanceStatus,
  canDelete,
  canEditContent,
  canReassignUser,
  canRestore,
  canSetReviewer,
  nextFindingStatus,
} from "@/lib/permissions";
import type { Finding, FindingStatus, UserProfile } from "@/types";

const FINDINGS_COLLECTION = "findings";

const STATUS_LABELS: Record<FindingStatus, string> = {
  NOT_STARTED: "未着手",
  WIP: "作業中",
  COMPLETED: "完了",
  REVIEWED: "レビュー済み",
};

const MARKDOWN_CONTENT_CLASSNAME =
  "text-medium-text [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-light-text [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-light-text [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:font-bold [&_h3]:text-light-text [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-link-DEFAULT [&_a]:underline [&_code]:rounded [&_code]:bg-dark-bg [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm [&_pre]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-dark-bg [&_pre]:p-3 [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md [&_strong]:text-light-text";

function mapFindingDoc(snap: DocumentSnapshot): Finding | null {
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...(snap.data() as Omit<Finding, "id">) };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "操作に失敗しました。";
}

function MarkdownField({ text, images }: { text: string; images: Finding["images"] }) {
  if (!text.trim()) {
    return <p className="text-medium-text">-</p>;
  }
  return (
    <div
      className={MARKDOWN_CONTENT_CLASSNAME}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML comes from our own marked pipeline (src/lib/markdown.ts), not raw user input
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text, images) }}
    />
  );
}

export default function FindingDetailPage() {
  const params = useParams<{ findingId: string }>();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const findingId = params.findingId;

  const findingDocRef = useMemo(
    () => doc(getFirebaseDb(), FINDINGS_COLLECTION, findingId),
    [findingId],
  );
  const { data: finding, loading, error: docError } = useDocument(findingDocRef, mapFindingDoc);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    listUserProfiles()
      .then((loaded) => {
        if (active) setUsers(loaded);
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      });
    return () => {
      active = false;
    };
  }, []);

  const uid = user?.uid ?? "";

  const handleTransition = async (action: "next" | "prev") => {
    if (!finding) return;
    const target = nextFindingStatus(finding.status, action);
    if (!target) return;
    setPending(true);
    setError(null);
    try {
      await transitionFindingStatus(finding, action);
      void notifyDiscord(
        `指摘事項のステータスを更新しました: ${finding.title} (${STATUS_LABELS[finding.status]} → ${STATUS_LABELS[target]})`,
      );
    } catch (transitionError) {
      setError(getErrorMessage(transitionError));
    } finally {
      setPending(false);
    }
  };

  const handleAssignUser = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!finding) return;
    const targetUser = users.find((candidate) => candidate.uid === event.target.value);
    if (!targetUser) return;
    setPending(true);
    setError(null);
    try {
      await assignFindingUser(finding.id, targetUser.uid, targetUser.displayName);
      void notifyDiscord(`担当者を変更しました: ${finding.title} → ${targetUser.displayName}`);
    } catch (assignError) {
      setError(getErrorMessage(assignError));
    } finally {
      setPending(false);
    }
  };

  const handleAssignReviewer = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (!finding) return;
    const value = event.target.value;
    const targetUser = users.find((candidate) => candidate.uid === value);
    setPending(true);
    setError(null);
    try {
      await assignFindingReviewer(
        finding.id,
        targetUser?.uid ?? null,
        targetUser?.displayName ?? "",
      );
      void notifyDiscord(
        `レビュアーを変更しました: ${finding.title} → ${targetUser?.displayName ?? "未設定"}`,
      );
    } catch (assignError) {
      setError(getErrorMessage(assignError));
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    if (!finding) return;
    const confirmed = window.confirm("この指摘事項を削除してもよろしいですか？");
    if (!confirmed) return;
    setPending(true);
    setError(null);
    try {
      await softDeleteFinding(finding);
      void notifyDiscord(`指摘事項を削除しました: ${finding.title}`);
      router.push(finding.domainId ? `/domains/${finding.domainId}` : "/findings");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setPending(false);
    }
  };

  const handleRestore = async () => {
    if (!finding) return;
    setPending(true);
    setError(null);
    try {
      await restoreFinding(finding);
      void notifyDiscord(`指摘事項を復元しました: ${finding.title}`);
    } catch (restoreError) {
      setError(getErrorMessage(restoreError));
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!finding) {
    return (
      <main className="p-8">
        <ErrorMessage message={error ?? docError?.message ?? null} />
        <div className="text-medium-text">指摘事項が見つかりません。</div>
      </main>
    );
  }

  const canNext = canAdvanceStatus(finding, uid, "next", isAdmin);
  const canPrev = canAdvanceStatus(finding, uid, "prev", isAdmin);
  const canEdit = canEditContent(finding, uid, isAdmin);
  const canManageReviewer = isAdmin || finding.assignedUserId === uid;
  const reviewerOptions = users.filter((candidate) =>
    canSetReviewer(finding, uid, candidate.uid, isAdmin),
  );
  const showDelete = canDelete(isAdmin);
  const showRestore = canRestore(isAdmin);
  const showReassignUser = canReassignUser(isAdmin);

  const backHref = finding.domainId ? `/domains/${finding.domainId}` : "/findings";
  const backLabel = finding.domainId ? "ドメイン詳細に戻る" : "指摘事項一覧に戻る";

  return (
    <main className="p-8">
      <div className="mb-4">
        <Link href={backHref}>
          <Button variant="secondary" outline size="small">
            {backLabel}
          </Button>
        </Link>
      </div>

      <ErrorMessage message={error} />

      {finding.deleted && (
        <div className="mb-4 rounded-md border border-danger-DEFAULT bg-dark-card px-4 py-3 text-danger-DEFAULT">
          この指摘事項は削除されています。
          {showRestore && (
            <Button
              variant="secondary"
              outline
              size="small"
              className="ml-3"
              onClick={handleRestore}
              disabled={pending}
            >
              復元
            </Button>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-light-text">
          進行状況: {STATUS_LABELS[finding.status]}
        </h2>
        {!finding.deleted && (canNext || canPrev) && (
          <div className="flex items-center gap-2">
            {canPrev && (
              <Button
                variant="secondary"
                outline
                size="small"
                onClick={() => handleTransition("prev")}
                disabled={pending}
              >
                ← 差し戻す
              </Button>
            )}
            {canNext && (
              <Button
                variant="primary"
                size="small"
                onClick={() => handleTransition("next")}
                disabled={pending}
              >
                進める →
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span className="text-light-text">担当者: {finding.assignedUserName || "未設定"}</span>
        {!finding.deleted && showReassignUser && (
          <Select
            options={users.map((candidate) => ({
              value: candidate.uid,
              label: candidate.displayName,
            }))}
            value={finding.assignedUserId ?? ""}
            onChange={handleAssignUser}
            className="mb-0 w-56"
            disabled={pending}
          />
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-light-text">レビュアー: {finding.reviewerUserName || "未設定"}</span>
        {!finding.deleted && canManageReviewer && (
          <Select
            options={[
              { value: "", label: "未設定" },
              ...reviewerOptions.map((candidate) => ({
                value: candidate.uid,
                label: candidate.displayName,
              })),
            ]}
            value={finding.reviewerUserId ?? ""}
            onChange={handleAssignReviewer}
            className="mb-0 w-56"
            disabled={pending}
          />
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-light-text">
          {finding.notFound && "[未検出] "}
          {finding.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          {!finding.deleted && canEdit && (
            <Link href={`/findings/${finding.id}/edit`}>
              <Button variant="primary">編集</Button>
            </Link>
          )}
          <Link href={`/reports/finding/${finding.id}`}>
            <Button variant="secondary" outline>
              レポート表示
            </Button>
          </Link>
          {!finding.deleted && showDelete && (
            <Button variant="danger" onClick={handleDelete} disabled={pending}>
              削除
            </Button>
          )}
        </div>
      </div>

      <section className="rounded-lg border border-dark-border bg-dark-card p-6 shadow-md">
        <dl className="mb-6 grid gap-3 text-sm md:grid-cols-3">
          <div>
            <dt className="font-semibold text-light-text">危険度</dt>
            <dd className="text-lg font-bold text-accent-color">{finding.riskLevel}</dd>
          </div>
          <div>
            <dt className="font-semibold text-light-text">被害度</dt>
            <dd className="text-medium-text">{finding.severity}</dd>
          </div>
          <div>
            <dt className="font-semibold text-light-text">実現度</dt>
            <dd className="text-medium-text">{finding.feasibility}</dd>
          </div>
        </dl>

        <h3 className="mb-1 font-semibold text-light-text">被害設定理由</h3>
        <MarkdownField text={finding.severityReason} images={finding.images} />

        <h3 className="mt-4 mb-1 font-semibold text-light-text">実現度設定理由</h3>
        <MarkdownField text={finding.feasibilityReason} images={finding.images} />

        <h3 className="mt-4 mb-1 font-semibold text-light-text">発生個所</h3>
        {finding.locations.length > 0 ? (
          <ul className="mb-2 list-disc pl-6 text-medium-text">
            {finding.locations.map((location) => (
              <li key={`${location.method}-${location.url}-${location.parameter}`}>
                {location.method} {location.url} {location.parameter && `- ${location.parameter}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-2 text-medium-text">-</p>
        )}

        <h3 className="mt-4 mb-1 font-semibold text-light-text">説明</h3>
        <MarkdownField text={finding.description} images={finding.images} />

        <h3 className="mt-4 mb-1 font-semibold text-light-text">再現手順</h3>
        {finding.reproductionSteps.filter((step) => step.trim()).length > 0 ? (
          <ol className="mb-2 list-decimal pl-6">
            {finding.reproductionSteps
              .filter((step) => step.trim())
              .map((step) => (
                <li key={step}>
                  <MarkdownField text={step} images={finding.images} />
                </li>
              ))}
          </ol>
        ) : (
          <p className="mb-2 text-medium-text">-</p>
        )}

        <h3 className="mt-4 mb-1 font-semibold text-light-text">対策方法</h3>
        <MarkdownField text={finding.solutions} images={finding.images} />

        <h3 className="mt-4 mb-1 font-semibold text-light-text">その他指摘事項</h3>
        <MarkdownField text={finding.otherRemarks} images={finding.images} />

        <h3 className="mt-4 mb-1 font-semibold text-light-text">参考文献</h3>
        {finding.references.filter((reference) => reference.trim()).length > 0 ? (
          <ul className="list-disc pl-6 text-medium-text">
            {finding.references
              .filter((reference) => reference.trim())
              .map((reference) => (
                <li key={reference}>{reference}</li>
              ))}
          </ul>
        ) : (
          <p className="text-medium-text">-</p>
        )}
      </section>
    </main>
  );
}
