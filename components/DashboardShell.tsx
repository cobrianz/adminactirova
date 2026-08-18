"use client";

import React, { useState } from "react";
import RequireAdmin from "@/components/RequireAdmin";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RequireAdmin>
      <div className="flex h-screen overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto relative">
            <div className="absolute inset-0 -z-10 pointer-events-none bg-[radial-gradient(circle,_rgba(15,23,42,0.12)_1px,_transparent_1px)] dark:bg-[radial-gradient(circle,_rgba(255,255,255,0.06)_1px,_transparent_1px)] bg-[size:20px_20px]" />
            <div className="w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-12">{children}</div>
          </main>
        </div>
      </div>
    </RequireAdmin>
  );
}
