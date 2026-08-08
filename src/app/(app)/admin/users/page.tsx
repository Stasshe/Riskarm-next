"use client";

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
import { useAuth } from "@/lib/auth";
import { listUserProfiles, updateUserProfile } from "@/lib/firestore/users";
import type { UserProfile } from "@/types";

export default function AdminUsersPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    listUserProfiles()
      .then((profiles) => {
        if (active) setUsers(profiles);
      })
      .catch((err) => {
        console.error("failed to load users", err);
        if (active) setError("ユーザー一覧の取得に失敗しました。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, isAdmin]);

  const handleToggleAdmin = async (target: UserProfile) => {
    setSavingUid(target.uid);
    setError(null);

    try {
      await updateUserProfile(target.uid, { isAdmin: !target.isAdmin });
      setUsers((current) =>
        current.map((user) => {
          if (user.uid !== target.uid) return user;
          return { ...user, isAdmin: !target.isAdmin };
        }),
      );
    } catch (err) {
      console.error("failed to update user admin flag", err);
      setError("管理者権限の更新に失敗しました。");
    } finally {
      setSavingUid(null);
    }
  };

  const adminLabel = (target: UserProfile) => {
    if (target.isAdmin) return "はい";
    return "いいえ";
  };

  const adminButtonVariant = (target: UserProfile) => {
    if (target.isAdmin) return "danger";
    return "success";
  };

  const adminButtonLabel = (target: UserProfile) => {
    if (target.isAdmin) return "管理者を解除";
    return "管理者にする";
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return (
      <main className="p-8">
        <h1 className="mb-4 text-3xl font-bold text-light-text">ユーザー管理</h1>
        <p className="rounded-md border border-danger-DEFAULT bg-dark-card p-4 text-danger-DEFAULT">
          このページを表示する権限がありません。管理者のみ利用できます。
        </p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold text-light-text">ユーザー管理</h1>
      <ErrorMessage message={error} />
      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>メールアドレス</TableHeaderCell>
            <TableHeaderCell>表示名</TableHeaderCell>
            <TableHeaderCell className="text-center">管理者</TableHeaderCell>
            <TableHeaderCell className="text-center">操作</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length > 0 &&
            users.map((target) => (
              <TableRow key={target.uid}>
                <TableCell>{target.email}</TableCell>
                <TableCell>{target.displayName}</TableCell>
                <TableCell className="text-center">{adminLabel(target)}</TableCell>
                <TableCell className="text-center">
                  <Button
                    type="button"
                    variant={adminButtonVariant(target)}
                    size="small"
                    disabled={savingUid === target.uid}
                    onClick={() => handleToggleAdmin(target)}
                  >
                    {adminButtonLabel(target)}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-medium-text">
                ユーザーが見つかりませんでした。
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </main>
  );
}
