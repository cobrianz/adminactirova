"use client";

import { PageHeader } from "@/components/ui";
import CuratedTable from "@/components/CuratedTable";
import { formatDate } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

export default function CertificatesPage() {
  return (
    <div>
      <PageHeader title="Certificates" subtitle="Certificates issued to students on course completion" />
      <CuratedTable
        collection="certificates"
        searchFields={["title"]}
        searchPlaceholder="Search certificates…"
        emptyTitle="No certificates issued yet"
        columns={[
          { key: "title", label: "Certificate", render: (r: Row) => <span className="font-medium text-ink">{String(r.title ?? "Certificate")}</span> },
          { key: "userId", label: "Recipient", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
          { key: "createdAt", label: "Issued", mono: true, render: (r: Row) => formatDate(r.createdAt) },
        ]}
        formFields={[{ key: "title", label: "Title" }]}
      />
    </div>
  );
}
