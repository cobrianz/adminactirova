"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Users, MessageSquare, ClipboardCheck, MessagesSquare, FolderOpen, StickyNote, ListChecks } from "lucide-react";
import { useApi } from "@/components/useApi";
import { Badge, EmptyState, Spinner } from "@/components/ui";
import CollectionTabs from "@/components/CollectionTabs";
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

      <CollectionTabs
        tabs={[
          {
            key: "enrollments",
            label: "Enrollments",
            filter: { field: "classroomId", value: c.id },
            defaultFields: ["studentName", "status"],
          },
          {
            key: "assignments",
            label: "Assignments",
            filter: { field: "classroomId", value: c.id },
            defaultFields: ["title", "type", "status", "dueDate"],
          },
          {
            key: "discussions",
            label: "Discussions",
            filter: { field: "classroomId", value: c.id },
            defaultFields: ["title", "isPinned"],
          },
          {
            key: "discussionposts",
            label: "Discussion Posts",
            filter: { field: "classroomId", value: c.id },
            defaultFields: ["content"],
          },
          {
            key: "coursematerials",
            label: "Course Materials",
            filter: { field: "classroomId", value: c.id },
            defaultFields: ["title", "weekNumber", "category"],
          },
          {
            key: "coursenotes",
            label: "Course Notes",
            filter: { field: "classroomId", value: c.id },
            defaultFields: ["title", "weekNumber", "isPinned"],
          },
          {
            key: "studentprogresses",
            label: "Student Progress",
            filter: { field: "classroomId", value: c.id },
            defaultFields: ["status", "progress", "score"],
          },
          {
            key: "classroommessages",
            label: "Messages",
            filter: { field: "classroomId", value: c.id },
            defaultFields: ["senderName", "senderRole", "content"],
          },
        ]}
      />
    </div>
  );
}
