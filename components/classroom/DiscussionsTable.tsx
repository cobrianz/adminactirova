"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Search, RefreshCw, Trash2, Pin, Lock, Unlock, Eye } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { Panel, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate from "@/components/Paginate";
import RecordViewModal from "@/components/RecordViewModal";
import { timeAgo } from "@/lib/utils";

export type Discussion = {
  id: string;
  title: string;
  description: string;
  classroom: string;
  creator: string;
  postCount: number;
  isPinned: boolean;
  isClosed: boolean;
  lastActivityAt: string;
};

type Data = { items: Discussion[]; total: number; page: number; pages: number };

/** Renders the discussions table for a classroom's detail page. */
export default function DiscussionsTable({ classroomId }: { classroomId: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Discussion | null>(null);
  const [viewTarget, setViewTarget] = useState<Discussion | null>(null);
  const [busy, setBusy] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (classroomId) params.set("classroomId", classroomId);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, loading, refetch } = useApi<Data>(`/api/admin/discussions?${params.toString()}`);
  const items = data?.items || [];

  const patch = async (d: Discussion, body: Record<string, unknown>, msg: string) => {
    try {
      await apiCall(`/api/admin/discussions?id=${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success(msg);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiCall(`/api/admin/discussions?id=${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Discussion deleted");
      setDeleteTarget(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="tb-search min-w-56 flex-1">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search discussion title…"
          />
        </div>
        <button onClick={refetch} className="tb-btn" aria-label="Refresh">
          <RefreshCw />
        </button>
      </div>

      <Panel>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No discussions found" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="min-w-[800px]">
                <thead>
                  <tr>
                    <th>Discussion</th>
                    <th>Started by</th>
                    <th>Posts</th>
                    <th>Last activity</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => (
                    <tr key={d.id}>
                      <td className="max-w-72">
                        <p className="truncate font-medium text-ink">{d.title}</p>
                        <p className="td-sub truncate">{d.description}</p>
                      </td>
                      <td>{d.creator}</td>
                      <td className="td-mono">{d.postCount}</td>
                      <td className="td-mono">{timeAgo(d.lastActivityAt)}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {d.isPinned && <Badge color="done">Pinned</Badge>}
                          <Badge color={d.isClosed ? "slate" : "green"}>{d.isClosed ? "Closed" : "Open"}</Badge>
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setViewTarget(d)}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label="View"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => patch(d, { isPinned: !d.isPinned }, d.isPinned ? "Unpinned" : "Pinned")}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label={d.isPinned ? "Unpin" : "Pin"}
                            title={d.isPinned ? "Unpin" : "Pin"}
                          >
                            <Pin className="h-3.5 w-3.5" fill={d.isPinned ? "currentColor" : "none"} />
                          </button>
                          <button
                            onClick={() => patch(d, { isClosed: !d.isClosed }, d.isClosed ? "Reopened" : "Closed")}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label={d.isClosed ? "Reopen" : "Close"}
                            title={d.isClosed ? "Reopen" : "Close"}
                          >
                            {d.isClosed ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(d)}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginate page={page} pages={data?.pages || 1} count={data?.total || 0} onPage={setPage} label="discussions" />
          </>
        )}
      </Panel>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete discussion"
        message={`This will permanently delete "${deleteTarget?.title}" and all of its posts. This cannot be undone.`}
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <RecordViewModal title={viewTarget?.title || ""} record={viewTarget} hiddenKeys={["title"]} onClose={() => setViewTarget(null)} />
    </div>
  );
}
