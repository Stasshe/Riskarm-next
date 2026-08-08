"use client";

import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/lib/auth";

export default function AdminUserCreatePage() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return (
      <main className="p-8">
        <h1 className="mb-4 text-3xl font-bold text-light-text">ユーザー作成</h1>
        <p className="rounded-md border border-danger-DEFAULT bg-dark-card p-4 text-danger-DEFAULT">
          このページを表示する権限がありません。管理者のみ利用できます。
        </p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-light-text">ユーザー作成</h1>
      <div className="rounded-md border border-dark-border bg-dark-card p-6 text-light-text">
        <p>
          ユーザーはGoogleログインで自動登録されます。手動作成はありません。firestore.rulesの許可メールアドレス一覧にメールアドレスを追加してください。
        </p>
      </div>
    </main>
  );
}
