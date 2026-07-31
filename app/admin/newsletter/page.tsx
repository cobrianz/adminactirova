"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate from "@/components/Paginate";
import { formatDate } from "@/lib/utils";

type Subscriber = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
};

type NewsletterData = {
  subscribers: Subscriber[];
  total: number;
  subscribed: number;
  page: number;
  pages: number;
};

export default function NewsletterPage() {
  const [page, setPage] = useState(1);
  const { data, loading, refetch } = useApi<NewsletterData>(`/api/admin/newsletter?page=${page}&limit=20`);
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiCall("/api/admin/newsletter", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteTarget.email }),
      });
      toast.success("Subscriber removed");
      setDeleteTarget(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const rows = [["email", "status", "subscribed_at"], ...data.subscribers.map((s) => [s.email, s.status, formatDate(s.createdAt)])];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Newsletter"
        subtitle={`${data?.subscribed ?? "…"} active subscribers of ${data?.total ?? "…"} total`}
        actions={
          <button onClick={exportCsv} className="btn-modal btn-modal-cancel inline-flex items-center gap-2">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        }
      />

      <div className="panel">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : !data || data.subscribers.length === 0 ? (
          <EmptyState title="No subscribers yet" subtitle="Newsletter signups will appear here." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="min-w-[520px]">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Subscribed</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscribers.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium text-ink">{s.email}</td>
                      <td>
                        <Badge color={s.status === "subscribed" ? "green" : "slate"}>{s.status}</Badge>
                      </td>
                      <td className="td-mono">{formatDate(s.createdAt)}</td>
                      <td>
                        <div className="flex justify-end">
                          <button onClick={() => setDeleteTarget(s)} className="tb-btn" style={{ width: 30, height: 30, borderRadius: 8 }} aria-label="Remove">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Paginate page={data.page} pages={data.pages} count={data.total} onPage={setPage} label="subscribers" />
          </>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Remove subscriber"
        message={`This will unsubscribe ${deleteTarget?.email}.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
