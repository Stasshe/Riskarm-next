"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@/components/Table";
import { listTemplates } from "@/lib/firestore/templates";
import type { FindingTemplate } from "@/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "テンプレート一覧の取得に失敗しました。";
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<FindingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTemplates() {
      setLoading(true);
      setError(null);
      try {
        const loadedTemplates = await listTemplates();
        if (active) {
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

    void loadTemplates();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-light-text">Findingテンプレート一覧</h1>
        <Link href="/templates/add">
          <Button variant="primary">追加</Button>
        </Link>
      </div>

      <ErrorMessage message={error} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>タイトル</TableHeaderCell>
            <TableHeaderCell className="text-center">危険度</TableHeaderCell>
            <TableHeaderCell className="text-center">被害度</TableHeaderCell>
            <TableHeaderCell className="text-center">実現度</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell>
                <Link
                  href={`/templates/${template.id}`}
                  className="text-link-DEFAULT hover:text-link-hover hover:underline"
                >
                  {template.notFound && "[未検出用] "}
                  {template.title}
                </Link>
              </TableCell>
              <TableCell className="text-center">{template.riskLevel}</TableCell>
              <TableCell className="text-center">{template.severity}</TableCell>
              <TableCell className="text-center">{template.feasibility}</TableCell>
            </TableRow>
          ))}
          {templates.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-medium-text">
                テンプレートが見つかりませんでした。
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}
