"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  MessageSquare,
  Mail,
  BellRing,
  ClipboardList,
  BarChart3,
  LogOut,
  X,
  School,
  ClipboardCheck,
  FileStack,
  Award,
  StickyNote,
  Bell,
  Compass,
  Crown,
  Layers,
  Rocket,
  Bot,
  Settings,
  ShieldCheck,
  Activity,
  LayoutTemplate,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";

const NAV_GROUPS = [
  {
    label: "General",
    items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Manage",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/courses", label: "Courses", icon: BookOpen },
      { href: "/admin/blog", label: "Blog", icon: FileText },
      { href: "/admin/reports", label: "Reports", icon: ClipboardList },
      { href: "/admin/classrooms", label: "Classrooms", icon: School },
      { href: "/admin/tests", label: "Tests", icon: ClipboardCheck },
      { href: "/admin/pdf-documents", label: "PDF Documents", icon: FileStack },
      { href: "/admin/certificates", label: "Certificates", icon: Award },
      { href: "/admin/notes", label: "Notes", icon: StickyNote },
    ],
  },
  {
    label: "Communicate",
    items: [
      { href: "/admin/contact", label: "Contact", icon: MessageSquare },
      { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
      { href: "/admin/notices", label: "Notices", icon: BellRing },
      { href: "/admin/templates", label: "Templates", icon: LayoutTemplate },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/explore", label: "Explore", icon: Compass },
      { href: "/admin/premium", label: "Premium", icon: Crown },
      { href: "/admin/card-sets", label: "Card Sets", icon: Layers },
      { href: "/admin/careers", label: "Careers", icon: Rocket },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/chats", label: "AI Chats", icon: Bot },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/admins", label: "Admins", icon: ShieldCheck },
      { href: "/admin/api-usage", label: "API Usage", icon: Activity },
    ],
  },
  {
    label: "Insights",
    items: [{ href: "/admin/analytics", label: "Analytics", icon: BarChart3 }],
  },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="scroll-hide flex-1 overflow-y-auto">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="sb-section">{group.label}</p>
          <ul className="sb-nav">
            {group.items.map((item) => {
              const active =
                (item.href === "/admin" && pathname === "/admin") ||
                (item.href !== "/admin" && (pathname === item.href || pathname.startsWith(item.href + "/")));

              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={onNavigate} className={active ? "active" : undefined}>
                    <item.icon className="ico" strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const { admin, logout } = useAuth();
  const initials = admin
    ? `${(admin.firstName || "A").charAt(0)}${(admin.lastName || "").charAt(0)}`
    : "A";
  const name = admin ? `${admin.firstName} ${admin.lastName}`.trim() : "Admin";

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="sb-bottom">
      <div className="sb-user">
        <span className="sb-avatar">{initials}</span>
        <div className="min-w-0 flex-1">
          <p className="sb-uname truncate">{name}</p>
          <p className="sb-urole truncate">{admin?.role || "admin"}</p>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          aria-label="Sign out"
          className="tb-btn"
          style={{ width: 30, height: 30, borderRadius: 8 }}
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const sidebarInner = (
    <div className="flex h-full w-[260px] flex-col" style={{ background: "var(--panel)", borderRight: "1px solid var(--border)" }}>
      <div className="sb-logo">
        <Image src="/logo.png" alt="Actirova" width={30} height={30} className="sb-logo-img" />
        <span className="sb-badge">Admin</span>
      </div>
      <NavList />
      <SidebarFooter />
    </div>
  );

  return (
    <>
      <aside className="hidden shrink-0 lg:block">{sidebarInner}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="absolute inset-y-0 left-0">
            <div className="flex h-full flex-col">{sidebarInner}</div>
            <button
              onClick={onClose}
              aria-label="Close sidebar"
              className="absolute right-[-3rem] top-4 rounded-lg p-2 text-white/80 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
