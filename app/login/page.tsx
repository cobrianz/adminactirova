"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Mail, Lock, LogIn } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { Spinner } from "@/components/ui";

export default function LoginPage() {
  const { admin, loading, refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && admin) router.replace("/admin");
  }, [loading, admin, router]);

  if (loading || admin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.admin) {
        toast.error(data.error || "Login failed");
        return;
      }
      toast.success(`Welcome back, ${data.admin.firstName || "admin"}`);
      await refresh();
      router.replace("/admin");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <Image src="/logo.png" alt="Actirova" width={64} height={64} className="mx-auto mb-4 h-16 w-16 rounded-2xl object-contain" />
          <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-ink">Actirova Admin</h1>
          <p className="mt-2 text-xs text-ink2">Sign in to manage the AI tutor platform</p>
        </div>

        <form onSubmit={handleSubmit} className="panel">
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink3" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@actirova.com"
                    autoComplete="email"
                    className="form-input pl-9"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink3" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="form-input pl-9"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-modal btn-modal-save flex w-full items-center justify-center gap-2 py-2.5"
              >
                {submitting ? <Spinner className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
                Sign in
              </button>
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-ink3">
          Only users with the <span className="font-medium text-ink2">admin</span> role can access this dashboard.
        </p>
      </div>
    </div>
  );
}
