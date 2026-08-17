"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Search, RefreshCw, Trash2, Sparkles, Eye } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { Panel, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate from "@/components/Paginate";
import RecordViewModal from "@/components/RecordViewModal";
import { formatDate } from "@/lib/utils";

export type Assignment = {
  id: string;
  title: string;
  description: string;
  instructions: string;
  type: string;
  classroom: string;
  creator: string;
  dueDate: string | null;
  maxScore: number;
  passingScore: number;
  weight: number;
  allowLateSubmissions: boolean;
  isActive: boolean;
  aiGenerated: boolean;
  createdAt: string;
};

type Data = { items: Assignment[]; total: number; page: number; pages: number };

/** Renders the assignments table for a classroom's detail page. */
export default function AssignmentsTable({ classroomId }: { classroomId: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [viewTarget, setViewTarget] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (classroomId) params.set("classroomId", classroomId);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, loading, refetch } = useApi<Data>(`/api/admin/assignments?${params.toString()}`);
  const items = data?.items || [];

  const toggleActive = async (a: Assignment) => {
    try {
      await apiCall(`/api/admin/assignments?id=${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !a.isActive }),
      });
      toast.success(a.isActive ? "Assignment hidden" : "Assignment activated");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiCall(`/api/admin/assignments?id=${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Assignment deleted");
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
            placeholder="Search assignment title…"
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
          <EmptyState title="No assignments found" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="min-w-[800px]">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Instructor</th>
                    <th>Due</th>
                    <th>Max score</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <p className="font-medium text-ink">{a.title}</p>
                        <p className="td-sub capitalize">{a.type}</p>
                      </td>
                      <td>{a.creator}</td>
                      <td className="td-mono">{a.dueDate ? formatDate(a.dueDate) : "—"}</td>
                      <td className="td-mono">{a.maxScore}</td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <Badge color={a.isActive ? "green" : "slate"}>{a.isActive ? "Active" : "Hidden"}</Badge>
                          {a.aiGenerated && (
                            <span className="chip inline-flex w-fit items-center gap-1">
                              <Sparkles className="h-3 w-3" /> AI-generated
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setViewTarget(a)}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label="View"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => toggleActive(a)} className="pa-btn">
                            {a.isActive ? "Hide" : "Activate"}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(a)}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label="Delete"
                            title="Delete"
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
            <Paginate page={page} pages={data?.pages || 1} count={data?.total || 0} onPage={setPage} label="assignments" />
          </>
        )}
      </Panel>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete assignment"
        message={`This will permanently delete "${deleteTarget?.title}" and any student progress tied to it. This cannot be undone.`}
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <RecordViewModal title={viewTarget?.title || ""} record={viewTarget} hiddenKeys={["title"]} onClose={() => setViewTarget(null)} />
    </div>
  );
}
