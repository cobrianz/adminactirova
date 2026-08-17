"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Search, RefreshCw, Trash2, FileText, Video, Link2, Presentation, Code2, File, Eye } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { Panel, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate from "@/components/Paginate";
import RecordViewModal from "@/components/RecordViewModal";
import { formatDate } from "@/lib/utils";

export type Material = {
  id: string;
  title: string;
  description: string;
  type: string;
  classroom: string;
  uploader: string;
  fileName: string;
  url: string;
  fileSize: number;
  aiSummary: string;
  isRequired: boolean;
  createdAt: string;
};

type Data = { items: Material[]; total: number; page: number; pages: number };

const TYPE_ICON: Record<string, React.ElementType> = {
  document: FileText,
  video: Video,
  link: Link2,
  slides: Presentation,
  code: Code2,
  other: File,
};

/** Renders the course materials table for a classroom's detail page. */
export default function MaterialsTable({ classroomId }: { classroomId: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [viewTarget, setViewTarget] = useState<Material | null>(null);
  const [busy, setBusy] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (classroomId) params.set("classroomId", classroomId);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, loading, refetch } = useApi<Data>(`/api/admin/course-materials?${params.toString()}`);
  const items = data?.items || [];

  const toggleRequired = async (m: Material) => {
    try {
      await apiCall(`/api/admin/course-materials?id=${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRequired: !m.isRequired }),
      });
      toast.success("Material updated");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiCall(`/api/admin/course-materials?id=${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Material deleted");
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
            placeholder="Search material title…"
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
          <EmptyState title="No materials found" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="min-w-[760px]">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Uploaded by</th>
                    <th>Added</th>
                    <th>Required</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => {
                    const Icon = TYPE_ICON[m.type] || File;
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span className="view-icon shrink-0" style={{ width: 30, height: 30 }}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink">{m.title}</p>
                              <p className="td-sub truncate capitalize">{m.type}</p>
                            </div>
                          </div>
                        </td>
                        <td>{m.uploader}</td>
                        <td className="td-mono">{formatDate(m.createdAt)}</td>
                        <td>
                          <Badge color={m.isRequired ? "done" : "slate"}>{m.isRequired ? "Required" : "Optional"}</Badge>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setViewTarget(m)}
                              className="tb-btn"
                              style={{ width: 30, height: 30, borderRadius: 8 }}
                              aria-label="View"
                              title="View details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => toggleRequired(m)} className="pa-btn">
                              {m.isRequired ? "Make optional" : "Make required"}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(m)}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Paginate page={page} pages={data?.pages || 1} count={data?.total || 0} onPage={setPage} label="materials" />
          </>
        )}
      </Panel>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete material"
        message={`This will permanently delete "${deleteTarget?.title}". This cannot be undone.`}
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <RecordViewModal title={viewTarget?.title || ""} record={viewTarget} hiddenKeys={["title"]} onClose={() => setViewTarget(null)} />
    </div>
  );
}
