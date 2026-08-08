"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import TextArea from "@/components/TextArea";
import { parseCsvToDomainInputs } from "@/lib/csv";
import { notifyDiscord } from "@/lib/discordNotify";
import { bulkAddDomains } from "@/lib/firestore/domains";

export default function DomainBulkAddPage() {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const parsedInputs = parseCsvToDomainInputs(csvText);
      if (parsedInputs.length === 0) {
        throw new Error("登録するCSV行がありません。");
      }
      const count = await bulkAddDomains(csvText);
      setSuccessMessage(`${count}件のドメインを登録しました。`);
      void notifyDiscord(`ドメインを一括登録しました: ${count}件`);
      window.setTimeout(() => router.push("/domains"), 800);
    } catch (submitError) {
      let message = "ドメインの一括登録に失敗しました。";
      if (submitError instanceof Error) {
        message = submitError.message;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-light-text">CSV一括登録</h1>
      <ErrorMessage message={error} />
      {successMessage && (
        <div className="mb-4 rounded-md border border-success-DEFAULT bg-dark-card px-4 py-3 text-success-DEFAULT">
          {successMessage}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-dark-border bg-dark-card p-6 shadow-md"
      >
        <TextArea
          label="CSVデータ"
          id="csvText"
          name="csvText"
          rows={16}
          placeholder={
            'name,description,url,start_date,end_date,survey_items\nexample.com,説明,https://example.com,2026-01-01,2026-01-31,"[""項目1"",""項目2""]"'
          }
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          disabled={submitting}
        />
        <Button type="submit" variant="primary" disabled={submitting}>
          一括登録
        </Button>
      </form>
    </main>
  );
}
