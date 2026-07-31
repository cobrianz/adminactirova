"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Eye, Trash2, RefreshCw } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate from "@/components/Paginate";
import { formatDate } from "@/lib/utils";

type Classroom = {
  id: string;
  name: string;
  subject: string;
  academicLevel: string;
  semester: string;
  durationWeeks: number;
  isActive: boolean;
  inviteCode: string;
  maxStudents: number;
  students: number;
  instructorName: string;
  createdAt: string;
};

type ClassroomsData = {
  classrooms: Classroom[];
  total: number;
  page: number;
  pages: number;
};

export default function ClassroomsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", "20");
  const { data, loading, refetch } = useApi<ClassroomsData>(`/api/admin/classrooms?${params.toString()}`);
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiCall(`/api/admin/collections/classrooms?id=${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Classroom deleted");
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
      <PageHeader title="Classrooms" subtitle={`${data?.total ?? "…"} classrooms`} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="tb-search min-w-56 flex-1">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search classrooms…"
          />
        </div>
        <button onClick={refetch} className="tb-btn" aria-label="Refresh">
          <RefreshCw />
        </button>
      </div>

      <div className="panel">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        ) : !data || data.classrooms.length === 0 ? (
          <EmptyState title="No classrooms found" subtitle="Classrooms created by instructors will appear here." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="min-w-[720px]">
                <thead>
                  <tr>
                    <th>Classroom</th>
                    <th>Subject</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Students</th>
                    <th>Instructor</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.classrooms.map((c) => (
                    <tr key={c.id}>
                      <td className="max-w-72">
                        <Link href={`/admin/classrooms/${c.id}`} className="group block">
                          <p className="truncate font-medium text-ink group-hover:text-primary">{c.name}</p>
                          <p className="td-sub font-mono">{c.inviteCode}</p>
                        </Link>
                      </td>
                      <td>{c.subject || "—"}</td>
                      <td>
                        {[c.academicLevel, c.semester].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td>
                        <Badge color={c.isActive ? "active" : "paused"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="td-mono">
                        {c.students}
                        {c.maxStudents ? ` / ${c.maxStudents}` : ""}
                      </td>
                      <td>{c.instructorName}</td>
                      <td className="td-mono">{formatDate(c.createdAt)}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => router.push(`/admin/classrooms/${c.id}`)}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="tb-btn"
                            style={{ width: 30, height: 30, borderRadius: 8 }}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Paginate page={data.page} pages={data.pages} count={data.total} onPage={setPage} label="classrooms" />
          </>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete classroom"
        message={`This will permanently delete "${deleteTarget?.name}". This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
