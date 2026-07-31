"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function CertificatesPage() {
  return (
    <div>
      <PageHeader title="Certificates" subtitle="Manage issued certificates." />
      <CollectionTabs tabs={[{ key: "certificates", label: "Certificates" }]} />
    </div>
  );
}
