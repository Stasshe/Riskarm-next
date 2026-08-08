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
import { listDomains } from "@/lib/firestore/domains";
import type { Domain } from "@/types";

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDomains() {
      setLoading(true);
      setError(null);
      try {
        const loadedDomains = await listDomains();
        if (active) {
          setDomains(loadedDomains);
        }
      } catch (loadError) {
        if (active) {
          let message = "ドメイン一覧の取得に失敗しました。";
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

    void loadDomains();

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
        <h1 className="text-3xl font-bold text-light-text">ドメイン一覧</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/domains/add">
            <Button variant="primary">追加</Button>
          </Link>
          <Link href="/domains/bulk-add">
            <Button variant="secondary" outline>
              CSV一括登録
            </Button>
          </Link>
        </div>
      </div>

      <ErrorMessage message={error} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>ドメイン名</TableHeaderCell>
            <TableHeaderCell>説明</TableHeaderCell>
            <TableHeaderCell>URL</TableHeaderCell>
            <TableHeaderCell className="text-center">Finding数</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {domains.map((domain) => (
            <TableRow key={domain.id}>
              <TableCell>
                <Link
                  href={`/domains/${domain.id}`}
                  className="text-link-DEFAULT hover:text-link-hover hover:underline"
                >
                  {domain.name}
                </Link>
              </TableCell>
              <TableCell className="max-w-md whitespace-pre-wrap text-medium-text">
                {domain.description}
              </TableCell>
              <TableCell>
                <a
                  href={domain.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link-DEFAULT hover:text-link-hover hover:underline"
                >
                  {domain.url}
                </a>
              </TableCell>
              <TableCell className="text-center">{domain.findingsCount}</TableCell>
            </TableRow>
          ))}
          {domains.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-medium-text">
                ドメインが見つかりませんでした。
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}
