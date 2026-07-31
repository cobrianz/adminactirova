"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Mail, Calendar, Zap, Star, Flame, BadgeCheck, CreditCard } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { Panel, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import { formatDate, timeAgo } from "@/lib/utils";

type UserDetail = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    email: string;
    role: string;
    status: string;
    emailVerified: boolean;
    isPremium: boolean;
    credits: number;
    xp: number;
    level: number;
    streak: number;
    createdAt: string;
    lastLogin: string | null;
    interests: string[];
    goals: string[];
    skillLevel: string;
    subscription: Record<string, unknown> | null;
    billingHistory: { date: string; amount: number; status: string; description: string }[];
    usage: Record<string, number>;
    achievements: string[];
  };
  library: { _id: string; title: string; topic: string; difficulty: string; progress: number; completed: boolean; createdAt: string }[];
  reports: { _id: string; title: string; course: string; status: string; createdAt: string }[];
  exams: number;
  chatCount: number;
};

const roleColor: Record<string, string> = { student: "green", instructor: "amber", admin: "done" };
const statusColor: Record<string, string> = { active: "active", pending: "pending", inactive: "paused", suspended: "cancel" };

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, refetch } = useApi<UserDetail>(`/api/admin/users/${id}`);
  const [saving, setSaving] = useState(false);
  const [creditsInput, setCreditsInput] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data?.user) return <EmptyState title="User not found" />;

  const u = data.user;
  const fullName = (u.name || `${u.firstName || ""} ${u.lastName || ""}`).trim() || u.email || "—";
  const displayName = fullName;

  const updateUser = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      await apiCall(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success("User updated");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiCall(`/api/admin/users/${u.id}`, { method: "DELETE" });
      toast.success("User deleted");
      router.push("/admin/users");
    } catch (e) {
      toast.error((e as Error).message);
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink2 hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to users
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="sb-avatar" style={{ width: 56, height: 56, fontSize: 18 }}>
              {displayName.charAt(0)}
              {displayName.split(" ")[1]?.charAt(0) || ""}
            </span>
            <div>
              <h1 className="display-head text-3xl leading-none sm:text-4xl">{displayName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge color={roleColor[u.role] || "slate"}>{u.role}</Badge>
                <Badge color={statusColor[u.status] || "slate"}>{u.status}</Badge>
                {u.isPremium && <Badge color="done">Premium</Badge>}
                {u.emailVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => setDeleteOpen(true)} disabled={saving} className="btn-modal btn-modal-danger">
            Delete user
          </button>
        </div>
      </div>

      <div className="mini-stats" style={{ borderRadius: 16, overflow: "hidden" }}>
        <div className="ms-cell">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-ink3" />
            <span className="ms-l">Email</span>
          </div>
          <p className="mt-2 truncate text-xs font-medium text-ink">{u.email}</p>
        </div>
        <div className="ms-cell">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-ink3" />
            <span className="ms-l">Joined</span>
          </div>
          <p className="mt-2 text-xs font-medium text-ink">{formatDate(u.createdAt)}</p>
        </div>
        <div className="ms-cell">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-ink3" />
            <span className="ms-l">Level {u.level}</span>
          </div>
          <p className="mt-2 text-xs font-medium text-ink">
            {u.xp} XP · {u.streak} day streak
          </p>
        </div>
        <div className="ms-cell">
          <div className="flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 text-ink3" />
            <span className="ms-l">Last login</span>
          </div>
          <p className="mt-2 text-xs font-medium text-ink">{u.lastLogin ? timeAgo(u.lastLogin) : "Never"}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Manage account">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Status</label>
                <select
                  value={u.status}
                  disabled={saving}
                  onChange={(e) => updateUser({ status: e.target.value })}
                  className="form-select"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className="form-label">Role</label>
                <select
                  value={u.role}
                  disabled={saving}
                  onChange={(e) => updateUser({ role: e.target.value })}
                  className="form-select"
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="form-label">Credits</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    defaultValue={u.credits}
                    onChange={(e) => setCreditsInput(Number(e.target.value))}
                    className="form-input"
                  />
                  <button
                    disabled={saving || creditsInput === null || creditsInput === u.credits}
                    onClick={() => updateUser({ credits: creditsInput })}
                    className="btn-modal btn-modal-save shrink-0"
                  >
                    Save
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">Premium</label>
                <button
                  disabled={saving}
                  onClick={() => updateUser({ isPremium: !u.isPremium })}
                  className="btn-modal btn-modal-cancel inline-flex w-full items-center justify-center gap-2"
                >
                  <Star className={`h-3.5 w-3.5 ${u.isPremium ? "text-primary" : "text-ink3"}`} />
                  {u.isPremium ? "Premium active" : "Not premium"}
                </button>
              </div>
            </div>
          </Panel>

          <Panel title="Billing history" subtitle="Most recent payments">
            {u.billingHistory.length === 0 ? (
              <EmptyState title="No billing history" />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u.billingHistory.map((b, i) => (
                      <tr key={i}>
                        <td>{b.description || "Payment"}</td>
                        <td className="td-mono">{formatDate(b.date)}</td>
                        <td>
                          <Badge color={b.status === "success" ? "green" : b.status === "failed" ? "red" : "amber"}>{b.status}</Badge>
                        </td>
                        <td className="td-mono text-right">${b.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Usage" subtitle="Feature usage by this user">
            {Object.keys(u.usage).length === 0 ? (
              <EmptyState title="No usage recorded" />
            ) : (
              <div className="mini-stats" style={{ borderRadius: 10, overflow: "hidden" }}>
                {Object.entries(u.usage).map(([key, value]) => (
                  <div key={key} className="ms-cell">
                    <p className="ms-n">{value}</p>
                    <p className="ms-l">{key}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={`Courses (${data.library.length})`}>
            {data.library.length === 0 ? (
              <EmptyState title="No courses" />
            ) : (
              <ul className="space-y-3">
                {data.library.map((c) => (
                  <li key={String(c._id)} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <p className="truncate text-xs font-semibold text-ink">{c.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="td-mono td-sub truncate">
                        {c.topic} · {c.difficulty}
                      </span>
                      <span className="td-mono td-acid">{Math.round((c.progress || 0) * 100)}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`Reports (${data.reports.length})`}>
            {data.reports.length === 0 ? (
              <EmptyState title="No reports" />
            ) : (
              <ul className="space-y-3">
                {data.reports.map((r) => (
                  <li key={String(r._id)} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <p className="truncate text-xs font-semibold text-ink">{r.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="td-mono td-sub truncate">{r.course || "—"}</span>
                      <Badge color={r.status === "published" ? "green" : "amber"}>{r.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Stats">
            <div className="mini-stats" style={{ borderRadius: 10, overflow: "hidden" }}>
              <div className="ms-cell">
                <CreditCard className="h-3.5 w-3.5 text-ink3" />
                <p className="ms-n">{data.exams}</p>
                <p className="ms-l">Exams</p>
              </div>
              <div className="ms-cell">
                <Zap className="h-3.5 w-3.5 text-ink3" />
                <p className="ms-n">{data.chatCount}</p>
                <p className="ms-l">Chats</p>
              </div>
              <div className="ms-cell">
                <Star className="h-3.5 w-3.5 text-ink3" />
                <p className="ms-n">{u.credits}</p>
                <p className="ms-l">Credits</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <ConfirmModal
        open={deleteOpen}
        title="Delete user"
        message={`This will permanently delete ${displayName} (${u.email}) and all associated data. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
