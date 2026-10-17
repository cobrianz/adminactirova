"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Eye, Trash2, RefreshCw, Loader2, Pencil, X } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate from "@/components/Paginate";
import { formatDate } from "@/lib/utils";

type Classroom = {
  id: string;
  name: string;
  subject: string;
  academicLevel: string;
  semester: string;
  durationWeeks: number;
  isActive: boolean;
  inviteCode: string;
  maxStudents: number;
  students: number;
  instructorName: string;
  createdAt: string;
};

type ClassroomsData = {
  classrooms: Classroom[];
  total: number;
  page: number;
  pages: number;
};

type ClassroomForm = {
  name: string;
  description: string;
  subject: string;
  academicLevel: string;
  semester: string;
  durationWeeks: string;
  maxStudents: string;
  isActive: boolean;
};

export default function ClassroomsPage() {
  const router = useRouter();
  const [isViewPending, startViewTransition] = useTransition();
  const [pendingViewId, setPendingViewId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", "20");
  const { data, loading, refetch } = useApi<ClassroomsData>(`/api/admin/classrooms?${params.toString()}`);
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editor, setEditor] = useState<{ open: boolean; row: Classroom | null }>({ open: false, row: null });
  const [form, setForm] = useState<ClassroomForm | null>(null);
  const [saving, setSaving] = useState(false);

  const openEdit = (c: Classroom) => {
    setForm({
      name: c.name,
      description: "",
      subject: c.subject,
      academicLevel: c.academicLevel,
      semester: c.semester,
      durationWeeks: String(c.durationWeeks || 0),
      maxStudents: String(c.maxStudents || 0),
      isActive: c.isActive,
    });
    setEditor({ open: true, row: c });
  };

  const setField = (k: keyof ClassroomForm, v: string | boolean) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const handleSave = async () => {
    if (!editor.row || !form) return;
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await apiCall(`/api/admin/classrooms/${editor.row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          subject: form.subject,
          academicLevel: form.academicLevel,
          semester: form.semester,
          durationWeeks: Number(form.durationWeeks) || 0,
          maxStudents: Number(form.maxStudents) || 0,
          isActive: form.isActive,
        }),
      });
      toast.success("Classroom updated");
      setEditor({ open: false, row: null });
      setForm(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiCall(`/api/admin/collections/classrooms?id=${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Classroom deleted");
      setDeleteTarget(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Classrooms" subtitle={`${data?.total ?? "…"} classrooms`} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="tb-search min-w-56 flex-1">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search classrooms…"
          />
        </div>
        <button onClick={refetch} className="tb-btn" aria-label="Refresh">
          <RefreshCw />
        </button>
      </div>

      <div className="panel">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : !data || data.classrooms.length === 0 ? (
          <EmptyState title="No classrooms found" subtitle="Classrooms created by instructors will appear here." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="min-w-[720px]">
                <thead>
                  <tr>
                    <th>Classroom</th>
                    <th>Subject</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Students</th>
                    <th>Instructor</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.classrooms.map((c) => (
                    <tr key={c.id}>
                      <td className="max-w-72">
                        <Link href={`/admin/classrooms/${c.id}`} className="group block">
                          <p className="truncate font-medium text-ink group-hover:text-primary">{c.name}</p>
                          <p className="td-sub font-mono">{c.inviteCode}</p>
                        </Link>
                      </td>
                      <td>{c.subject || "—"}</td>
                      <td>
                        {[c.academicLevel, c.semester].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td>
                        <Badge color={c.isActive ? "active" : "paused"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="td-mono">
                        {c.students}
                        {c.maxStudents ? ` / ${c.maxStudents}` : ""}
                      </td>
                      <td>{c.instructorName}</td>
                      <td className="td-mono">{formatDate(c.createdAt)}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setPendingViewId(c.id);
                              startViewTransition(() => router.push(`/admin/classrooms/${c.id}`));
                            }}
                            disabled={isViewPending}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label="View"
                          >
                            {isViewPending && pendingViewId === c.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
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

            <Paginate page={data.page} pages={data.pages} count={data.total} onPage={setPage} label="classrooms" />
          </>
        )}
      </div>

      {editor.open && form && (
        <div className="modal-overlay" onClick={() => { setEditor({ open: false, row: null }); setForm(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="flex min-w-0 items-center gap-3">
                <span className="view-icon">
                  <Pencil className="h-4 w-4" />
                </span>
                <h3 className="modal-title truncate">Edit classroom</h3>
              </div>
              <button
                onClick={() => { setEditor({ open: false, row: null }); setForm(null); }}
                className="modal-close"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-ink3" />
              </button>
            </div>
            <div className="modal-body max-h-[60vh] space-y-4 overflow-y-auto">
              <div>
                <label className="form-label">Name</label>
                <input className="form-input w-full" value={form.name} onChange={(e) => setField("name", e.target.value)} />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea w-full"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Subject</label>
                  <input className="form-input w-full" value={form.subject} onChange={(e) => setField("subject", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Academic level</label>
                  <input
                    className="form-input w-full"
                    value={form.academicLevel}
                    onChange={(e) => setField("academicLevel", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Semester</label>
                  <input className="form-input w-full" value={form.semester} onChange={(e) => setField("semester", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Duration (weeks)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input w-full"
                    value={form.durationWeeks}
                    onChange={(e) => setField("durationWeeks", e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Max students</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input w-full"
                    value={form.maxStudents}
                    onChange={(e) => setField("maxStudents", e.target.value)}
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setField("isActive", e.target.checked)}
                />
                <span className="text-sm text-ink2">Active</span>
              </label>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => { setEditor({ open: false, row: null }); setForm(null); }}
                className="btn-modal btn-modal-cancel"
              >
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-modal btn-modal-save">
                {saving ? <Spinner className="h-3.5 w-3.5" /> : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete classroom"
        message={`This will permanently delete "${deleteTarget?.name}". This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
