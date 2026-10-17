"use client";

import { PageHeader, Badge } from "@/components/ui";
import CuratedTable from "@/components/CuratedTable";
import { timeAgo } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader title="Notifications" subtitle="In-app notifications sent to users" />
      <CuratedTable
        collection="notifications"
        searchFields={["title", "message"]}
        searchPlaceholder="Search notifications…"
        emptyTitle="No notifications found"
        titleField="title"
        toggleAction={{ field: "read", onLabel: "Marked as read", offLabel: "Marked as unread" }}
        columns={[
          {
            key: "title",
            label: "Notification",
            render: (r: Row) => (
              <div>
                <p className="font-medium text-ink">{String(r.title ?? "Notification")}</p>
                <p className="td-sub truncate max-w-xs">{String(r.message ?? "")}</p>
              </div>
            ),
          },
          { key: "type", label: "Type", render: (r: Row) => (r.type ? <Badge color="slate">{String(r.type)}</Badge> : "—") },
          { key: "userId", label: "User", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
          { key: "read", label: "Read", render: (r: Row) => <Badge color={r.read ? "green" : "amber"}>{r.read ? "Read" : "Unread"}</Badge> },
          { key: "createdAt", label: "Sent", mono: true, render: (r: Row) => timeAgo(r.createdAt) },
        ]}
        formFields={[
          { key: "title", label: "Title" },
          { key: "message", label: "Message", type: "textarea" },
          { key: "type", label: "Type" },
          { key: "userId", label: "User ID" },
          { key: "read", label: "Read", type: "boolean" },
        ]}
      />
    </div>
  );
}
