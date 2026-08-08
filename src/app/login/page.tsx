"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { user, loading, accessDenied, signIn } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/domains");
    }
  }, [loading, user, router]);

  const handleSignIn = async (): Promise<void> => {
    setSignInError(null);
    setIsSigningIn(true);
    try {
      await signIn();
    } catch (err) {
      console.error("Google sign-in failed", err);
      setSignInError("ログインに失敗しました。再度お試しください。");
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-bg">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (user) {
    // Redirect effect above is about to navigate away; render nothing to avoid
    // flashing the login form for an already-authenticated user.
    return null;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-dark-bg">
      <div className="w-full max-w-md rounded-lg border border-dark-border bg-dark-card p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-light-text">open-riskarm</h1>
        <p className="mb-6 text-center text-sm text-medium-text">
          Webアプリケーション脆弱性診断管理ツール
        </p>
        {accessDenied && (
          <div className="mb-4">
            <ErrorMessage message="このアカウントはこのシステムへのアクセスを許可されていません" />
          </div>
        )}
        {signInError && (
          <div className="mb-4">
            <ErrorMessage message={signInError} />
          </div>
        )}
        <Button
          type="button"
          variant="primary"
          className="w-full"
          onClick={() => void handleSignIn()}
          disabled={isSigningIn}
        >
          {isSigningIn ? <LoadingSpinner size="small" /> : "Googleでログイン"}
        </Button>
      </div>
    </div>
  );
}
