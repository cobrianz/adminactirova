"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage platform settings." />
      <CollectionTabs tabs={[{ key: "settings", label: "Settings" }]} />
    </div>
  );
}
