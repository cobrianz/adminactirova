"use client";

import React, { useState } from "react";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { useTheme } from "@/components/ThemeProvider";

export default function Navbar({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const { admin, logout } = useAuth();
  const { setMode, mode } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

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
        <div className="theme-seg">
          <button
            className={mode === "light" ? "active" : ""}
            onClick={() => setMode("light")}
            aria-label="Light mode"
          >
            Light
          </button>
          <button
            className={mode === "dark" ? "active" : ""}
            onClick={() => setMode("dark")}
            aria-label="Dark mode"
          >
            Dark
          </button>
          <button
            className={mode === "system" ? "active" : ""}
            onClick={() => setMode("system")}
            aria-label="System mode"
          >
            Auto
          </button>
        </div>

        <span className="hidden h-px w-6 bg-border sm:block" />

        <div className="flex items-center gap-2 rounded-full border border-border bg-bg2 py-1 pl-1 pr-2">
          <span className="sb-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
            {initials}
          </span>
          <span className="hidden max-w-[140px] truncate text-xs font-semibold text-ink md:block">{name}</span>
          <ChevronDown className="h-3 w-3 text-ink3" />
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Log out"
          title="Log out"
          className="tb-btn"
        >
          <LogOut />
        </button>
      </div>
    </header>
  );
}
