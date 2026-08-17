"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Trash2, Eye } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { Panel, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate from "@/components/Paginate";
import RecordViewModal from "@/components/RecordViewModal";
import { formatDate } from "@/lib/utils";

export type Enrollment = {
  id: string;
  classroom: string;
  student: string;
  studentEmail: string;
  status: string;
  joinedAt: string;
};

type Data = { items: Enrollment[]; total: number; page: number; pages: number };

const statusColor: Record<string, string> = { active: "green", removed: "red", left: "slate" };

/** Renders the enrollments table for a classroom's detail page. */
export default function EnrollmentsTable({ classroomId }: { classroomId: string }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);
  const [viewTarget, setViewTarget] = useState<Enrollment | null>(null);
  const [busy, setBusy] = useState(false);

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (classroomId) params.set("classroomId", classroomId);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, loading, refetch } = useApi<Data>(`/api/admin/enrollments?${params.toString()}`);
  const items = data?.items || [];

  const setEnrollmentStatus = async (e: Enrollment, next: string) => {
    try {
      await apiCall(`/api/admin/enrollments?id=${e.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      toast.success("Enrollment updated");
      refetch();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiCall(`/api/admin/enrollments?id=${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Enrollment removed");
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
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="form-select w-auto"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="removed">Removed</option>
          <option value="left">Left</option>
        </select>
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
          <EmptyState title="No enrollments found" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="min-w-[720px]">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <p className="font-medium text-ink">{e.student}</p>
                        <p className="td-sub">{e.studentEmail}</p>
                      </td>
                      <td>
                        <Badge color={statusColor[e.status] || "slate"}>{e.status}</Badge>
                      </td>
                      <td className="td-mono">{formatDate(e.joinedAt)}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setViewTarget(e)}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label="View"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {e.status !== "active" && (
                            <button onClick={() => setEnrollmentStatus(e, "active")} className="pa-btn">
                              Reinstate
                            </button>
                          )}
                          {e.status === "active" && (
                            <button onClick={() => setEnrollmentStatus(e, "removed")} className="pa-btn">
                              Remove
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(e)}
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
            <Paginate page={page} pages={data?.pages || 1} count={data?.total || 0} onPage={setPage} label="enrollments" />
          </>
        )}
      </Panel>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete enrollment record"
        message="This permanently removes the enrollment record (the student's course/lesson progress in that classroom is not affected). This cannot be undone."
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <RecordViewModal title={viewTarget?.student || ""} record={viewTarget} onClose={() => setViewTarget(null)} />
    </div>
  );
}
