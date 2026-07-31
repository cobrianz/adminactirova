"use client";

import { PageHeader } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";

export default function PdfDocumentsPage() {
  return (
    <div>
      <PageHeader title="PDF Documents" subtitle="Manage uploaded PDFs and PDF chat sessions." />
      <CollectionTabs
        tabs={[
          { key: "pdfdocuments", label: "Documents" },
          { key: "pdfchats", label: "PDF Chats" },
        ]}
      />
    </div>
  );
}
