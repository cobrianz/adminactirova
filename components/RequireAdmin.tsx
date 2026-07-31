"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { Spinner } from "@/components/ui";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) {
      const t = setTimeout(() => router.replace("/login"), 3000);
      return () => clearTimeout(t);
    }
  }, [loading, admin, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-ink2">Not signed in.</p>
        <p className="text-xs text-ink3">Redirecting to login…</p>
      </div>
    );
  }

  return <>{children}</>;
}
