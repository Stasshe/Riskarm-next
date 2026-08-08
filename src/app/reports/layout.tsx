"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/lib/auth";

import "../print.css";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return <>{children}</>;
}
