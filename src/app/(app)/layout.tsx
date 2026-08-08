"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import LoadingSpinner from "@/components/LoadingSpinner";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    // Render nothing but a spinner while the auth state resolves or the
    // redirect-to-login effect above is about to fire, so protected content
    // never flashes for an unauthenticated visitor.
    return (
      <div className="flex h-screen items-center justify-center bg-dark-bg">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-bg">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
