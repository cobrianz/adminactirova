"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={cn("spinner", className)} aria-label="Loading" />;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display-head text-3xl leading-none text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-ink2">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, subtitle, actions, children, className = "" }: { title?: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("panel", className)}>
      {(title || actions) && (
        <div className="panel-head">
          <div className="min-w-0">
            {title && <h3 className="panel-title">{title}</h3>}
            {subtitle && <p className="panel-sub">{subtitle}</p>}
          </div>
          {actions && <div className="panel-actions shrink-0">{actions}</div>}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  );
}

const badgeColors: Record<string, string> = {
  active: "sp-active",
  pending: "sp-pending",
  done: "sp-done",
  paused: "sp-paused",
  cancel: "sp-cancel",
  green: "sp-active",
  red: "sp-cancel",
  amber: "sp-pending",
  slate: "sp-paused",
};

export function Badge({ color = "slate", children }: { color?: string; children: React.ReactNode }) {
  return (
    <span className={cn("status-pill", badgeColors[color] || badgeColors.slate)}>
      <span className="sp-dot" />
      {children}
    </span>
  );
}

export function StatCard({ label, value, icon, hint }: { label: string; value: React.ReactNode; icon?: React.ReactNode; hint?: string }) {
  return (
    <div className="stat-card fade-up">
      {icon && <div className="sc-icon bg-primary/10 text-primary">{icon}</div>}
      <p className="sc-label">{label}</p>
      <p className="sc-val">{value}</p>
      {hint && <p className="sc-change neutral">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 21h8M12 18v3" />
      </svg>
      <p>{title}</p>
      {subtitle && <span className="text-xs text-ink3">{subtitle}</span>}
    </div>
  );
}

export function ConfirmModal({ open, title, message, confirmLabel = "Delete", loading, onConfirm, onCancel }: { open: boolean; title: string; message: string; confirmLabel?: string; loading?: boolean; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onCancel} className="modal-close" aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="modal-body">
          <p className="text-sm text-ink2">{message}</p>
        </div>
        <div className="modal-footer">
          <button onClick={onCancel} className="btn-modal btn-modal-cancel">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="btn-modal btn-modal-danger">
            {loading ? <Spinner className="h-3.5 w-3.5" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function tableCell() {
  return "px-4 py-3 text-sm";
}
