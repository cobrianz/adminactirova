"use client";

import { PageHeader } from "@/components/ui";
import CuratedTable from "@/components/CuratedTable";
import { formatDateTime } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

export default function ApiUsagePage() {
  return (
    <div>
      <PageHeader title="API Usage" subtitle="Read-only log of tracked API/feature usage" />
      <CuratedTable
        collection="api_usage"
        readOnly
        searchFields={["feature", "userId"]}
        searchPlaceholder="Search by feature or user…"
        emptyTitle="No usage records found"
        emptySubtitle="This collection is populated as users interact with metered features."
        columns={[
          { key: "feature", label: "Feature" },
          { key: "userId", label: "User", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
          { key: "count", label: "Count", mono: true },
          { key: "createdAt", label: "Recorded", mono: true, render: (r: Row) => formatDateTime(r.createdAt) },
        ]}
      />
    </div>
  );
}
