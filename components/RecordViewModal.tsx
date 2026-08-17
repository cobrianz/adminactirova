"use client";

import React from "react";
import { Eye } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import MarkdownContent from "@/components/MarkdownContent";

function fieldLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

// Rough heuristic for "this long text field is actually markdown" — looks
// for markdown syntax rather than just length, so plain long strings (a
// pasted URL, a raw description) still render as plain text.
const MARKDOWN_HINT = /(^|\n)#{1,6}\s|\*\*[^*]+\*\*|(^|\n)[-*]\s|(^|\n)\d+\.\s|`[^`]+`|\[[^\]]+\]\([^)]+\)/;

function ViewFieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="view-value dim">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className="status-pill">
        <span className="sp-dot" style={{ background: value ? "var(--acid)" : "var(--ink4)" }} />
        {String(value)}
      </span>
    );
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return <span className="view-value">{formatDateTime(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="view-value dim">—</span>;
    if (value.every((v) => typeof v !== "object")) {
      return (
        <div className="chip-list">
          {value.map((v, i) => (
            <span key={i} className="chip">
              {String(v)}
            </span>
          ))}
        </div>
      );
    }
    return <span className="view-value">{value.length} items</span>;
  }
  if (typeof value === "object") {
    return <span className="view-value">{Object.keys(value as object).length} fields</span>;
  }
  if (typeof value === "string" && value.length > 60 && MARKDOWN_HINT.test(value)) {
    return <MarkdownContent>{value}</MarkdownContent>;
  }
  if (typeof value === "string" && value.length > 60) {
    return (
      <p className="view-value" style={{ whiteSpace: "pre-wrap" }}>
        {value}
      </p>
    );
  }
  return <span className="view-value mono">{String(value)}</span>;
}

/**
 * Shared "view details" modal — renders every field of a record with a
 * humanized label and a type-aware value (dates, booleans, arrays, long
 * text) instead of raw JSON. Used by CuratedTable and the classroom-content
 * pages so admins always have a full-detail view, not just table columns.
 */
export default function RecordViewModal({
  title,
  record,
  hiddenKeys = [],
  onClose,
  footer,
}: {
  title: string;
  record: Record<string, unknown> | null;
  hiddenKeys?: string[];
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  if (!record) return null;
  const hidden = new Set(["_id", "id", "__v", "password", ...hiddenKeys]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-view" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="flex min-w-0 items-center gap-3">
            <span className="view-icon">
              <Eye className="h-4 w-4" />
            </span>
            <h3 className="view-title truncate">{title}</h3>
          </div>
          <button onClick={onClose} className="modal-close" aria-label="Close">
            <span className="text-sm text-ink3">✕</span>
          </button>
        </div>
        <div className="modal-body max-h-[62vh] overflow-y-auto">
          {Object.entries(record)
            .filter(([k]) => !hidden.has(k))
            .map(([k, v]) => (
              <div key={k} className="view-field">
                <span className="view-label">{fieldLabel(k)}</span>
                <ViewFieldValue value={v} />
              </div>
            ))}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
