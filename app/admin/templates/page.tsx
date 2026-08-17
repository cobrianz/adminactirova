"use client";

import { PageHeader, Badge } from "@/components/ui";
import CuratedTable from "@/components/CuratedTable";
import type { Row } from "@/components/CuratedTable";
import { useAuth } from "@/components/AuthContext";

export default function TemplatesPage() {
  const { admin } = useAuth();
  const isSuperAdmin = admin?.adminLevel === "superadmin";

  return (
    <div>
      <PageHeader
        title="Email Templates"
        subtitle="Reusable transactional email templates. Site banner/notice templates live under Notices."
      />
      {!isSuperAdmin && (
        <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Only super admins can create, edit, or delete email templates. You can view them below.
        </p>
      )}
      <CuratedTable
        collection="email_templates"
        readOnly={!isSuperAdmin}
        searchFields={["name", "key", "subject"]}
        searchPlaceholder="Search templates…"
        emptyTitle="No email templates found"
        newLabel="New template"
        titleField="name"
        toggleAction={{ field: "active", onLabel: "Activated", offLabel: "Deactivated" }}
        columns={[
          { key: "name", label: "Name", render: (r: Row) => <span className="font-medium text-ink">{String(r.name ?? "Untitled")}</span> },
          { key: "key", label: "Key", mono: true },
          { key: "subject", label: "Subject" },
          { key: "active", label: "Status", render: (r: Row) => <Badge color={r.active === false ? "slate" : "green"}>{r.active === false ? "Inactive" : "Active"}</Badge> },
        ]}
        formFields={[
          { key: "name", label: "Name" },
          { key: "key", label: "Key" },
          { key: "subject", label: "Subject" },
          { key: "body", label: "Body (HTML)", type: "textarea" },
          { key: "active", label: "Active", type: "boolean" },
        ]}
      />
    </div>
  );
}
