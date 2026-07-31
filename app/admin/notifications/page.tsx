"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Manage in-app and push notifications." />
      <CollectionTabs tabs={[{ key: "notifications", label: "Notifications" }]} />
    </div>
  );
}
