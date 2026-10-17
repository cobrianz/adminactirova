"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ShieldCheck, Shield, RefreshCw, Ban, CheckCircle2 } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Panel, Badge, EmptyState, Spinner, ConfirmModal, StatCard } from "@/components/ui";
import { useAuth } from "@/components/AuthContext";
import { formatDate, timeAgo, initials } from "@/lib/utils";

type AdminRow = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  adminLevel: "admin" | "superadmin";
  lastLogin: string | null;
  createdAt: string | null;
  isSelf: boolean;
};

type AdminsData = { admins: AdminRow[]; superAdminCount: number; currentAdminLevel: string };

export default function AdminsPage() {
  const { admin: me } = useAuth();
  const { data, loading, refetch } = useApi<AdminsData>("/api/admin/admins");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminRow | null>(null);
  const isSuperAdmin = me?.adminLevel === "superadmin";

  const admins = data?.admins || [];
  const activeCount = admins.filter((a) => a.status !== "suspended").length;

  const setLevel = async (row: AdminRow, adminLevel: "admin" | "superadmin") => {
    setBusyId(row.id);
    try {
      await apiCall(`/api/admin/admins/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminLevel }),
      });
      toast.success(`${row.email} is now ${adminLevel === "superadmin" ? "a super admin" : "a standard admin"}`);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (row: AdminRow) => {
    if (row.status === "suspended") {
      setBusyId(row.id);
      try {
        await apiCall(`/api/admin/admins/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
        toast.success(`${row.email} reactivated`);
        refetch();
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusyId(null);
      }
    } else {
      setSuspendTarget(row);
    }
  };

  const confirmSuspend = async () => {
    if (!suspendTarget) return;
    setBusyId(suspendTarget.id);
    try {
      await apiCall(`/api/admin/admins/${suspendTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "suspended" }),
      });
      toast.success(`${suspendTarget.email} suspended`);
      setSuspendTarget(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Admins"
        subtitle="Manage who has panel access and at what permission level"
        actions={
          <button onClick={refetch} className="tb-btn" aria-label="Refresh">
            <RefreshCw />
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Admins" value={admins.length} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="Super Admins" value={data?.superAdminCount ?? 0} icon={<Shield className="h-4 w-4" />} />
        <StatCard label="Active" value={activeCount} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      {!isSuperAdmin && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: "var(--orange-dim)", border: "1px solid var(--orange)", color: "var(--ink2)" }}>
          You&apos;re signed in as a standard admin — permission changes are read-only for you. Ask a super admin to make changes here.
        </div>
      )}

      <Panel title="Admin accounts" subtitle="Everyone with role = admin on the platform">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : admins.length === 0 ? (
          <EmptyState title="No admins found" />
        ) : (
          <div className="table-wrap">
            <table className="min-w-[760px]">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="sb-avatar" style={{ width: 32, height: 32 }}>
                          {initials(a.name.split(/\s+/)[0] || a.firstName, a.name.split(/\s+/).slice(1).join(" ") || a.lastName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {a.name || a.email}
                            {a.isSelf && <span className="ml-1.5 text-xs text-ink3">(you)</span>}
                          </p>
                          <p className="td-sub truncate">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {a.adminLevel === "superadmin" ? (
                        <Badge color="done">Super admin</Badge>
                      ) : (
                        <Badge color="slate">Admin</Badge>
                      )}
                    </td>
                    <td>
                      <Badge color={a.status === "suspended" ? "red" : "green"}>{a.status === "suspended" ? "Suspended" : "Active"}</Badge>
                    </td>
                    <td className="td-mono">{timeAgo(a.lastLogin)}</td>
                    <td className="td-mono">{formatDate(a.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        {isSuperAdmin && !a.isSelf && (
                          <>
                            <button
                              onClick={() => setLevel(a, a.adminLevel === "superadmin" ? "admin" : "superadmin")}
                              disabled={busyId === a.id}
                              className="pa-btn"
                              title={a.adminLevel === "superadmin" ? "Demote to standard admin" : "Promote to super admin"}
                            >
                              {a.adminLevel === "superadmin" ? "Demote" : "Promote"}
                            </button>
                            <button
                              onClick={() => toggleStatus(a)}
                              disabled={busyId === a.id}
                              className="tb-btn"
                              style={{ width: 30, height: 30, borderRadius: 8 }}
                              aria-label={a.status === "suspended" ? "Reactivate" : "Suspend"}
                              title={a.status === "suspended" ? "Reactivate" : "Suspend"}
                            >
                              {a.status === "suspended" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="mt-4 text-xs text-ink3">
        To grant someone panel access in the first place, promote them to the &quot;admin&quot; role from the{" "}
        <Link href="/admin/users" className="underline">
          Users
        </Link>{" "}
        page — super admin only.
      </p>

      <ConfirmModal
        open={!!suspendTarget}
        title="Suspend admin"
        message={`This will immediately revoke panel access for ${suspendTarget?.email}. They can be reactivated at any time.`}
        confirmLabel="Suspend"
        loading={busyId === suspendTarget?.id}
        onConfirm={confirmSuspend}
        onCancel={() => setSuspendTarget(null)}
      />
    </div>
  );
}
