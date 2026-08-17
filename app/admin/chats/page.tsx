"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import CuratedTable from "@/components/CuratedTable";
import { timeAgo } from "@/lib/utils";
import type { Row } from "@/components/CuratedTable";

const TABS = [
  { key: "chats", label: "AI Tutor Chats" },
  { key: "ai_conversations", label: "AI Conversations" },
] as const;

export default function ChatsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("chats");

  return (
    <div>
      <PageHeader title="AI Chats" subtitle="AI tutor chat sessions and other AI conversation logs" />

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

      <CuratedTable
        key={tab}
        collection={tab}
        searchFields={tab === "chats" ? ["topic"] : ["title"]}
        searchPlaceholder="Search…"
        emptyTitle="No records found"
        columns={
          tab === "chats"
            ? [
                { key: "topic", label: "Topic", render: (r: Row) => <span className="font-medium text-ink">{String(r.topic ?? "Untitled chat")}</span> },
                { key: "userId", label: "User", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
                { key: "messages", label: "Messages", mono: true, render: (r: Row) => (Array.isArray(r.messages) ? r.messages.length : 0) },
                { key: "lastMessageAt", label: "Last message", mono: true, render: (r: Row) => timeAgo(r.lastMessageAt || r.createdAt) },
              ]
            : [
                { key: "userId", label: "User", mono: true, render: (r: Row) => String(r.userId ?? "—").slice(-8) },
                { key: "createdAt", label: "Created", mono: true, render: (r: Row) => timeAgo(r.createdAt) },
              ]
        }
      />
    </div>
  );
}
