"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import TemplateForm from "@/components/TemplateForm";
import { notifyDiscord } from "@/lib/discordNotify";
import { getTemplate, updateTemplate } from "@/lib/firestore/templates";
import type { FindingTemplateInput } from "@/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "テンプレートの保存に失敗しました。";
}

export default function TemplateEditPage() {
  const params = useParams<{ templateId: string }>();
  const router = useRouter();
  const templateId = params.templateId;
  const [initialValue, setInitialValue] = useState<FindingTemplateInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTemplate() {
      setLoading(true);
      setError(null);
      try {
        const template = await getTemplate(templateId);
        if (!active) {
          return;
        }
        if (!template) {
          setInitialValue(null);
          return;
        }
        setInitialValue({
          title: template.title,
          notFound: template.notFound,
          severity: template.severity,
          feasibility: template.feasibility,
          severityReason: template.severityReason,
          feasibilityReason: template.feasibilityReason,
          locations: template.locations,
          description: template.description,
          reproductionSteps: template.reproductionSteps,
          solutions: template.solutions,
          otherRemarks: template.otherRemarks,
          references: template.references,
          images: template.images,
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

    void loadTemplate();

    return () => {
      active = false;
    };
  }, [templateId]);

  const handleSubmit = async (input: FindingTemplateInput) => {
    setError(null);
    try {
      await updateTemplate(templateId, input);
      void notifyDiscord(`テンプレートを更新しました: ${input.title}`);
      router.push(`/templates/${templateId}`);
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
      <h1 className="mb-6 text-3xl font-bold text-light-text">Findingテンプレート編集</h1>
      <ErrorMessage message={error} />
      {initialValue && (
        <TemplateForm initialValue={initialValue} onSubmit={handleSubmit} submitLabel="保存" />
      )}
      {!initialValue && !error && (
        <div className="text-medium-text">テンプレートが見つかりません。</div>
      )}
    </main>
  );
}
