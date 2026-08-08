"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import Button from "@/components/Button";

export default function DomainAddFindingPage() {
  const params = useParams<{ domainId: string }>();
  const domainId = params.domainId;

  return (
    <main className="p-8">
      <div className="mb-4">
        <Link href={`/domains/${domainId}`}>
          <Button variant="secondary" outline size="small">
            ドメイン詳細に戻る
          </Button>
        </Link>
      </div>
      <h1 className="mb-4 text-3xl font-bold text-light-text">指摘事項追加</h1>
      <p className="text-medium-text">指摘事項フォームは別タスクで実装中です。</p>
    </main>
  );
}
