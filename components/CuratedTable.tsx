"use client";

import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, RefreshCw, Eye, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useApi, apiCall } from "@/components/useApi";
import { Panel, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate, { usePageSlice } from "@/components/Paginate";
import RecordViewModal from "@/components/RecordViewModal";

export type Row = Record<string, unknown> & { _id?: string };

export type Column = {
  key: string;
  label: string;
  render?: (row: Row) => React.ReactNode;
  mono?: boolean;
};

export type FormField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "boolean" | "select";
  options?: string[];
};

/** A quick per-row on/off toggle rendered as an icon button (e.g. suspend/reactivate, require/optional). */
export type ToggleAction = {
  field: string;
  onLabel: string;
  offLabel: string;
};

/**
 * A config-driven, purpose-styled replacement for the raw auto-inferred
 * DataSection/CollectionTabs pattern — same generic /api/admin/collections
 * backend (already has CRUD + audit logging), but the caller supplies real
 * column labels and renderers instead of the field names being guessed from
 * whatever happens to be on the first document.
 */
export default function CuratedTable({
  collection,
  columns,
  searchFields = [],
  searchPlaceholder = "Search…",
  formFields,
  readOnly,
  emptyTitle = "No records found",
  emptySubtitle,
  pageSize = 12,
  newLabel,
  toggleAction,
  titleField,
}: {
  collection: string;
  columns: Column[];
  searchFields?: string[];
  searchPlaceholder?: string;
  formFields?: FormField[];
  readOnly?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  pageSize?: number;
  newLabel?: string;
  /** Renders a quick suspend/reactivate-style icon toggle for a boolean field. */
  toggleAction?: ToggleAction;
  /** Field used as the view modal's title (falls back to title/name/topic/email). */
  titleField?: string;
}) {
  const [search, setSearch] = useState("");
  const [editRow, setEditRow] = useState<Row | null | undefined>(undefined);
  const [viewRow, setViewRow] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  const { data, loading, refetch } = useApi<{ items: Row[] }>(`/api/admin/collections/${collection}`);

  const filtered = useMemo(() => {
    const items = data?.items || [];
    const q = search.trim().toLowerCase();
    if (!q || searchFields.length === 0) return items;
    return items.filter((r) => searchFields.some((f) => String(r[f] ?? "").toLowerCase().includes(q)));
  }, [data, search, searchFields]);

  const { page, pages, count, slice, setPage } = usePageSlice(filtered, pageSize);

  const openEditor = (row: Row | null) => {
    const initial: Record<string, unknown> = {};
    for (const f of formFields || []) initial[f.key] = row ? row[f.key] ?? "" : "";
    setForm(initial);
    setEditRow(row);
  };

  const handleSave = async () => {
    if (!formFields) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of formFields) {
        const raw = form[f.key];
        if (f.type === "boolean") payload[f.key] = !!raw;
        else if (f.type === "number") payload[f.key] = Number(raw) || 0;
        else payload[f.key] = raw;
      }
      const path = `/api/admin/collections/${collection}`;
      if (editRow) {
        await apiCall(`${path}?id=${editRow._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Updated");
      } else {
        await apiCall(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Created");
      }
      setEditRow(undefined);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiCall(`/api/admin/collections/${collection}?id=${deleteTarget._id}`, { method: "DELETE" });
      toast.success("Deleted");
      setDeleteTarget(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (row: Row) => {
    if (!toggleAction || !row._id) return;
    const nextValue = !row[toggleAction.field];
    setToggleBusyId(row._id);
    try {
      await apiCall(`/api/admin/collections/${collection}?id=${row._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [toggleAction.field]: nextValue }),
      });
      toast.success(nextValue ? toggleAction.onLabel : toggleAction.offLabel);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setToggleBusyId(null);
    }
  };

  const rowTitle = (row: Row): string => {
    const key = titleField || ["title", "name", "topic", "subject", "email", "key"].find((k) => typeof row[k] === "string" && row[k]);
    return (key && String(row[key])) || "Record";
  };

  const canWrite = !readOnly && !!formFields;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {searchFields.length > 0 && (
          <div className="tb-search min-w-56 flex-1">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
            />
          </div>
        )}
        <button onClick={refetch} className="tb-btn ml-auto" aria-label="Refresh">
          <RefreshCw />
        </button>
        {canWrite && (
          <button onClick={() => openEditor(null)} className="btn-modal btn-modal-save inline-flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" /> {newLabel || "New"}
          </button>
        )}
      </div>

      <Panel>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="min-w-[640px]">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((row, i) => (
                    <tr key={row._id || i}>
                      {columns.map((c) => (
                        <td key={c.key} className={c.mono ? "td-mono" : undefined}>
                          {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                        </td>
                      ))}
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setViewRow(row)}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label="View"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {canWrite && toggleAction && (
                            <button
                              onClick={() => handleToggle(row)}
                              disabled={toggleBusyId === row._id}
                              className="tb-btn"
                              style={{ width: 30, height: 30, borderRadius: 8 }}
                              aria-label={row[toggleAction.field] ? toggleAction.offLabel : toggleAction.onLabel}
                              title={row[toggleAction.field] ? toggleAction.offLabel : toggleAction.onLabel}
                            >
                              {row[toggleAction.field] ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => openEditor(row)}
                              className="tb-btn"
                              style={{ width: 30, height: 30, borderRadius: 8 }}
                              aria-label="Edit"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => setDeleteTarget(row)}
                              className="tb-btn"
                              style={{ width: 30, height: 30, borderRadius: 8 }}
                              aria-label="Delete"
                              title="Delete"
                            >
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
            <Paginate page={page} pages={pages} count={count} onPage={setPage} />
          </>
        )}
      </Panel>

      {editRow !== undefined && formFields && (
        <div className="modal-overlay" onClick={() => setEditRow(undefined)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="flex min-w-0 items-center gap-3">
                <span className="view-icon">
                  <Pencil className="h-4 w-4" />
                </span>
                <h3 className="modal-title truncate">{editRow ? "Edit" : newLabel || "New"}</h3>
              </div>
              <button onClick={() => setEditRow(undefined)} className="modal-close" aria-label="Close">
                <span className="text-sm text-ink3">✕</span>
              </button>
            </div>
            <div className="modal-body max-h-[60vh] space-y-4 overflow-y-auto">
              {formFields.map((f) => (
                <div key={f.key}>
                  <label className="form-label">{f.label}</label>
                  {f.type === "boolean" ? (
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!form[f.key]}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                        className="checkbox"
                      />
                      <span className="text-sm text-ink2">enabled</span>
                    </label>
                  ) : f.type === "textarea" ? (
                    <textarea
                      value={String(form[f.key] ?? "")}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      rows={5}
                      className="form-textarea w-full"
                    />
                  ) : f.type === "select" ? (
                    <select
                      value={String(form[f.key] ?? "")}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="form-input w-full"
                    >
                      {(f.options || []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={String(form[f.key] ?? "")}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="form-input w-full"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditRow(undefined)} className="btn-modal btn-modal-cancel">
                Cancel
              </button>
              <button onClick={handleSave} disabled={busy} className="btn-modal btn-modal-save">
                {busy ? <Spinner className="h-3.5 w-3.5" /> : editRow ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <RecordViewModal
        title={viewRow ? rowTitle(viewRow) : ""}
        record={viewRow}
        onClose={() => setViewRow(null)}
        footer={
          <>
            {canWrite && (
              <button
                onClick={() => {
                  const row = viewRow;
                  setViewRow(null);
                  openEditor(row);
                }}
                className="btn-modal btn-modal-save"
              >
                Edit
              </button>
            )}
            <button onClick={() => setViewRow(null)} className="btn-modal btn-modal-cancel">
              Close
            </button>
          </>
        }
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete record"
        message="This will permanently delete this record. This cannot be undone."
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
