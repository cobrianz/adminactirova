"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Search, Plus, Trash2, Pencil, Eye, Star, X } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate from "@/components/Paginate";
import { formatDate } from "@/lib/utils";

type Post = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  status: string;
  featured: boolean;
  viewsCount: number;
  readTime: number;
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
};

type BlogData = { posts: Post[]; total: number; page: number; pages: number };

const statusColor: Record<string, string> = { published: "green", draft: "amber" };

export default function BlogPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", "20");
  const { data, loading, refetch } = useApi<BlogData>(`/api/admin/blog?${params.toString()}`);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ title: "", summary: "", category: "General", content: "", status: "draft", featured: false });

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", summary: "", category: "General", content: "", status: "draft", featured: false });
    setEditorOpen(true);
  };

  const openEdit = (p: Post) => {
    setEditing(p);
    setForm({ title: p.title, summary: p.summary, category: p.category, content: "", status: p.status, featured: p.featured });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiCall(`/api/admin/blog/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title, summary: form.summary, category: form.category, status: form.status, featured: form.featured }),
        });
        toast.success("Post updated");
      } else {
        await apiCall("/api/admin/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, featured: undefined, status: form.status }),
        });
        toast.success("Post created");
      }
      setEditorOpen(false);
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
      await apiCall(`/api/admin/blog/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Post deleted");
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
      <PageHeader
        title="Blog"
        subtitle={`${data?.total ?? "…"} posts`}
        actions={
          <button onClick={openNew} className="btn-modal btn-modal-save inline-flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" /> New post
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="tb-search min-w-56 flex-1">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search posts…"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="form-select w-auto"
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="panel">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : !data || data.posts.length === 0 ? (
          <EmptyState title="No posts found" subtitle="Create your first blog post." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="min-w-[760px]">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Author</th>
                    <th>Published</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.posts.map((p) => (
                    <tr key={p.id}>
                      <td className="max-w-80">
                        <p className="truncate font-medium text-ink">
                          {p.featured && <Star className="mr-1 inline h-3.5 w-3.5 text-primary" />}
                          {p.title}
                        </p>
                        <p className="td-sub truncate">/{p.slug}</p>
                      </td>
                      <td>{p.category}</td>
                      <td>
                        <Badge color={statusColor[p.status] || "slate"}>{p.status}</Badge>
                      </td>
                      <td className="td-mono">{p.viewsCount}</td>
                      <td>{p.authorName}</td>
                      <td className="td-mono">{p.publishedAt ? formatDate(p.publishedAt) : "—"}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(p)} className="tb-btn" style={{ width: 30, height: 30, borderRadius: 8 }} aria-label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => window.open(`/blog/${p.slug}`, "_blank")} className="tb-btn" style={{ width: 30, height: 30, borderRadius: 8 }} aria-label="View">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(p)} className="tb-btn" style={{ width: 30, height: 30, borderRadius: 8 }} aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Paginate page={data.page} pages={data.pages} count={data.total} onPage={setPage} label="posts" />
          </>
        )}
      </div>

      {editorOpen && (
        <div className="modal-overlay" onClick={() => setEditorOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">{editing ? "Edit post" : "New post"}</h3>
              <button onClick={() => setEditorOpen(false)} className="modal-close" aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="modal-body">
              <div>
                <label className="form-label">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="form-input" />
              </div>
              <div className="mt-4">
                <label className="form-label">Summary</label>
                <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} className="form-textarea" />
              </div>
              <div className="form-row mt-4">
                <div>
                  <label className="form-label">Category</label>
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="form-select">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <label className="setting-row mt-4">
                <span>
                  <span className="sr-label">Featured</span>
                  <span className="sr-desc">Highlight this post on the blog</span>
                </span>
                <span
                  className={`toggle ${form.featured ? "on" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setForm({ ...form, featured: !form.featured });
                  }}
                />
              </label>
              {editing && (
                <p className="mt-4 rounded-lg border border-border bg-bg3 p-3 text-xs text-ink3">
                  Note: the full content body is only editable via the parent app blog editor.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditorOpen(false)} className="btn-modal btn-modal-cancel">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-modal btn-modal-save">
                {saving ? <Spinner className="h-3.5 w-3.5" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete post"
        message={`This will permanently delete "${deleteTarget?.title}". This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
