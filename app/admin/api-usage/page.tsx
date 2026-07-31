"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function ApiUsagePage() {
  return (
    <div>
      <PageHeader title="API Usage" subtitle="View API usage records." />
      <CollectionTabs tabs={[{ key: "api_usage", label: "API Usage", readOnly: true }]} />
    </div>
  );
}
