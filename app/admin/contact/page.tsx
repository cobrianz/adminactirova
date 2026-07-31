"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate from "@/components/Paginate";
import { formatDate, timeAgo } from "@/lib/utils";

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  adminNotes: string;
  createdAt: string;
};

type ContactData = {
  messages: Message[];
  total: number;
  counts: Record<string, number>;
  page: number;
  pages: number;
};

const statusColor: Record<string, string> = { new: "pending", "in-progress": "amber", resolved: "done", closed: "slate" };

export default function ContactPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, refetch } = useApi<ContactData>(`/api/admin/contact?status=${status}&page=${page}&limit=20`);
  const [expanded, setExpanded] = useState<Message | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState(false);

  const updateStatus = async (m: Message, newStatus: string) => {
    try {
      await apiCall(`/api/admin/contact/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success("Status updated");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiCall(`/api/admin/contact/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Message deleted");
      setDeleteTarget(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const counts = data?.counts || {};
  const tabs = [
    { key: "", label: "All" },
    { key: "new", label: `New (${counts.new ?? 0})` },
    { key: "in-progress", label: `In progress (${counts["in-progress"] ?? 0})` },
    { key: "resolved", label: `Resolved (${counts.resolved ?? 0})` },
    { key: "closed", label: `Closed (${counts.closed ?? 0})` },
  ];

  return (
    <div>
      <PageHeader title="Contact messages" subtitle={`${data?.total ?? "…"} messages`} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setStatus(t.key);
              setPage(1);
            }}
            className={`pa-btn ${status === t.key ? "active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : !data || data.messages.length === 0 ? (
          <EmptyState title="No messages" subtitle="Inbox zero." />
        ) : (
          <>
            <div className="activity-list">
              {data.messages.map((m) => (
                <div key={m.id} className="act-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{m.subject || "No subject"}</p>
                        <Badge color={statusColor[m.status] || "slate"}>{m.status}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-ink3">
                        {m.name} · {m.email} · {m.category} · {timeAgo(m.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        value={m.status}
                        onChange={(e) => updateStatus(m, e.target.value)}
                        className="form-select w-auto"
                      >
                        <option value="new">New</option>
                        <option value="in-progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <button
                        onClick={() => setExpanded(expanded?.id === m.id ? null : m)}
                        className="pa-btn"
                      >
                        {expanded?.id === m.id ? "Hide" : "View"}
                      </button>
                      <button onClick={() => setDeleteTarget(m)} className="tb-btn" style={{ width: 30, height: 30, borderRadius: 8 }} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {expanded?.id === m.id && (
                    <div className="mt-3 rounded-xl border border-border bg-bg3 p-4">
                      <p className="whitespace-pre-wrap text-sm text-ink2">{m.message}</p>
                      {m.adminNotes && (
                        <p className="mt-3 border-t pt-3 text-xs text-ink3" style={{ borderColor: "var(--border)" }}>
                          <span className="font-medium">Admin notes:</span> {m.adminNotes}
                        </p>
                      )}
                      <p className="mt-3 text-xs text-ink3">Received {formatDate(m.createdAt)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Paginate page={data.page} pages={data.pages} count={data.total} onPage={setPage} label="messages" />
          </>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete message"
        message={`This will permanently delete the message from ${deleteTarget?.name}. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
