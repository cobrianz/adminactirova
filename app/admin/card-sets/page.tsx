"use client";

import { PageHeader, Badge } from "@/components/ui";
import CuratedTable from "@/components/CuratedTable";
import { formatDate } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

export default function CardSetsPage() {
  return (
    <div>
      <PageHeader title="Card Sets" subtitle="Flashcard sets generated or created across the platform" />
      <CuratedTable
        collection="cardSets"
        searchFields={["title", "topic"]}
        searchPlaceholder="Search card sets…"
        emptyTitle="No card sets found"
        columns={[
          { key: "title", label: "Title", render: (r: Row) => <span className="font-medium text-ink">{String(r.title ?? "Untitled set")}</span> },
          { key: "topic", label: "Topic" },
          { key: "difficulty", label: "Difficulty", render: (r: Row) => (r.difficulty ? <Badge color="slate">{String(r.difficulty)}</Badge> : "—") },
          { key: "totalCards", label: "Cards", mono: true },
          {
            key: "progress",
            label: "Progress",
            mono: true,
            render: (r: Row) => (r.completed ? <Badge color="green">Completed</Badge> : `${Math.round(Number(r.progress) || 0)}%`),
          },
          { key: "createdAt", label: "Created", mono: true, render: (r: Row) => formatDate(r.createdAt) },
        ]}
        formFields={[
          { key: "title", label: "Title" },
          { key: "topic", label: "Topic" },
          { key: "difficulty", label: "Difficulty", type: "select", options: ["beginner", "intermediate", "advanced"] },
          { key: "totalCards", label: "Total cards", type: "number" },
          { key: "completed", label: "Completed", type: "boolean" },
        ]}
      />
    </div>
  );
}
