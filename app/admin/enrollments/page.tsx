"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function EnrollmentsPage() {
  return (
    <div>
      <PageHeader title="Enrollments" subtitle="Manage course enrollments." />
      <CollectionTabs tabs={[{ key: "enrollments", label: "Enrollments" }]} />
    </div>
  );
}
