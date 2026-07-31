"use client";

import React, { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckSquare,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, apiCall } from "@/components/useApi";
import { Spinner, EmptyState, ConfirmModal } from "@/components/ui";
import MarkdownContent from "@/components/MarkdownContent";
import { COLLECTIONS } from "@/lib/collections";

type Row = Record<string, unknown> & { _id?: string };

const HIDDEN_FIELDS = new Set([
  "_id",
  "__v",
  "password",
  "refreshTokens",
  "pushSubscriptions",
  "salt",
  "emailVerificationToken",
  "emailVerificationExpires",
  "passwordResetCode",
  "passwordResetExpires",
]);
const READONLY_FIELDS = new Set(["createdAt", "updatedAt", "lastLogin", "lastSeen"]);
const ID_REF_FIELDS = new Set(["id", "uploadedBy", "createdBy", "generatedForUser", "cacheKey"]);
const PREFERRED = [
  "name",
  "title",
  "username",
  "label",
  "key",
  "email",
  "topic",
  "type",
  "status",
  "category",
  "course",
  "difficulty",
  "createdAt",
  "updatedAt",
];
const MAX_COLS = 6;

function isIdField(k: string) {
  return ID_REF_FIELDS.has(k) || /Id$/i.test(k);
}

function truncate(s: string, n = 36) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function valueText(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return truncate(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[${v.length} items]`;
  return `{${Object.keys(v as object).length} fields}`;
}

function formatDateLike(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

const CONTENT_FIELDS = /^(body|content|message|summary|answer|prompt|text|transcript|notes|description|overview|announcement|feedback|completion|sections)$/i;

function isContentValue(k: string, v: string): boolean {
  if (!v.trim()) return false;
  if (CONTENT_FIELDS.test(k)) return true;
  return v.includes("\n") && v.length > 80;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

const PRIMARY_FIELDS = ["name", "title", "email", "username", "label", "key", "topic", "subject"];
const BADGE_FIELDS = ["status", "role", "type", "category", "difficulty", "level", "course", "language"];

function pickPrimary(row: Row): string {
  for (const f of PRIMARY_FIELDS) {
    const v = row[f];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function nestedTitle(item: Record<string, unknown>, i: number): string {
  for (const f of ["title", "name", "heading", "label", "key", "type"]) {
    const v = item[f];
    if (typeof v === "string" && v.trim()) return v;
  }
  return `Item ${i + 1}`;
}

function ViewValue({ k, v }: { k: string; v: unknown }) {
  if (v === null || v === undefined || v === "") {
    return <p className="view-value dim">—</p>;
  }
  if (typeof v === "boolean") {
    return (
      <span className="status-pill">
        <span className="sp-dot" style={{ background: v ? "var(--acid)" : "var(--ink4)" }} />
        {String(v)}
      </span>
    );
  }
  if (typeof v === "number") {
    return <p className="view-value mono">{String(v)}</p>;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return <p className="view-value dim">—</p>;
    if (v.every((x) => isPlainObject(x))) {
      return (
        <div className="nested-list">
          {v.map((item, i) => (
            <div key={i} className="nested-card">
              <p className="nested-title">{nestedTitle(item, i)}</p>
              <div className="nested-body">
                {Object.entries(item)
                  .filter(
                    ([key, val]) => !HIDDEN_FIELDS.has(key) && !isIdField(key) && val !== null && val !== undefined
                  )
                  .map(([key, val]) => (
                    <div key={key} className="view-field">
                      <span className="view-label">{key}</span>
                      <ViewValue k={key} v={val} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="chip-list">
        {v.map((x, i) => (
          <span key={i} className="chip">
            {String(x)}
          </span>
        ))}
      </div>
    );
  }
  if (isPlainObject(v)) {
    const entries = Object.entries(v).filter(
      ([key, val]) => !HIDDEN_FIELDS.has(key) && !isIdField(key) && val !== null && val !== undefined
    );
    if (entries.length === 0) return <p className="view-value dim">—</p>;
    return (
      <div className="nested-card">
        <div className="nested-body">
          {entries.map(([key, val]) => (
            <div key={key} className="view-field">
              <span className="view-label">{key}</span>
              <ViewValue k={key} v={val} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (typeof v === "string" && isContentValue(k, v)) {
    return <MarkdownContent>{v}</MarkdownContent>;
  }
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    return <p className="view-value">{formatDateLike(v)}</p>;
  }
  if (typeof v === "string") {
    return <p className="view-value">{v}</p>;
  }
  return <p className="view-value">{String(v)}</p>;
}

function inferType(v: unknown): "string" | "number" | "boolean" | "json" {
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (v !== null && typeof v === "object") return "json";
  return "string";
}

function pickColumns(rows: Row[]): string[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]).filter(
    (k) => !HIDDEN_FIELDS.has(k) && !isIdField(k) && typeof rows[0][k] !== "object"
  );
  if (keys.length === 0) return Object.keys(rows[0]).filter((k) => !HIDDEN_FIELDS.has(k)).slice(0, 4);
  const ordered = [...keys].sort((a, b) => {
    const ai = PREFERRED.indexOf(a);
    const bi = PREFERRED.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return ordered.slice(0, MAX_COLS);
}

function buildFieldList(row: Row | null, defaultFields?: string[]): string[] {
  if (row) {
    return Object.keys(row)
      .filter((k) => !HIDDEN_FIELDS.has(k) && !READONLY_FIELDS.has(k) && !isIdField(k))
      .slice(0, 14);
  }
  return defaultFields && defaultFields.length ? defaultFields : ["title"];
}

type EditorState = { row: Row | null; open: boolean };
type BulkState = { open: boolean; field: string; value: string };

export default function DataSection({
  collection,
  readOnly,
  defaultFields,
  pageSize = 10,
  filter,
}: {
  collection: string;
  readOnly?: boolean;
  defaultFields?: string[];
  pageSize?: number;
  filter?: { field: string; value: string };
}) {
  const meta = COLLECTIONS[collection];
  const label = meta?.label || collection;
  const canWrite = !readOnly && !meta?.readOnly;

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditorState>({ row: null, open: false });
  const [viewRow, setViewRow] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [bulk, setBulk] = useState<BulkState>({ open: false, field: "", value: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  const { data, loading, refetch } = useApi<{ items: Row[]; total: number }>(
    filter
      ? `/api/admin/collections/${collection}?f_field=${encodeURIComponent(filter.field)}&f_value=${encodeURIComponent(filter.value)}`
      : `/api/admin/collections/${collection}`
  );

  const items = useMemo(() => data?.items || [], [data]);
  const columns = useMemo(() => pickColumns(items), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => columns.some((c) => String(r[c] ?? "").toLowerCase().includes(q)));
  }, [items, search, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const fieldList = useMemo(() => buildFieldList(editor.row, defaultFields), [editor.row, defaultFields]);
  const fieldTypes = useMemo(() => {
    const m: Record<string, "string" | "number" | "boolean" | "json"> = {};
    for (const f of fieldList) {
      m[f] = meta?.fieldTypes?.[f] ?? (editor.row ? inferType(editor.row[f]) : "string");
    }
    return m;
  }, [fieldList, editor.row, meta]);

  const openEditor = (row: Row | null) => {
    const fields = buildFieldList(row, defaultFields);
    const initial: Record<string, unknown> = {};
    for (const f of fields) initial[f] = row ? row[f] ?? "" : "";
    setForm(initial);
    setEditor({ row, open: true });
  };

  const setField = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const afterMutate = () => {
    setSelected(new Set());
    setPage(1);
    refetch();
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of fieldList) {
        const type = fieldTypes[f] || "string";
        const raw = form[f];
        if (type === "json") {
          const s = String(raw ?? "").trim();
          if (!s) continue;
          try {
            payload[f] = JSON.parse(s);
          } catch {
            toast.error(`Invalid JSON in "${f}"`);
            setBusy(false);
            return;
          }
        } else if (type === "number") {
          if (raw === "" || raw === null || raw === undefined) continue;
          const n = Number(raw);
          if (!Number.isFinite(n)) {
            toast.error(`Invalid number in "${f}"`);
            setBusy(false);
            return;
          }
          payload[f] = n;
        } else if (type === "boolean") {
          payload[f] = !!raw;
        } else {
          const s = String(raw ?? "").trim();
          if (!s) continue;
          payload[f] = s;
        }
      }

      const path = `/api/admin/collections/${collection}`;
      if (editor.row) {
        await apiCall(`${path}?id=${editor.row._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success(`${label} updated`);
      } else {
        if (filter) payload[filter.field] = filter.value;
        await apiCall(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success(`${label} created`);
      }
      setEditor({ row: null, open: false });
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
      toast.success(`${label} deleted`);
      setDeleteTarget(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const ids = [...selected].join(",");
      await apiCall(`/api/admin/collections/${collection}?ids=${ids}`, { method: "DELETE" });
      toast.success(`Deleted ${selected.size} ${label.toLowerCase()} records`);
      setBulkDelete(false);
      afterMutate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const bulkCandidates = useMemo(() => {
    if (selected.size === 0) return [];
    const first = items.find((r) => selected.has(r._id || ""));
    if (!first) return [];
    return buildFieldList(first).filter((f) => typeof first[f] !== "object");
  }, [selected, items]);

  const bulkType = useMemo(() => {
    const first = items.find((r) => selected.has(r._id || ""));
    if (!first) return "string" as "string" | "number" | "boolean";
    return (inferType(first[bulk.field]) as "string" | "number" | "boolean") || "string";
  }, [selected, items, bulk.field]);

  const viewEntries = useMemo(
    () =>
      Object.entries(viewRow || {}).filter(
        ([k]) => !HIDDEN_FIELDS.has(k) && !isIdField(k)
      ),
    [viewRow]
  );

  const viewTitle = useMemo(() => (viewRow ? pickPrimary(viewRow) || label : label), [viewRow, label]);

  const viewBadges = useMemo(() => {
    if (!viewRow) return [];
    const out: { label: string; acid?: boolean }[] = [];
    for (const f of BADGE_FIELDS) {
      const val = viewRow[f];
      if (val !== null && val !== undefined && val !== "") {
        out.push({ label: String(val), acid: f === "status" });
      }
    }
    if (viewRow.createdAt) out.push({ label: `created ${formatDateLike(String(viewRow.createdAt))}` });
    if (viewRow.updatedAt) out.push({ label: `updated ${formatDateLike(String(viewRow.updatedAt))}` });
    return out.slice(0, 6);
  }, [viewRow]);

  const handleBulkSet = async () => {
    if (selected.size === 0 || !bulk.field) return;
    setBusy(true);
    try {
      const ids = [...selected].join(",");
      let value: unknown = bulk.value;
      if (bulkType === "number") {
        value = Number(bulk.value);
        if (!Number.isFinite(value)) {
          toast.error("Invalid number value");
          setBusy(false);
          return;
        }
      } else if (bulkType === "boolean") {
        value = bulk.value === "true";
      }
      await apiCall(`/api/admin/collections/${collection}?ids=${ids}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [bulk.field]: value }),
      });
      toast.success(`Set ${bulk.field} on ${selected.size} records`);
      setBulk({ open: false, field: "", value: "" });
      afterMutate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const allPageSelected = pageItems.length > 0 && pageItems.every((r) => selected.has(r._id || ""));

  const toggleAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const r of pageItems) next.delete(r._id || "");
      } else {
        for (const r of pageItems) next.add(r._id || "");
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const input = (field: string) => {
    const type = fieldTypes[field] || "string";
    const value = form[field];
    if (type === "boolean") {
      return (
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => setField(field, e.target.checked)}
            className="checkbox"
          />
          <span className="text-sm text-ink2">enabled</span>
        </label>
      );
    }
    if (type === "json") {
      return (
        <textarea
          value={typeof value === "string" ? value : value ? JSON.stringify(value, null, 2) : ""}
          onChange={(e) => setField(field, e.target.value)}
          rows={5}
          className="form-input w-full font-mono text-xs"
          placeholder='{"key": "value"}'
        />
      );
    }
    if (type === "string" && typeof value === "string" && isContentValue(field, value)) {
      return (
        <textarea
          value={value}
          onChange={(e) => setField(field, e.target.value)}
          rows={6}
          className="form-textarea w-full"
        />
      );
    }
    return (
      <input
        type={type === "number" ? "number" : "text"}
        value={typeof value === "string" ? value : String(value ?? "")}
        onChange={(e) => setField(field, e.target.value)}
        className="form-input w-full"
      />
    );
  };

  return (
    <div className="panel">
      <div className="flex flex-wrap items-center gap-3 p-5 pb-0">
        <p className="panel-title" style={{ margin: 0 }}>
          {label}
        </p>
        <p className="td-mono td-sub">{items.length} records</p>
        <div className="ml-auto flex items-center gap-2">
          <div className="tb-search w-56">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
          </div>
          <button onClick={refetch} className="tb-btn" aria-label="Refresh">
            <RefreshCw />
          </button>
          {canWrite && (
            <button onClick={() => openEditor(null)} className="btn-modal btn-modal-save inline-flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" /> New
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : !data || items.length === 0 ? (
        <EmptyState title="No records found" subtitle="This collection is empty." />
      ) : pageItems.length === 0 ? (
        <EmptyState title="No results" subtitle="Try a different search." />
      ) : (
        <>
          {selected.size > 0 && (
            <div
              className="mx-5 mt-4 flex flex-wrap items-center gap-2 rounded-xl px-4 py-2.5"
              style={{ background: "var(--acid-dim)", border: "1px solid var(--acid-dim2)" }}
            >
              <CheckSquare className="h-4 w-4" style={{ color: "var(--acid)" }} />
              <p className="text-sm font-medium text-ink">{selected.size} selected</p>
              {canWrite && (
                <>
                  <button
                    onClick={() => setBulk({ open: true, field: bulkCandidates[0] || "", value: "" })}
                    className="pa-btn"
                  >
                    Set field…
                  </button>
                  <button onClick={() => setBulkDelete(true)} className="pa-btn" style={{ color: "#ef4444" }}>
                    Delete selected
                  </button>
                </>
              )}
              <button onClick={() => setSelected(new Set())} className="pa-btn ml-auto">
                <X className="h-3 w-3" /> Clear
              </button>
            </div>
          )}

          <div className="table-wrap">
            <table className="min-w-[640px]">
              <thead>
                <tr>
                  {canWrite && (
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleAllPage}
                        className="checkbox"
                        aria-label="Select all on page"
                      />
                    </th>
                  )}
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r, i) => {
                  const id = r._id || String(i);
                  const isSelected = selected.has(id);
                  return (
                    <tr key={id} className={isSelected ? "row-selected" : undefined}>
                      {canWrite && (
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(id)}
                            className="checkbox"
                            aria-label="Select row"
                          />
                        </td>
                      )}
                      {columns.map((c) => {
                        const v = r[c];
                        const isBool = typeof v === "boolean";
                        const isDate = (c === "createdAt" || c === "updatedAt") && typeof v === "string";
                        return (
                          <td key={c} title={typeof v === "string" ? v : undefined}>
                            {isBool ? (
                              <span className="status-pill">
                                <span className="sp-dot" style={{ background: v ? "var(--acid)" : "var(--ink4)" }} />
                                {String(v)}
                              </span>
                            ) : isDate ? (
                              <span className="td-mono">{new Date(v).toLocaleDateString()}</span>
                            ) : (
                              <span className={typeof v === "number" ? "td-mono" : undefined}>{valueText(v)}</span>
                            )}
                          </td>
                        );
                      })}
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setViewRow(r)}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {canWrite && (
                            <button
                              onClick={() => openEditor(r)}
                              className="tb-btn"
                              style={{ width: 30, height: 30, borderRadius: 8 }}
                              aria-label="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              onClick={() => setDeleteTarget(r)}
                              className="tb-btn"
                              style={{ width: 30, height: 30, borderRadius: 8 }}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-3 border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
              <p className="td-mono td-sub">
                Page {page} of {pageCount} · {filtered.length} shown
              </p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="pa-btn">
                  <ChevronLeft className="h-3 w-3" /> Prev
                </button>
                <button disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="pa-btn">
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {editor.open && (
        <div className="modal-overlay" onClick={() => setEditor({ row: null, open: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="flex min-w-0 items-center gap-3">
                <span className="view-icon">
                  <Pencil className="h-4 w-4" />
                </span>
                <h3 className="modal-title truncate">{editor.row ? `Edit ${label}` : `New ${label}`}</h3>
              </div>
              <button onClick={() => setEditor({ row: null, open: false })} className="modal-close" aria-label="Close">
                <span className="text-sm text-ink3">✕</span>
              </button>
            </div>
            <div className="modal-body max-h-[60vh] space-y-4 overflow-y-auto">
              {fieldList.length === 0 && <p className="text-sm text-ink2">No editable fields.</p>}
              {fieldList.map((f) => (
                <div key={f}>
                  <label className="form-label">{f}</label>
                  {input(f)}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditor({ row: null, open: false })} className="btn-modal btn-modal-cancel">
                Cancel
              </button>
              <button onClick={handleSave} disabled={busy} className="btn-modal btn-modal-save">
                {busy ? <Spinner className="h-3.5 w-3.5" /> : editor.row ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewRow && (
        <div className="modal-overlay" onClick={() => setViewRow(null)}>
          <div className="modal modal-view" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="flex min-w-0 items-center gap-3">
                <span className="view-icon">
                  <Eye className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="view-title truncate">{viewTitle}</h3>
                  <p className="view-sub">{label}</p>
                </div>
              </div>
              <button onClick={() => setViewRow(null)} className="modal-close" aria-label="Close">
                <span className="text-sm text-ink3">✕</span>
              </button>
            </div>
            <div className="modal-body max-h-[62vh] overflow-y-auto">
              {viewBadges.length > 0 && (
                <div className="view-badges mb-5">
                  {viewBadges.map((b, i) => (
                    <span key={i} className={b.acid ? "chip chip-acid" : "chip"}>
                      {b.label}
                    </span>
                  ))}
                </div>
              )}
              {viewEntries.map(([k, v]) => (
                <div key={k} className="view-field">
                  <span className="view-label">{k}</span>
                  <ViewValue k={k} v={v} />
                </div>
              ))}
            </div>
            <div className="modal-footer">
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
            </div>
          </div>
        </div>
      )}

      {bulk.open && (
        <div className="modal-overlay" onClick={() => setBulk({ ...bulk, open: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="flex min-w-0 items-center gap-3">
                <span className="view-icon">
                  <SlidersHorizontal className="h-4 w-4" />
                </span>
                <h3 className="modal-title truncate">Set field on {selected.size} records</h3>
              </div>
              <button
                onClick={() => setBulk({ ...bulk, open: false })}
                className="modal-close"
                aria-label="Close"
              >
                <span className="text-sm text-ink3">✕</span>
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="form-label">Field</label>
                <select
                  value={bulk.field}
                  onChange={(e) => setBulk({ ...bulk, field: e.target.value })}
                  className="form-input w-full"
                >
                  {bulkCandidates.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Value</label>
                {bulkType === "boolean" ? (
                  <select
                    value={bulk.value}
                    onChange={(e) => setBulk({ ...bulk, value: e.target.value })}
                    className="form-input w-full"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    type={bulkType === "number" ? "number" : "text"}
                    value={bulk.value}
                    onChange={(e) => setBulk({ ...bulk, value: e.target.value })}
                    className="form-input w-full"
                  />
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setBulk({ ...bulk, open: false })} className="btn-modal btn-modal-cancel">
                Cancel
              </button>
              <button onClick={handleBulkSet} disabled={busy || !bulk.field} className="btn-modal btn-modal-save">
                {busy ? <Spinner className="h-3.5 w-3.5" /> : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${label}`}
        message={`This will permanently delete this ${label.toLowerCase()} record. This cannot be undone.`}
        loading={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={bulkDelete}
        title={`Delete ${selected.size} records`}
        message="This will permanently delete all selected records. This cannot be undone."
        loading={busy}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDelete(false)}
      />
    </div>
  );
}
