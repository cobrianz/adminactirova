"use client";

import React from "react";
import { Menu } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { ThemeToggle } from "@/components/ThemeProvider";

export default function Navbar({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const { admin } = useAuth();

  const initials = admin
    ? `${(admin.firstName || "A").charAt(0)}${(admin.lastName || "").charAt(0)}`
    : "A";
  const name = admin ? `${admin.firstName} ${admin.lastName}`.trim() : "Admin";

  return (
    <header
      className="flex h-16 shrink-0 items-center px-4 sm:px-6 lg:px-8 xl:px-12"
      style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)" }}
    >
      <button
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
        className="tb-btn lg:hidden"
      >
        <Menu />
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <span className="hidden h-px w-6 bg-border sm:block" />
        <span className="sb-avatar" title={name} style={{ width: 26, height: 26, fontSize: 10 }}>
          {initials}
        </span>
      </div>
    </header>
  );
}
