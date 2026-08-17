"use client";

import { useState } from "react";
import { PageHeader, Badge } from "@/components/ui";
import CuratedTable from "@/components/CuratedTable";
import { formatDate } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

const TABS = [
  { key: "trending", label: "Trending Careers" },
  { key: "histories", label: "Career Histories" },
] as const;

export default function CareersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("trending");

  return (
    <div>
      <PageHeader title="Careers" subtitle="Trending career recommendations and saved career-tool sessions" />

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

      {tab === "trending" ? (
        <CuratedTable
          collection="trendingcareers"
          emptyTitle="No trending career data found"
          columns={[
            { key: "userId", label: "User", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
            {
              key: "trendingCareers",
              label: "Careers",
              render: (r: Row) => (Array.isArray(r.trendingCareers) ? `${r.trendingCareers.length} careers` : "—"),
            },
            { key: "createdAt", label: "Generated", mono: true, render: (r: Row) => formatDate(r.createdAt) },
          ]}
        />
      ) : (
        <CuratedTable
          collection="careerhistories"
          searchFields={["title", "type"]}
          searchPlaceholder="Search career sessions…"
          emptyTitle="No career history found"
          columns={[
            { key: "title", label: "Title", render: (r: Row) => <span className="font-medium text-ink">{String(r.title ?? "Untitled")}</span> },
            { key: "type", label: "Type", render: (r: Row) => (r.type ? <Badge color="slate">{String(r.type)}</Badge> : "—") },
            { key: "userId", label: "User", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
            { key: "createdAt", label: "Created", mono: true, render: (r: Row) => formatDate(r.createdAt) },
          ]}
        />
      )}
    </div>
  );
}
