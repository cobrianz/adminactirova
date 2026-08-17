"use client";

import { useState } from "react";
import { PageHeader, Badge } from "@/components/ui";
import CuratedTable, { type Column } from "@/components/CuratedTable";
import { formatDate } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

const TABS = [
  { key: "premium_courses", label: "Premium Courses" },
  { key: "premium_trending_courses", label: "Trending" },
  { key: "premium_generation_intents", label: "Generation Intents" },
] as const;

const COLUMNS: Record<(typeof TABS)[number]["key"], Column[]> = {
  premium_courses: [
    { key: "title", label: "Course", render: (r: Row) => <span className="font-medium text-ink">{String(r.title ?? "Untitled")}</span> },
    { key: "category", label: "Category" },
    { key: "price", label: "Price", mono: true, render: (r: Row) => (r.price !== undefined ? `$${r.price}` : "—") },
    { key: "createdAt", label: "Added", mono: true, render: (r: Row) => formatDate(r.createdAt) },
  ],
  premium_trending_courses: [
    { key: "title", label: "Course", render: (r: Row) => <span className="font-medium text-ink">{String(r.title ?? "Untitled")}</span> },
    { key: "createdAt", label: "Added", mono: true, render: (r: Row) => formatDate(r.createdAt) },
  ],
  premium_generation_intents: [
    { key: "topic", label: "Topic", render: (r: Row) => <span className="font-medium text-ink">{String(r.topic ?? "—")}</span> },
    { key: "difficulty", label: "Difficulty" },
    { key: "status", label: "Status", render: (r: Row) => <Badge color={r.status === "paid" ? "green" : "amber"}>{String(r.status ?? "pending")}</Badge> },
    { key: "userId", label: "User", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
    { key: "createdAt", label: "Requested", mono: true, render: (r: Row) => formatDate(r.createdAt) },
  ],
};

export default function PremiumPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("premium_courses");

  return (
    <div>
      <PageHeader title="Premium" subtitle="Marketplace courses, trending premium content, and paid generation requests" />

      <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-xl p-1" style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors"
            style={tab === t.key ? { background: "var(--acid)", color: "var(--bg)" } : { color: "var(--ink2)" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <CuratedTable key={tab} collection={tab} searchFields={["title", "topic"]} searchPlaceholder="Search…" emptyTitle="No records found" columns={COLUMNS[tab]} />
    </div>
  );
}
