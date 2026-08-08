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
import { getDomain } from "@/lib/firestore/domains";
import { createFinding } from "@/lib/firestore/findings";
import { listTemplates } from "@/lib/firestore/templates";
import type { Domain, FindingContentInput, FindingTemplate } from "@/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "指摘事項の追加に失敗しました。";
}

export default function DomainAddFindingPage() {
  const params = useParams<{ domainId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const domainId = params.domainId;

  const [domain, setDomain] = useState<Domain | null>(null);
  const [templates, setTemplates] = useState<FindingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [loadedDomain, loadedTemplates] = await Promise.all([
          getDomain(domainId),
          listTemplates(),
        ]);
        if (active) {
          setDomain(loadedDomain);
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
  }, [domainId]);

  const handleSubmit = async (input: FindingContentInput) => {
    if (!domain || !user) {
      return;
    }
    setError(null);
    try {
      const findingId = await createFinding({
        domainId: domain.id,
        domainName: domain.name,
        content: input,
        assignedUserId: user.uid,
        assignedUserName: user.displayName ?? user.email ?? "",
      });
      void notifyDiscord(`指摘事項を追加しました: ${input.title} (${domain.name})`);
      router.push(`/findings/${findingId}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      throw submitError;
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
        <Link href={`/domains/${domainId}`}>
          <Button variant="secondary" outline size="small">
            ドメイン詳細に戻る
          </Button>
        </Link>
      </div>
      <h1 className="mb-6 text-3xl font-bold text-light-text">指摘事項追加: {domain.name}</h1>
      <ErrorMessage message={error} />
      <FindingForm onSubmit={handleSubmit} submitLabel="追加" templates={templates} />
    </main>
  );
}
