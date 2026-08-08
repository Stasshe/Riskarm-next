"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Button from "@/components/Button";
import CollapsibleText from "@/components/CollapsibleText";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/lib/auth";
import { notifyDiscord } from "@/lib/discordNotify";
import { deleteTemplate, getTemplate } from "@/lib/firestore/templates";
import type { FindingTemplate } from "@/types";

export default function TemplateDetailPage() {
  const params = useParams<{ templateId: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const templateId = params.templateId;
  const [template, setTemplate] = useState<FindingTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadTemplate() {
      setLoading(true);
      setError(null);
      try {
        const loadedTemplate = await getTemplate(templateId);
        if (active) {
          setTemplate(loadedTemplate);
        }
      } catch (loadError) {
        if (active) {
          let message = "テンプレート情報の取得に失敗しました。";
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

    void loadTemplate();

    return () => {
      active = false;
    };
  }, [templateId]);

  const handleDelete = async () => {
    if (!template) {
      return;
    }
    const confirmed = window.confirm("このテンプレートを削除してもよろしいですか？");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteTemplate(template.id);
      void notifyDiscord(`テンプレートを削除しました: ${template.title}`);
      router.push("/templates");
    } catch (deleteError) {
      let message = "テンプレートの削除に失敗しました。";
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

  if (!template) {
    return (
      <main className="p-8">
        <ErrorMessage message={error} />
        <div className="text-medium-text">テンプレートが見つかりません。</div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <div className="mb-4">
        <Link href="/templates">
          <Button variant="secondary" outline size="small">
            テンプレート一覧に戻る
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-light-text">
          {template.notFound && "[未検出用] "}
          {template.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/templates/${template.id}/edit`}>
            <Button variant="primary">編集</Button>
          </Link>
          {isAdmin && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              削除
            </Button>
          )}
        </div>
      </div>

      <ErrorMessage message={error} />

      <section className="rounded-lg border border-dark-border bg-dark-card p-6 shadow-md">
        <dl className="grid gap-4 text-sm md:grid-cols-[12rem_1fr]">
          <dt className="font-semibold text-light-text">未検出用</dt>
          <dd className="text-medium-text">
            {template.notFound && "はい"}
            {!template.notFound && "いいえ"}
          </dd>
          <dt className="font-semibold text-light-text">危険度</dt>
          <dd className="font-bold text-accent-color">{template.riskLevel}</dd>
          <dt className="font-semibold text-light-text">被害度</dt>
          <dd className="text-medium-text">{template.severity}</dd>
          <dt className="font-semibold text-light-text">実現度</dt>
          <dd className="text-medium-text">{template.feasibility}</dd>
          <dt className="font-semibold text-light-text">被害設定理由</dt>
          <dd className="text-medium-text">
            <CollapsibleText text={template.severityReason} maxLength={240} />
          </dd>
          <dt className="font-semibold text-light-text">実現度設定理由</dt>
          <dd className="text-medium-text">
            <CollapsibleText text={template.feasibilityReason} maxLength={240} />
          </dd>
          <dt className="font-semibold text-light-text">発生個所</dt>
          <dd>
            <ul className="list-disc space-y-1 pl-5 text-medium-text">
              {template.locations.map((location) => (
                <li key={`${location.method}-${location.url}-${location.parameter}`}>
                  {location.method} {location.url} {location.parameter}
                </li>
              ))}
            </ul>
          </dd>
          <dt className="font-semibold text-light-text">説明</dt>
          <dd className="text-medium-text">
            <CollapsibleText text={template.description} maxLength={360} />
          </dd>
          <dt className="font-semibold text-light-text">再現手順</dt>
          <dd>
            <ol className="list-decimal space-y-1 pl-5 text-medium-text">
              {template.reproductionSteps.map((step) => (
                <li className="whitespace-pre-wrap" key={step}>
                  {step}
                </li>
              ))}
            </ol>
          </dd>
          <dt className="font-semibold text-light-text">対策方法</dt>
          <dd className="text-medium-text">
            <CollapsibleText text={template.solutions} maxLength={360} />
          </dd>
          <dt className="font-semibold text-light-text">その他指摘事項</dt>
          <dd className="text-medium-text">
            <CollapsibleText text={template.otherRemarks} maxLength={240} />
          </dd>
          <dt className="font-semibold text-light-text">参考文献</dt>
          <dd>
            <ol className="list-decimal space-y-1 pl-5 text-medium-text">
              {template.references.map((reference) => (
                <li className="whitespace-pre-wrap" key={reference}>
                  {reference}
                </li>
              ))}
            </ol>
          </dd>
        </dl>
      </section>
    </main>
  );
}
