"use client";

import { useState } from "react";
import { PageHeader, Badge } from "@/components/ui";
import CuratedTable from "@/components/CuratedTable";
import { formatDate, timeAgo } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

const TABS = [
  { key: "user_notes", label: "General Notes" },
  { key: "course_notes", label: "Lesson Notes" },
] as const;

export default function NotesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("user_notes");

  return (
    <div>
      <PageHeader title="Notes" subtitle="Personal notes users take while learning" />

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

      {tab === "user_notes" ? (
        <CuratedTable
          collection="user_notes"
          searchFields={["title", "content"]}
          searchPlaceholder="Search notes…"
          emptyTitle="No notes found"
          columns={[
            { key: "title", label: "Title", render: (r: Row) => <span className="font-medium text-ink">{String(r.title ?? "Untitled note")}</span> },
            {
              key: "content",
              label: "Preview",
              render: (r: Row) => <span className="td-sub truncate max-w-sm block">{String(r.content ?? "")}</span>,
            },
            { key: "createdAt", label: "Created", mono: true, render: (r: Row) => formatDate(r.createdAt) },
          ]}
        />
      ) : (
        <CuratedTable
          collection="course_notes"
          searchFields={["courseId", "lessonId"]}
          searchPlaceholder="Search by course or lesson id…"
          emptyTitle="No lesson notes found"
          columns={[
            {
              key: "note",
              label: "Note",
              render: (r: Row) => <span className="td-sub truncate max-w-sm block">{String(r.note ?? "")}</span>,
            },
            { key: "lessonId", label: "Lesson", mono: true },
            { key: "bookmarked", label: "Bookmarked", render: (r: Row) => (r.bookmarked ? <Badge color="done">Bookmarked</Badge> : "—") },
            { key: "updatedAt", label: "Updated", mono: true, render: (r: Row) => timeAgo(r.updatedAt) },
          ]}
        />
      )}
    </div>
  );
}
