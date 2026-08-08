"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import ErrorMessage from "@/components/ErrorMessage";
import TemplateForm from "@/components/TemplateForm";
import { notifyDiscord } from "@/lib/discordNotify";
import { createTemplate } from "@/lib/firestore/templates";
import type { FindingTemplateInput } from "@/types";

export default function TemplateAddPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: FindingTemplateInput) => {
    setError(null);
    try {
      const templateId = await createTemplate(input);
      void notifyDiscord(`テンプレートを追加しました: ${input.title}`);
      router.push(`/templates/${templateId}`);
    } catch (submitError) {
      let message = "テンプレートの追加に失敗しました。";
      if (submitError instanceof Error) {
        message = submitError.message;
      }
      setError(message);
      throw submitError;
    }
  };

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-light-text">Findingテンプレート追加</h1>
      <ErrorMessage message={error} />
      <TemplateForm onSubmit={handleSubmit} submitLabel="追加" />
    </main>
  );
}
