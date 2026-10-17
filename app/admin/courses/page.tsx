"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Search, Trash2, RefreshCw, Pencil, Plus, X } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate from "@/components/Paginate";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/components/AuthContext";

type LibraryCourse = {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  format: string;
  totalModules: number;
  progress: number;
  completed: boolean;
  createdAt: string;
  owner: string;
  email: string;
};

type MarketplaceCourse = {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  isPremium: boolean;
  published: boolean;
  enrolled: number;
  createdAt: string;
};

type CourseForm = {
  title: string;
  description: string;
  category: string;
  level: string;
  duration: string;
  instructor: string;
  price: string;
  isPremium: boolean;
  published: boolean;
};

const EMPTY_FORM: CourseForm = {
  title: "",
  description: "",
  category: "",
  level: "beginner",
  duration: "30 days",
  instructor: "Actirova Academy",
  price: "0",
  isPremium: true,
  published: true,
};

type CoursesData = {
  library?: LibraryCourse[];
  marketplace?: MarketplaceCourse[];
  libraryTotal?: number;
  libraryPages?: number;
  marketplaceTotal?: number;
  marketplacePages?: number;
};

export default function CoursesPage() {
  const { admin } = useAuth();
  const isSuperAdmin = admin?.adminLevel === "superadmin";
  const [kind, setKind] = useState<"library" | "marketplace">("marketplace");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams();
  params.set("kind", kind);
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", "20");
  const { data, loading, refetch } = useApi<CoursesData>(`/api/admin/courses?${params.toString()}`);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editor, setEditor] = useState<{ open: boolean; row: MarketplaceCourse | null }>({ open: false, row: null });
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditor({ open: true, row: null });
  };

  const openEdit = (c: MarketplaceCourse) => {
    setForm({
      title: c.title,
      description: c.description,
      category: c.category,
      level: c.level || "beginner",
      duration: "30 days",
      instructor: "Actirova Academy",
      price: String(c.price ?? 0),
      isPremium: c.isPremium,
      published: c.published,
    });
    setEditor({ open: true, row: c });
  };

  const setField = (k: keyof CourseForm, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (editor.row) {
        await apiCall(`/api/admin/courses/${editor.row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            category: form.category,
            level: form.level,
            price: Number(form.price) || 0,
            isPremium: form.isPremium,
            published: form.published,
          }),
        });
        toast.success("Course updated");
      } else {
        await apiCall("/api/admin/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            price: Number(form.price) || 0,
          }),
        });
        toast.success("Course created");
      }
      setEditor({ open: false, row: null });
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
      await apiCall(`/api/admin/courses/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Course deleted");
      setDeleteTarget(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const marketplace = data?.marketplace ?? [];
  const library = data?.library ?? [];

  return (
    <div>
      <PageHeader title="Courses" subtitle="Personalized and marketplace courses" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="theme-seg">
          {(["marketplace", "library"] as const).map((k) => (
            <button
              key={k}
              className={kind === k ? "active" : ""}
              onClick={() => {
                setKind(k);
                setPage(1);
              }}
            >
              {k === "marketplace" ? "Marketplace" : "Personalized"}
            </button>
          ))}
        </div>
        <div className="tb-search min-w-56 flex-1">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search courses…"
          />
        </div>
        <button onClick={refetch} className="tb-btn" aria-label="Refresh">
          <RefreshCw />
        </button>
        {kind === "marketplace" && (
          <button onClick={openCreate} className="btn-modal btn-modal-save inline-flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" /> New course
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : kind === "library" ? (
        <div className="panel">
          {library.length === 0 ? (
            <EmptyState title="No personalized courses found" />
          ) : (
            <>
              <div className="table-wrap">
                <table className="min-w-[720px]">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Topic</th>
                      <th>Difficulty</th>
                      <th>Progress</th>
                      <th>Owner</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {library.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <p className="font-medium text-ink">{c.title}</p>
                          {c.completed && <Badge color="green">Completed</Badge>}
                        </td>
                        <td>{c.topic}</td>
                        <td>{c.difficulty}</td>
                        <td className="td-mono">{Math.round(c.progress || 0)}%</td>
                        <td>
                          <p className="text-ink">{c.owner}</p>
                          <p className="td-sub">{c.email}</p>
                        </td>
                        <td className="td-mono">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginate
                page={page}
                pages={data?.libraryPages || 1}
                count={data?.libraryTotal || 0}
                onPage={setPage}
                label="courses"
              />
            </>
          )}
        </div>
      ) : (
        <div className="panel">
          {marketplace.length === 0 ? (
            <EmptyState title="No marketplace courses found" />
          ) : (
            <>
              <div className="table-wrap">
                <table className="min-w-[820px]">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Category</th>
                      <th>Level</th>
                      <th>Price</th>
                      <th>Enrolled</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketplace.map((c) => (
                      <tr key={c.id}>
                        <td className="max-w-72">
                          <p className="truncate font-medium text-ink">{c.title}</p>
                          <p className="td-sub truncate">{c.description}</p>
                        </td>
                        <td>{c.category}</td>
                        <td>{c.level}</td>
                        <td className="td-mono">${c.price}</td>
                        <td className="td-mono">{c.enrolled}</td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <Badge color={c.published ? "green" : "slate"}>{c.published ? "Published" : "Draft"}</Badge>
                            {c.isPremium && <Badge color="done">Premium</Badge>}
                          </div>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openEdit(c)}
                              className="tb-btn"
                              style={{ width: 30, height: 30, borderRadius: 8 }}
                              aria-label="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await apiCall(`/api/admin/courses/${c.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ published: !c.published }),
                                  });
                                  toast.success(c.published ? "Course unpublished" : "Course published");
                                  refetch();
                                } catch (e) {
                                  toast.error((e as Error).message);
                                }
                              }}
                              className="pa-btn"
                            >
                              {c.published ? "Unpublish" : "Publish"}
                            </button>
                            {isSuperAdmin && (
                              <button onClick={() => setDeleteTarget({ id: c.id, title: c.title })} className="tb-btn" style={{ width: 30, height: 30, borderRadius: 8 }} aria-label="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginate
                page={page}
                pages={data?.marketplacePages || 1}
                count={data?.marketplaceTotal || 0}
                onPage={setPage}
                label="courses"
              />
            </>
          )}
        </div>
      )}

      {editor.open && (
        <div className="modal-overlay" onClick={() => setEditor({ open: false, row: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="flex min-w-0 items-center gap-3">
                <span className="view-icon">
                  <Pencil className="h-4 w-4" />
                </span>
                <h3 className="modal-title truncate">{editor.row ? "Edit course" : "New course"}</h3>
              </div>
              <button onClick={() => setEditor({ open: false, row: null })} className="modal-close" aria-label="Close">
                <X className="h-4 w-4 text-ink3" />
              </button>
            </div>
            <div className="modal-body max-h-[60vh] space-y-4 overflow-y-auto">
              <div>
                <label className="form-label">Title</label>
                <input className="form-input w-full" value={form.title} onChange={(e) => setField("title", e.target.value)} />
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
                  <label className="form-label">Category</label>
                  <input className="form-input w-full" value={form.category} onChange={(e) => setField("category", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Level</label>
                  <select className="form-input w-full" value={form.level} onChange={(e) => setField("level", e.target.value)}>
                    <option value="beginner">beginner</option>
                    <option value="intermediate">intermediate</option>
                    <option value="advanced">advanced</option>
                  </select>
                </div>
              </div>
              {!editor.row && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Duration</label>
                    <input className="form-input w-full" value={form.duration} onChange={(e) => setField("duration", e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label">Instructor</label>
                    <input className="form-input w-full" value={form.instructor} onChange={(e) => setField("instructor", e.target.value)} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Price (USD)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input w-full"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-4 pb-1.5">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={form.isPremium}
                      onChange={(e) => setField("isPremium", e.target.checked)}
                    />
                    <span className="text-sm text-ink2">Premium</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={form.published}
                      onChange={(e) => setField("published", e.target.checked)}
                    />
                    <span className="text-sm text-ink2">Published</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditor({ open: false, row: null })} className="btn-modal btn-modal-cancel">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-modal btn-modal-save">
                {saving ? <Spinner className="h-3.5 w-3.5" /> : editor.row ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete course"
        message={`This will permanently delete "${deleteTarget?.title}" and remove all enrollments. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
