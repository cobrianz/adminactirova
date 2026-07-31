"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function AssignmentsPage() {
  return (
    <div>
      <PageHeader title="Assignments" subtitle="Manage student assignments." />
      <CollectionTabs tabs={[{ key: "assignments", label: "Assignments" }]} />
    </div>
  );
}
