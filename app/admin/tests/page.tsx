"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function TestsPage() {
  return (
    <div>
      <PageHeader title="Tests" subtitle="Manage the test question bank." />
      <CollectionTabs tabs={[{ key: "tests", label: "Tests" }]} />
    </div>
  );
}
