"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function usePageSlice<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pages);
  const slice = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );
  return { page: safePage, pages, count: items.length, slice, setPage };
}

export default function Paginate({
  page,
  pages,
  count,
  onPage,
  label = "records",
}: {
  page: number;
  pages: number;
  count: number;
  onPage: (p: number) => void;
  label?: string;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
      <p className="td-mono td-sub">
        Page {page} of {pages} · {count} {label}
      </p>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="pa-btn">
          <ChevronLeft className="h-3 w-3" /> Prev
        </button>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="pa-btn">
          Next <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
