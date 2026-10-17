"use client";

import { PageHeader, Badge } from "@/components/ui";
import CuratedTable from "@/components/CuratedTable";
import { formatDate } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

export default function SharedPlansPage() {
  return (
    <div>
      <PageHeader title="Shared Plans" subtitle="Study plans users share with public links" />
      <CuratedTable
        collection="shared_plans"
        searchFields={["title", "sharedByName", "topic"]}
        searchPlaceholder="Search shared plans…"
        emptyTitle="No shared plans found"
        titleField="title"
        columns={[
          {
            key: "title",
            label: "Plan",
            render: (r: Row) => <span className="font-medium text-ink">{String(r.title ?? "Untitled plan")}</span>,
          },
          { key: "sharedByName", label: "Shared by", render: (r: Row) => String(r.sharedByName ?? "—") },
          {
            key: "difficulty",
            label: "Difficulty",
            render: (r: Row) => (r.difficulty ? <Badge color="slate">{String(r.difficulty)}</Badge> : "—"),
          },
          { key: "durationWeeks", label: "Weeks", mono: true, render: (r: Row) => String(r.durationWeeks ?? "—") },
          {
            key: "progress",
            label: "Progress",
            mono: true,
            render: (r: Row) => `${Math.round(Number(r.progress) || 0)}%`,
          },
          { key: "createdAt", label: "Shared", mono: true, render: (r: Row) => formatDate(r.createdAt) },
        ]}
      />
    </div>
  );
}
