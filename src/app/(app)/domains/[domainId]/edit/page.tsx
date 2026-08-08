"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import DomainForm from "@/components/DomainForm";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { notifyDiscord } from "@/lib/discordNotify";
import { getDomain, updateDomain } from "@/lib/firestore/domains";
import type { DomainInput } from "@/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "ドメインの保存に失敗しました。";
}

export default function DomainEditPage() {
  const params = useParams<{ domainId: string }>();
  const router = useRouter();
  const domainId = params.domainId;
  const [initialValue, setInitialValue] = useState<DomainInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDomain() {
      setLoading(true);
      setError(null);
      try {
        const domain = await getDomain(domainId);
        if (!active) {
          return;
        }
        if (!domain) {
          setInitialValue(null);
          return;
        }
        setInitialValue({
          name: domain.name,
          description: domain.description,
          url: domain.url,
          startDate: domain.startDate,
          endDate: domain.endDate,
          surveyItems: domain.surveyItems,
        });
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

    void loadDomain();

    return () => {
      active = false;
    };
  }, [domainId]);

  const handleSubmit = async (input: DomainInput) => {
    setError(null);
    try {
      await updateDomain(domainId, input);
      void notifyDiscord(`ドメインを更新しました: ${input.name}`);
      router.push(`/domains/${domainId}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      throw submitError;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-light-text">ドメイン編集</h1>
      <ErrorMessage message={error} />
      {initialValue && (
        <DomainForm initialValue={initialValue} onSubmit={handleSubmit} submitLabel="保存" />
      )}
      {!initialValue && !error && (
        <div className="text-medium-text">ドメインが見つかりません。</div>
      )}
    </main>
  );
}
