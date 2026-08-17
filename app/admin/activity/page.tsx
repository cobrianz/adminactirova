"use client";

import React, { useState } from "react";
import { RefreshCw, History, PlusCircle, Pencil, Trash2, ShieldCheck, Ban } from "lucide-react";
import { useApi } from "@/components/useApi";
import { PageHeader, Panel, Badge, EmptyState, Spinner } from "@/components/ui";
import Paginate from "@/components/Paginate";
import { formatDateTime, timeAgo } from "@/lib/utils";

type ActivityEntry = {
  id: string;
  adminEmail: string;
  adminName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  summary: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

type ActivityData = {
  entries: ActivityEntry[];
  total: number;
  page: number;
  pages: number;
  filters: { admins: string[]; resources: string[] };
};

const ACTION_ICON: Record<string, React.ElementType> = {
  create: PlusCircle,
  update: Pencil,
  bulk_update: Pencil,
  delete: Trash2,
  bulk_delete: Trash2,
  role_change: ShieldCheck,
  status_change: Ban,
  permission_change: ShieldCheck,
};

// Badge only recognizes these keys (see components/ui.tsx badgeColors) — any
// other value silently falls back to slate, so stick to the supported set.
const ACTION_COLOR: Record<string, string> = {
  create: "green",
  update: "paused",
  bulk_update: "paused",
  delete: "red",
  bulk_delete: "red",
  role_change: "done",
  status_change: "amber",
  permission_change: "done",
};

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [adminFilter, setAdminFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "30");
  if (adminFilter) params.set("admin", adminFilter);
  if (resourceFilter) params.set("resource", resourceFilter);

  const { data, loading, refetch } = useApi<ActivityData>(`/api/admin/activity?${params.toString()}`);
  const entries = data?.entries || [];

  return (
    <div>
      <PageHeader
        title="Activity Log"
        subtitle="Every create, update, delete, and permission change made in this panel"
        actions={
          <button onClick={refetch} className="tb-btn" aria-label="Refresh">
            <RefreshCw />
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={adminFilter}
          onChange={(e) => {
            setAdminFilter(e.target.value);
            setPage(1);
          }}
          className="form-input w-auto"
        >
          <option value="">All admins</option>
          {(data?.filters.admins || []).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => {
            setResourceFilter(e.target.value);
            setPage(1);
          }}
          className="form-input w-auto"
        >
          <option value="">All resources</option>
          {(data?.filters.resources || []).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <Panel>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState title="No activity recorded" subtitle="Admin actions will show up here as they happen." />
        ) : (
          <>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {entries.map((e) => {
                const Icon = ACTION_ICON[e.action] || History;
                return (
                  <div key={e.id} className="flex items-start gap-3 px-5 py-4">
                    <span className="view-icon shrink-0">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">
                        <span className="font-semibold">{e.adminName}</span>{" "}
                        <span className="text-ink2">{e.summary || `${e.action} on ${e.resource}`}</span>
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge color={ACTION_COLOR[e.action] || "slate"}>{e.action.replace(/_/g, " ")}</Badge>
                        <span className="td-mono td-sub">{e.resource}</span>
                        <span className="td-mono td-sub" title={formatDateTime(e.createdAt)}>
                          {timeAgo(e.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <Paginate page={page} pages={data?.pages || 1} count={data?.total || 0} onPage={setPage} label="events" />
          </>
        )}
      </Panel>
    </div>
  );
}
