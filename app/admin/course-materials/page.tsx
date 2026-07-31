"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function CourseMaterialsPage() {
  return (
    <div>
      <PageHeader title="Course Materials" subtitle="Manage course learning materials." />
      <CollectionTabs tabs={[{ key: "coursematerials", label: "Course Materials" }]} />
    </div>
  );
}
