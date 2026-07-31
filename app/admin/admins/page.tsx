"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function AdminsPage() {
  return (
    <div>
      <PageHeader title="Admins" subtitle="Manage admin accounts." />
      <CollectionTabs tabs={[{ key: "admins", label: "Admins" }]} />
    </div>
  );
}
