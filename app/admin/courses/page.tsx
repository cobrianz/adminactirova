"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Search, Trash2, RefreshCw } from "lucide-react";
import { useApi, apiCall } from "@/components/useApi";
import { PageHeader, Badge, EmptyState, Spinner, ConfirmModal } from "@/components/ui";
import Paginate from "@/components/Paginate";
import { formatDate } from "@/lib/utils";

type LibraryCourse = {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  progress: number;
  completed: boolean;
  createdAt: string;
  owner: string;
  email: string;
};

type MarketplaceCourse = {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  isPremium: boolean;
  published: boolean;
  enrolled: number;
  createdAt: string;
};

type CoursesData = {
  library?: LibraryCourse[];
  marketplace?: MarketplaceCourse[];
  libraryTotal?: number;
  libraryPages?: number;
  marketplaceTotal?: number;
  marketplacePages?: number;
};

export default function CoursesPage() {
  const [kind, setKind] = useState<"all" | "library" | "marketplace">("marketplace");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams();
  params.set("kind", kind);
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("limit", "20");
  const { data, loading, refetch } = useApi<CoursesData>(`/api/admin/courses?${params.toString()}`);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiCall(`/api/admin/courses/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Course deleted");
      setDeleteTarget(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const marketplace = data?.marketplace ?? [];
  const library = data?.library ?? [];

  return (
    <div>
      <PageHeader title="Courses" subtitle="Personalized and marketplace courses" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="theme-seg">
          {(["all", "marketplace", "library"] as const).map((k) => (
            <button
              key={k}
              className={kind === k ? "active" : ""}
              onClick={() => {
                setKind(k);
                setPage(1);
              }}
            >
              {k === "all" ? "All" : k === "marketplace" ? "Marketplace" : "Personalized"}
            </button>
          ))}
        </div>
        <div className="tb-search min-w-56 flex-1">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search courses…"
          />
        </div>
        <button onClick={refetch} className="tb-btn" aria-label="Refresh">
          <RefreshCw />
        </button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : kind === "library" ? (
        <div className="panel">
          {library.length === 0 ? (
            <EmptyState title="No personalized courses found" />
          ) : (
            <>
              <div className="table-wrap">
                <table className="min-w-[720px]">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Topic</th>
                      <th>Difficulty</th>
                      <th>Progress</th>
                      <th>Owner</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {library.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <p className="font-medium text-ink">{c.title}</p>
                          {c.completed && <Badge color="green">Completed</Badge>}
                        </td>
                        <td>{c.topic}</td>
                        <td>{c.difficulty}</td>
                        <td className="td-mono">{Math.round((c.progress || 0) * 100)}%</td>
                        <td>
                          <p className="text-ink">{c.owner}</p>
                          <p className="td-sub">{c.email}</p>
                        </td>
                        <td className="td-mono">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginate
                page={page}
                pages={data?.libraryPages || 1}
                count={data?.libraryTotal || 0}
                onPage={setPage}
                label="courses"
              />
            </>
          )}
        </div>
      ) : (
        <div className="panel">
          {marketplace.length === 0 ? (
            <EmptyState title="No marketplace courses found" />
          ) : (
            <>
              <div className="table-wrap">
                <table className="min-w-[820px]">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Category</th>
                      <th>Level</th>
                      <th>Price</th>
                      <th>Enrolled</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketplace.map((c) => (
                      <tr key={c.id}>
                        <td className="max-w-72">
                          <p className="truncate font-medium text-ink">{c.title}</p>
                          <p className="td-sub truncate">{c.description}</p>
                        </td>
                        <td>{c.category}</td>
                        <td>{c.level}</td>
                        <td className="td-mono">${c.price}</td>
                        <td className="td-mono">{c.enrolled}</td>
                        <td>
                          <div className="flex flex-col gap-1">
                            <Badge color={c.published ? "green" : "slate"}>{c.published ? "Published" : "Draft"}</Badge>
                            {c.isPremium && <Badge color="done">Premium</Badge>}
                          </div>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={async () => {
                                try {
                                  await apiCall(`/api/admin/courses/${c.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ published: !c.published }),
                                  });
                                  toast.success(c.published ? "Course unpublished" : "Course published");
                                  refetch();
                                } catch (e) {
                                  toast.error((e as Error).message);
                                }
                              }}
                              className="pa-btn"
                            >
                              {c.published ? "Unpublish" : "Publish"}
                            </button>
                            <button onClick={() => setDeleteTarget({ id: c.id, title: c.title })} className="tb-btn" style={{ width: 30, height: 30, borderRadius: 8 }} aria-label="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginate
                page={page}
                pages={data?.marketplacePages || 1}
                count={data?.marketplaceTotal || 0}
                onPage={setPage}
                label="courses"
              />
            </>
          )}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete course"
        message={`This will permanently delete "${deleteTarget?.title}" and remove all enrollments. This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
