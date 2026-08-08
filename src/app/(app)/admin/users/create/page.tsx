"use client";

export default function AdminUserCreatePage() {
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
