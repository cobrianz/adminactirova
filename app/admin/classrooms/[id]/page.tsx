"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Users, MessageSquare, ClipboardCheck, MessagesSquare, FolderOpen, StickyNote, ListChecks } from "lucide-react";
import { useApi } from "@/components/useApi";
import { Badge, EmptyState, Spinner } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";
import EnrollmentsTable from "@/components/classroom/EnrollmentsTable";
import AssignmentsTable from "@/components/classroom/AssignmentsTable";
import DiscussionsTable from "@/components/classroom/DiscussionsTable";
import MaterialsTable from "@/components/classroom/MaterialsTable";
import { formatDate } from "@/lib/utils";

type ClassroomDetail = {
  classroom: {
    id: string;
    name: string;
    description: string;
    subject: string;
    academicLevel: string;
    semester: string;
    durationWeeks: number;
    inviteCode: string;
    maxStudents: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    instructorName: string;
  };
  counts: Record<string, number>;
};

export default function ClassroomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useApi<ClassroomDetail>(`/api/admin/classrooms/${id}`);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data?.classroom) return <EmptyState title="Classroom not found" />;

  const c = data.classroom;
  const counts = data.counts;

  const stats = [
    { icon: Users, label: "Enrollments", value: counts.enrollments ?? 0 },
    { icon: ClipboardCheck, label: "Assignments", value: counts.assignments ?? 0 },
    { icon: MessagesSquare, label: "Discussions", value: counts.discussions ?? 0 },
    { icon: FolderOpen, label: "Materials", value: counts.materials ?? 0 },
    { icon: StickyNote, label: "Course Notes", value: counts.notes ?? 0 },
    { icon: ListChecks, label: "Student Progress", value: counts.progress ?? 0 },
    { icon: MessageSquare, label: "Messages", value: counts.messages ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/classrooms" className="mb-4 inline-flex items-center gap-1.5 text-xs text-ink2 hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to classrooms
        </Link>
        <h1 className="display-head text-3xl leading-none sm:text-4xl">{c.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge color={c.isActive ? "active" : "paused"}>{c.isActive ? "Active" : "Inactive"}</Badge>
          {c.subject && <Badge color="green">{c.subject}</Badge>}
          {c.academicLevel && <Badge color="slate">{c.academicLevel}</Badge>}
          {c.semester && <Badge color="slate">{c.semester}</Badge>}
        </div>
      </div>

      <div className="mini-stats" style={{ borderRadius: 16, overflow: "hidden" }}>
        <div className="ms-cell">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-ink3" />
            <span className="ms-l">Instructor</span>
          </div>
          <p className="mt-2 truncate text-xs font-medium text-ink">{c.instructorName}</p>
        </div>
        <div className="ms-cell">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-3.5 w-3.5 text-ink3" />
            <span className="ms-l">Capacity</span>
          </div>
          <p className="mt-2 text-xs font-medium text-ink">
            {c.maxStudents ? `${c.maxStudents} max` : "Unlimited"}
          </p>
        </div>
        <div className="ms-cell">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-ink3" />
            <span className="ms-l">Invite code</span>
          </div>
          <p className="mt-2 font-mono text-xs font-medium text-ink">{c.inviteCode || "—"}</p>
        </div>
        <div className="ms-cell">
          <div className="flex items-center gap-2">
            <ArrowLeft className="h-3.5 w-3.5 text-ink3" style={{ transform: "rotate(180deg)" }} />
            <span className="ms-l">Created</span>
          </div>
          <p className="mt-2 text-xs font-medium text-ink">{formatDate(c.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {stats.map((s) => (
          <div key={s.label} className="panel px-4 py-3">
            <div className="flex items-center gap-2">
              <s.icon className="h-3.5 w-3.5 text-ink3" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink3">{s.label}</span>
            </div>
            <p className="mt-1 text-xl font-bold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <ClassroomContentTabs classroomId={c.id} />
    </div>
  );
}

const CONTENT_TABS = [
  { key: "enrollments", label: "Enrollments" },
  { key: "assignments", label: "Assignments" },
  { key: "discussions", label: "Discussions" },
  { key: "coursematerials", label: "Course Materials" },
  { key: "discussionposts", label: "Discussion Posts" },
  { key: "coursenotes", label: "Course Notes" },
  { key: "studentprogresses", label: "Student Progress" },
  { key: "classroommessages", label: "Messages" },
] as const;

// The first four tabs use the same curated tables as their standalone
// /admin/* pages (proper labels, joins, actions), scoped to this classroom
// via classroomId. The rest fall back to the generic collection browser —
// no dedicated curated page exists for them yet.
function ClassroomContentTabs({ classroomId }: { classroomId: string }) {
  const [tab, setTab] = useState<(typeof CONTENT_TABS)[number]["key"]>("enrollments");

  return (
    <div className="space-y-4">
      <div className="flex w-fit flex-wrap gap-1 rounded-xl p-1" style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}>
        {CONTENT_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors"
            style={tab === t.key ? { background: "var(--acid)", color: "var(--bg)" } : { color: "var(--ink2)" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "enrollments" && <EnrollmentsTable classroomId={classroomId} />}
      {tab === "assignments" && <AssignmentsTable classroomId={classroomId} />}
      {tab === "discussions" && <DiscussionsTable classroomId={classroomId} />}
      {tab === "coursematerials" && <MaterialsTable classroomId={classroomId} />}
      {tab === "discussionposts" && (
        <CollectionTabs
          tabs={[{ key: "discussionposts", label: "Discussion Posts", filter: { field: "classroomId", value: classroomId }, defaultFields: ["content"] }]}
        />
      )}
      {tab === "coursenotes" && (
        <CollectionTabs
          tabs={[{ key: "coursenotes", label: "Course Notes", filter: { field: "classroomId", value: classroomId }, defaultFields: ["title", "weekNumber", "isPinned"] }]}
        />
      )}
      {tab === "studentprogresses" && (
        <CollectionTabs
          tabs={[{ key: "studentprogresses", label: "Student Progress", filter: { field: "classroomId", value: classroomId }, defaultFields: ["status", "progress", "score"] }]}
        />
      )}
      {tab === "classroommessages" && (
        <CollectionTabs
          tabs={[{ key: "classroommessages", label: "Messages", filter: { field: "classroomId", value: classroomId }, defaultFields: ["senderName", "senderRole", "content"] }]}
        />
      )}
    </div>
  );
}
