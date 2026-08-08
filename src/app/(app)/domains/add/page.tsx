"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import DomainForm from "@/components/DomainForm";
import ErrorMessage from "@/components/ErrorMessage";
import { notifyDiscord } from "@/lib/discordNotify";
import { createDomain } from "@/lib/firestore/domains";
import type { DomainInput } from "@/types";

export default function DomainAddPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: DomainInput) => {
    setError(null);
    try {
      const domainId = await createDomain(input);
      void notifyDiscord(`ドメインを追加しました: ${input.name}`);
      router.push(`/domains/${domainId}`);
    } catch (submitError) {
      let message = "ドメインの追加に失敗しました。";
      if (submitError instanceof Error) {
        message = submitError.message;
      }
      setError(message);
      throw submitError;
    }
  };

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-light-text">ドメイン追加</h1>
      <ErrorMessage message={error} />
      <DomainForm onSubmit={handleSubmit} submitLabel="追加" />
    </main>
  );
}
