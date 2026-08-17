"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import CuratedTable, { type Column } from "@/components/CuratedTable";
import { formatDate } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

const TABS = [
  { key: "explore_category_courses", label: "Categories" },
  { key: "explore_trending", label: "Trending" },
  { key: "popular_topics", label: "Popular Topics" },
  { key: "personalizeddiscoveries", label: "Discoveries" },
] as const;

const COLUMNS: Record<(typeof TABS)[number]["key"], Column[]> = {
  explore_category_courses: [
    { key: "title", label: "Course", render: (r: Row) => <span className="font-medium text-ink">{String(r.title ?? "—")}</span> },
    { key: "category", label: "Category" },
    { key: "createdAt", label: "Cached", mono: true, render: (r: Row) => formatDate(r.createdAt) },
  ],
  explore_trending: [
    { key: "title", label: "Course", render: (r: Row) => <span className="font-medium text-ink">{String(r.title ?? "—")}</span> },
    { key: "createdAt", label: "Cached", mono: true, render: (r: Row) => formatDate(r.createdAt) },
  ],
  popular_topics: [
    { key: "title", label: "Topic", render: (r: Row) => <span className="font-medium text-ink">{String(r.title ?? "—")}</span> },
    { key: "createdAt", label: "Cached", mono: true, render: (r: Row) => formatDate(r.createdAt) },
  ],
  personalizeddiscoveries: [
    { key: "userId", label: "User", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
    { key: "createdAt", label: "Generated", mono: true, render: (r: Row) => formatDate(r.createdAt) },
  ],
};

export default function ExplorePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("explore_category_courses");

  return (
    <div>
      <PageHeader title="Explore Content" subtitle="Cached discovery feeds shown on the student Explore page" />

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

      <CuratedTable key={tab} collection={tab} searchFields={["title"]} searchPlaceholder="Search…" emptyTitle="No records found" columns={COLUMNS[tab]} />
    </div>
  );
}
