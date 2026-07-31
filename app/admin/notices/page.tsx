"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Power, X } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Notice = {
  id: string;
  key: string;
  title: string;
  message: string;
  variant: string;
  icon: string;
  active: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

type NoticesData = { notices: Notice[] };

const variantColor: Record<string, string> = { info: "green", success: "done", warning: "amber", error: "red" };

const emptyForm = { title: "", message: "", variant: "info", active: true, priority: 0 };

export default function NoticesPage() {
  const { data, loading, refetch } = useApi<NoticesData>("/api/admin/notices");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (n: Notice) => {
    setEditing(n);
    setForm({ title: n.title, message: n.message, variant: n.variant, active: n.active, priority: n.priority });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!form.message.trim()) {
      toast.error("Message is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiCall(`/api/admin/notices/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        toast.success("Notice updated");
      } else {
        await apiCall("/api/admin/notices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        toast.success("Notice created");
      }
      setEditorOpen(false);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (n: Notice) => {
    try {
      await apiCall(`/api/admin/notices/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !n.active }),
      });
      toast.success(n.active ? "Notice hidden" : "Notice shown");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiCall(`/api/admin/notices/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Notice deleted");
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
        title="Site notices"
        subtitle="Banners and alerts shown across the platform"
        actions={
          <button onClick={openNew} className="btn-modal btn-modal-save inline-flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" /> New notice
          </button>
        }
      />

      <div className="panel">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : !data || data.notices.length === 0 ? (
          <EmptyState title="No notices" subtitle="Create a notice to display it site-wide." />
        ) : (
          <div className="activity-list">
            {data.notices.map((n) => (
              <div key={n.id} className="act-item">
                <div className="act-dot-wrap">
                  <span
                    className="act-dot"
                    style={{
                      background:
                        n.variant === "error"
                          ? "var(--red)"
                          : n.variant === "warning"
                          ? "var(--orange)"
                          : n.variant === "success"
                          ? "var(--green)"
                          : "var(--blue)",
                    }}
                  />
                  <span className="act-line" />
                </div>
                <div className="act-content">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={variantColor[n.variant] || "slate"}>{n.variant}</Badge>
                    <span className="text-sm font-semibold text-ink">{n.title}</span>
                    <Badge color={n.active ? "active" : "paused"}>{n.active ? "Active" : "Hidden"}</Badge>
                    <span className="act-time">Priority {n.priority}</span>
                  </div>
                  <p className="act-msg mt-1 truncate">{n.message}</p>
                  <p className="act-time mt-1">
                    {n.key} · updated {n.updatedAt ? formatDate(n.updatedAt) : formatDate(n.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleActive(n)}
                    className="tb-btn"
                    style={{ width: 30, height: 30, borderRadius: 8, color: n.active ? "var(--green)" : undefined }}
                    title={n.active ? "Hide notice" : "Show notice"}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openEdit(n)} className="tb-btn" style={{ width: 30, height: 30, borderRadius: 8 }} aria-label="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(n)} className="tb-btn" style={{ width: 30, height: 30, borderRadius: 8 }} aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editorOpen && (
        <div className="modal-overlay" onClick={() => setEditorOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">{editing ? "Edit notice" : "New notice"}</h3>
              <button onClick={() => setEditorOpen(false)} className="modal-close" aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="modal-body">
              <div>
                <label className="form-label">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="form-input" />
              </div>
              <div className="mt-4">
                <label className="form-label">Message *</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className="form-textarea" />
              </div>
              <div className="form-row mt-4">
                <div>
                  <label className="form-label">Variant</label>
                  <select value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} className="form-select">
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    className="form-input"
                  />
                </div>
              </div>
              <label className="setting-row mt-2">
                <span>
                  <span className="sr-label">Active</span>
                  <span className="sr-desc">Display this notice site-wide</span>
                </span>
                <span
                  className={`toggle ${form.active ? "on" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setForm({ ...form, active: !form.active });
                  }}
                />
              </label>
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
        title="Delete notice"
        message={`This will permanently delete "${deleteTarget?.title}". This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
