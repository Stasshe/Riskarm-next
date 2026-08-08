"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import FindingForm from "@/components/FindingForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/lib/auth";
import { notifyDiscord } from "@/lib/discordNotify";
import { getFinding, updateFindingContent } from "@/lib/firestore/findings";
import { listTemplates } from "@/lib/firestore/templates";
import { canEditContent } from "@/lib/permissions";
import type { Finding, FindingContentInput, FindingTemplate } from "@/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "指摘事項の取得に失敗しました。";
}

function toContentInput(finding: Finding): FindingContentInput {
  return {
    title: finding.title,
    notFound: finding.notFound,
    severity: finding.severity,
    feasibility: finding.feasibility,
    severityReason: finding.severityReason,
    feasibilityReason: finding.feasibilityReason,
    locations: finding.locations,
    description: finding.description,
    reproductionSteps: finding.reproductionSteps,
    solutions: finding.solutions,
    otherRemarks: finding.otherRemarks,
    references: finding.references,
    images: finding.images,
  };
}

export default function FindingEditPage() {
  const params = useParams<{ findingId: string }>();
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const findingId = params.findingId;

  const [finding, setFinding] = useState<Finding | null>(null);
  const [templates, setTemplates] = useState<FindingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [loadedFinding, loadedTemplates] = await Promise.all([
          getFinding(findingId),
          listTemplates(),
        ]);
        if (active) {
          setFinding(loadedFinding);
          setTemplates(loadedTemplates);
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

    void load();

    return () => {
      active = false;
    };
  }, [findingId]);

  const handleSubmit = async (input: FindingContentInput) => {
    setError(null);
    try {
      await updateFindingContent(findingId, input);
      void notifyDiscord(`指摘事項を更新しました: ${input.title}`);
      router.push(`/findings/${findingId}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      throw submitError;
    }
  };

  if (loading || authLoading) {
    return <LoadingSpinner />;
  }

  if (!finding) {
    return (
      <main className="p-8">
        <ErrorMessage message={error} />
        <div className="text-medium-text">指摘事項が見つかりません。</div>
      </main>
    );
  }

  const isPermitted = canEditContent(finding, user?.uid ?? "", isAdmin);

  if (!isPermitted) {
    return (
      <main className="p-8">
        <div className="mb-4">
          <Link href={`/findings/${finding.id}`}>
            <Button variant="secondary" outline size="small">
              指摘事項詳細に戻る
            </Button>
          </Link>
        </div>
        <ErrorMessage message="この指摘事項を編集する権限がありません。担当者または管理者のみ編集できます。" />
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="mb-4">
        <Link href={`/findings/${finding.id}`}>
          <Button variant="secondary" outline size="small">
            指摘事項詳細に戻る
          </Button>
        </Link>
      </div>
      <h1 className="mb-6 text-3xl font-bold text-light-text">指摘事項編集: {finding.title}</h1>
      <ErrorMessage message={error} />
      <FindingForm
        initialValue={toContentInput(finding)}
        onSubmit={handleSubmit}
        submitLabel="保存"
        templates={templates}
      />
    </main>
  );
}
