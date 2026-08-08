"use client";

import { type FormEvent, useEffect, useState } from "react";

import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import Input from "@/components/Input";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/firestore/settings";

interface SettingsFormState {
  reportTitle: string;
  notFoundPrefix: string;
}

export default function AdminSettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [form, setForm] = useState<SettingsFormState>({ reportTitle: "", notFoundPrefix: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getSettings()
      .then((settings) => {
        if (!active) return;
        setForm({
          reportTitle: settings.reportTitle,
          notFoundPrefix: settings.notFoundPrefix,
        });
      })
      .catch((err) => {
        console.error("failed to load settings", err);
        if (active) setError("設定情報の取得に失敗しました。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, isAdmin]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateSettings(form);
      setSuccessMessage("設定を保存しました。");
    } catch (err) {
      console.error("failed to save settings", err);
      setError("設定の保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return (
      <main className="p-8">
        <h1 className="mb-4 text-3xl font-bold text-light-text">システム設定</h1>
        <p className="rounded-md border border-danger-DEFAULT bg-dark-card p-4 text-danger-DEFAULT">
          このページを表示する権限がありません。管理者のみ利用できます。
        </p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-light-text">システム設定</h1>
      <ErrorMessage message={error} />
      <form
        className="rounded-lg border border-dark-border bg-dark-card p-6 shadow-md"
        onSubmit={handleSubmit}
      >
        <Input
          label="共有されるレポートタイトル"
          type="text"
          value={form.reportTitle}
          onChange={(event) => setForm((current) => ({ ...current, reportTitle: event.target.value }))}
          required
        />
        <p className="mb-4 mt-1 text-sm text-medium-text">
          例: 脆弱性診断結果_{"{{domain.name}}"}
        </p>
        <Input
          label="未検出の脆弱性のタイトルにつける文字"
          type="text"
          value={form.notFoundPrefix}
          onChange={(event) =>
            setForm((current) => ({ ...current, notFoundPrefix: event.target.value }))
          }
          required
        />
        <Input
          label="Discord Webhook URLはVercel環境変数(DISCORD_WEBHOOK_URL)で設定します。ここでは変更できません。"
          type="text"
          value="Vercel環境変数で設定"
          disabled
          readOnly
        />
        <Button type="submit" variant="primary" disabled={saving}>
          設定を保存
        </Button>
      </form>
      {successMessage && <p className="mt-4 text-center text-success-DEFAULT">{successMessage}</p>}
    </main>
  );
}
