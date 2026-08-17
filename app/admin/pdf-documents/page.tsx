"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import CuratedTable from "@/components/CuratedTable";
import { formatDate, timeAgo } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

const TABS = [
  { key: "pdfdocuments", label: "Documents" },
  { key: "pdfchats", label: "PDF Chats" },
] as const;

export default function PdfDocumentsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pdfdocuments");

  return (
    <div>
      <PageHeader title="PDF Documents" subtitle="Uploaded PDFs and their chat-with-PDF sessions" />

      <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-xl p-1" style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors"
            style={tab === t.key ? { background: "var(--acid)", color: "var(--bg)" } : { color: "var(--ink2)" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pdfdocuments" ? (
        <CuratedTable
          collection="pdfdocuments"
          searchFields={["fileName"]}
          searchPlaceholder="Search file name…"
          emptyTitle="No PDF documents found"
          columns={[
            { key: "fileName", label: "File", render: (r: Row) => <span className="font-medium text-ink">{String(r.fileName ?? "Untitled")}</span> },
            { key: "fileSizeMB", label: "Size", mono: true, render: (r: Row) => (r.fileSizeMB ? `${r.fileSizeMB} MB` : "—") },
            { key: "pages", label: "Pages", mono: true, render: (r: Row) => (Array.isArray(r.pages) ? r.pages.length : "—") },
            { key: "userId", label: "User", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
            { key: "createdAt", label: "Uploaded", mono: true, render: (r: Row) => formatDate(r.createdAt) },
          ]}
        />
      ) : (
        <CuratedTable
          collection="pdfchats"
          emptyTitle="No PDF chat sessions found"
          columns={[
            { key: "userId", label: "User", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
            { key: "createdAt", label: "Started", mono: true, render: (r: Row) => timeAgo(r.createdAt) },
          ]}
        />
      )}
    </div>
  );
}
