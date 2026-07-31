"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, Trash2, Eye, RefreshCw, X } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import { formatDate, timeAgo } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  isPremium: boolean;
  credits: number;
  xp: number;
  level: number;
  createdAt: string;
  lastLogin: string | null;
  courses: number;
  reports: number;
};

type UsersData = {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

const roleColor: Record<string, string> = { student: "green", instructor: "amber", admin: "done" };
const statusColor: Record<string, string> = { active: "active", pending: "pending", inactive: "paused", suspended: "cancel" };

const displayName = (u: UserRow | null | undefined) => (u?.name || u?.email) || "—";

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("limit", "20");

  const { data, loading, refetch } = useApi<UsersData>(`/api/admin/users?${params.toString()}`);

  const applyFilters = (newSearch: string, newRole: string, newStatus: string) => {
    setSearch(newSearch);
    setRole(newRole);
    setStatus(newStatus);
    setPage(1);
    setSelected(new Set());
  };

  const allPageSelected = useMemo(
    () => !!data && data.users.length > 0 && data.users.every((u) => selected.has(u.id)),
    [data, selected]
  );

  const toggleAllPage = () => {
    if (!data) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const u of data.users) next.delete(u.id);
      } else {
        for (const u of data.users) next.add(u.id);
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

  const handleBulkUpdate = async (patch: Record<string, unknown>, successMsg: string) => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      await apiCall(`/api/admin/users?ids=${[...selected].join(",")}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      toast.success(successMsg);
      setSelected(new Set());
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiCall(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("User deleted");
      setDeleteTarget(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkBusy(true);
    try {
      await apiCall(`/api/admin/users?ids=${[...selected].join(",")}`, { method: "DELETE" });
      toast.success(`Deleted ${selected.size} users`);
      setBulkDelete(false);
      setSelected(new Set());
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Users" subtitle={`${data?.total ?? "…"} registered users`} />

      <div className="panel">
        <div className="flex flex-wrap items-center gap-3 p-5 pb-0">
          <div className="tb-search min-w-56 flex-1">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <input
              value={search}
              onChange={(e) => applyFilters(e.target.value, role, status)}
              placeholder="Search name or email…"
            />
          </div>
          <select
            value={role}
            onChange={(e) => applyFilters(search, e.target.value, status)}
            className="form-select w-auto"
          >
            <option value="">All roles</option>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={status}
            onChange={(e) => applyFilters(search, role, e.target.value)}
            className="form-select w-auto"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <button onClick={refetch} className="tb-btn" aria-label="Refresh">
            <RefreshCw />
          </button>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : !data || data.users.length === 0 ? (
          <EmptyState title="No users found" subtitle="Try adjusting your filters." />
        ) : (
          <>
            {selected.size > 0 && (
              <div
                className="mx-5 mt-4 flex flex-wrap items-center gap-2 rounded-xl px-4 py-2.5"
                style={{ background: "var(--acid-dim)", border: "1px solid var(--acid-dim2)" }}
              >
                <p className="text-sm font-medium text-ink">{selected.size} selected</p>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleBulkUpdate({ role: e.target.value }, "Role updated");
                  }}
                  className="form-select w-auto py-1 text-xs"
                  disabled={bulkBusy}
                >
                  <option value="">Set role…</option>
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleBulkUpdate({ status: e.target.value }, "Status updated");
                  }}
                  className="form-select w-auto py-1 text-xs"
                  disabled={bulkBusy}
                >
                  <option value="">Set status…</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <button
                  onClick={() => setBulkDelete(true)}
                  className="pa-btn"
                  style={{ color: "#ef4444" }}
                  disabled={bulkBusy}
                >
                  Delete selected
                </button>
                <button onClick={() => setSelected(new Set())} className="pa-btn ml-auto">
                  <X className="h-3 w-3" /> Clear
                </button>
              </div>
            )}

            <div className="table-wrap">
              <table className="min-w-[820px]">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleAllPage}
                        className="checkbox"
                        aria-label="Select all on page"
                      />
                    </th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Credits</th>
                    <th>Level</th>
                    <th>Courses</th>
                    <th>Reports</th>
                    <th>Joined</th>
                    <th>Last login</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => {
                    const isSelected = selected.has(u.id);
                    return (
                      <tr key={u.id} className={isSelected ? "row-selected" : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(u.id)}
                            className="checkbox"
                            aria-label="Select row"
                          />
                        </td>
                        <td>
                          <Link href={`/admin/users/${u.id}`} className="group block">
                            <p className="font-medium text-ink group-hover:text-primary">
                              {displayName(u)}
                              {u.isPremium && <span className="ml-2 text-primary">★</span>}
                            </p>
                            <p className="td-sub">{u.email}</p>
                          </Link>
                        </td>
                        <td>
                          <Badge color={roleColor[u.role] || "slate"}>{u.role}</Badge>
                        </td>
                        <td>
                          <Badge color={statusColor[u.status] || "slate"}>{u.status}</Badge>
                        </td>
                        <td className="td-mono">{u.credits}</td>
                        <td className="td-mono">{u.level}</td>
                        <td className="td-mono">{u.courses}</td>
                        <td className="td-mono">{u.reports}</td>
                        <td className="td-mono">{formatDate(u.createdAt)}</td>
                        <td className="td-mono">{u.lastLogin ? timeAgo(u.lastLogin) : "—"}</td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button onClick={() => router.push(`/admin/users/${u.id}`)} className="tb-btn" style={{ width: 30, height: 30, borderRadius: 8 }} aria-label="View">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(u)} className="tb-btn" style={{ width: 30, height: 30, borderRadius: 8 }} aria-label="Delete">
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

            {data.pages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
                <p className="td-mono td-sub">
                  Page {data.page} of {data.pages} · {data.total} users
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="pa-btn"
                  >
                    <ChevronLeft className="h-3 w-3" /> Prev
                  </button>
                  <button
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="pa-btn"
                  >
                    Next <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete user"
        message={`This will permanently delete ${displayName(deleteTarget as UserRow)} and ALL their data (courses, reports, chats, notes, uploads, notifications, enrollments, messages and more). This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={bulkDelete}
        title={`Delete ${selected.size} users`}
        message="This will permanently delete all selected users and ALL their associated data. This cannot be undone."
        loading={bulkBusy}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDelete(false)}
      />
    </div>
  );
}
