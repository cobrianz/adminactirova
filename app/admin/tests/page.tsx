"use client";

import { PageHeader, Badge } from "@/components/ui";
import CuratedTable from "@/components/CuratedTable";
import { formatDate } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

type Performance = { percentage?: number };

export default function TestsPage() {
  return (
    <div>
      <PageHeader title="Tests" subtitle="Quiz and exam question bank, with attempt history" />
      <CuratedTable
        collection="tests"
        searchFields={["title", "course"]}
        searchPlaceholder="Search tests…"
        emptyTitle="No tests found"
        columns={[
          { key: "title", label: "Title", render: (r: Row) => <span className="font-medium text-ink">{String(r.title ?? "Untitled test")}</span> },
          { key: "course", label: "Course" },
          { key: "difficulty", label: "Difficulty", render: (r: Row) => (r.difficulty ? <Badge color="slate">{String(r.difficulty)}</Badge> : "—") },
          {
            key: "performances",
            label: "Attempts",
            mono: true,
            render: (r: Row) => (Array.isArray(r.performances) ? r.performances.length : 0),
          },
          {
            key: "bestScore",
            label: "Best score",
            mono: true,
            render: (r: Row) => {
              const perfs = Array.isArray(r.performances) ? (r.performances as Performance[]) : [];
              const best = Math.max(0, ...perfs.map((p) => Number(p.percentage) || 0));
              return perfs.length ? `${Math.round(best)}%` : "—";
            },
          },
          { key: "createdAt", label: "Created", mono: true, render: (r: Row) => formatDate(r.createdAt) },
        ]}
        formFields={[
          { key: "title", label: "Title" },
          { key: "course", label: "Course" },
          { key: "difficulty", label: "Difficulty", type: "select", options: ["beginner", "intermediate", "advanced"] },
        ]}
      />
    </div>
  );
}
