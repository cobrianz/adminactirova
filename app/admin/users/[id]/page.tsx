"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Mail, Calendar, Zap, Star, Flame, BadgeCheck, CreditCard, Award, ShoppingBag, Layers, School, FileText, GraduationCap } from "lucide-react";
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
    interestCategories: string[];
    goals: string[];
    skillLevel: string;
    timeCommitment: string;
    ageGroup: string;
    educationLevel: string;
    learningStyle: string;
    onboardingCompleted: boolean;
    longestStreak: number;
    dailyXp: number;
    dailyXpDate: string;
    settings: Record<string, unknown>;
    subscription: Record<string, unknown> | null;
    billingHistory: { date: string; amount: number; status: string; description: string }[];
    usage: Record<string, number>;
    purchasedItems: { itemType: string; purchaseDate: string; reference?: string; courseTitle?: string; accessExpiresAt?: string }[];
    achievements: { badgeId: string; name: string; description?: string; rarity?: string; earnedAt: string }[];
  };
  library: { _id: string; title: string; topic: string; difficulty: string; progress: number; completed: boolean; createdAt: string }[];
  reports: { _id: string; title: string; course: string; status: string; createdAt: string }[];
  quizzes: { _id: string; title: string; course: string; difficulty: string; createdAt: string | null; attempts: number; bestScore: number }[];
  flashcards: { _id: string; title: string; topic: string; difficulty: string; totalCards: number; progress: number; completed: boolean; createdAt: string | null; lastAccessed: string | null }[];
  classes: { id: string; classroomId: string; name: string; subject: string; instructor: string; status: string; joinedAt: string | null }[];
  assignments: { id: string; title: string; className: string; status: string; score: number | null; progress: number; updatedAt: string | null }[];
  pdfs: { _id: string; fileName: string; fileSizeMB: string | number; pageCount: number; createdAt: string | null }[];
  certificates: { _id: string; title: string; createdAt: string | null }[];
  notes: { _id: string; title: string; content: string; createdAt: string | null }[];
  chats: { _id: string; topic: string; createdAt: string | null; lastMessageAt: string | null }[];
  studyPlans: { _id: string; title: string; topic: string; progress: number; createdAt: string | null }[];
  exams: number;
  chatCount: number;
};

const roleColor: Record<string, string> = { student: "green", instructor: "amber", admin: "done" };
const statusColor: Record<string, string> = { active: "active", pending: "pending", inactive: "paused", suspended: "cancel" };
const rarityColor: Record<string, string> = { common: "slate", rare: "blue", epic: "purple", legendary: "amber" };

const ITEM_LABELS: Record<string, string> = {
  course_generation: "Course generation",
  report_generation: "Report generation",
  exam_generation: "Exam generation",
  flashcard_generation: "Flashcard generation",
  career_tools: "Career tools",
  marketplace_course: "Marketplace course",
};

function Chips({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-xs text-ink3">None</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className="rounded-full border px-2 py-0.5 text-[11px] text-ink2"
          style={{ borderColor: "var(--border)" }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function MiniList({
  items,
  empty,
  render,
}: {
  items: unknown[];
  empty: string;
  render: (item: unknown, i: number) => React.ReactNode;
}) {
  if (items.length === 0) return <EmptyState title={empty} />;
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
          {render(item, i)}
        </li>
      ))}
    </ul>
  );
}

function classStatusColor(status: string): string {
  if (status === "active") return "green";
  if (status === "pending") return "amber";
  if (["inactive", "expired", "suspended"].includes(status)) return "red";
  return "slate";
}

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

      <div className="mt-6 space-y-6">
        <div className="space-y-6">
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

          <Panel title="Learning profile" subtitle="Onboarding and preference data">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Skill level</label>
                <p className="text-sm font-medium capitalize text-ink">{u.skillLevel || "Not set"}</p>
              </div>
              <div>
                <label className="form-label">Learning style</label>
                <p className="text-sm font-medium capitalize text-ink">{u.learningStyle || "Not set"}</p>
              </div>
              <div>
                <label className="form-label">Time commitment</label>
                <p className="text-sm font-medium capitalize text-ink">{u.timeCommitment || "Not set"}</p>
              </div>
              <div>
                <label className="form-label">Age group</label>
                <p className="text-sm font-medium capitalize text-ink">{u.ageGroup || "Not set"}</p>
              </div>
              <div>
                <label className="form-label">Education level</label>
                <p className="text-sm font-medium capitalize text-ink">{u.educationLevel || "Not set"}</p>
              </div>
              <div>
                <label className="form-label">Onboarding</label>
                <p className="text-sm font-medium text-ink">
                  <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${u.onboardingCompleted ? "bg-green-500" : "bg-amber-400"}`} />
                  {u.onboardingCompleted ? "Completed" : "Not completed"}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <label className="form-label">Interests</label>
              <Chips items={u.interests} />
            </div>
            {u.interestCategories.length > 0 && (
              <div className="mt-4">
                <label className="form-label">Interest categories</label>
                <Chips items={u.interestCategories} />
              </div>
            )}
            <div className="mt-4">
              <label className="form-label">Goals</label>
              <Chips items={u.goals} />
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
              <div className="ms-cell">
                <Flame className="h-3.5 w-3.5 text-ink3" />
                <p className="ms-n">{u.longestStreak}</p>
                <p className="ms-l">Longest streak</p>
              </div>
              <div className="ms-cell">
                <Zap className="h-3.5 w-3.5 text-ink3" />
                <p className="ms-n">{u.dailyXp}</p>
                <p className="ms-l">Daily XP</p>
              </div>
              <div className="ms-cell">
                <GraduationCap className="h-3.5 w-3.5 text-ink3" />
                <p className="ms-n">{data.quizzes.length}</p>
                <p className="ms-l">Quizzes</p>
              </div>
              <div className="ms-cell">
                <Layers className="h-3.5 w-3.5 text-ink3" />
                <p className="ms-n">{data.flashcards.length}</p>
                <p className="ms-l">Card sets</p>
              </div>
              <div className="ms-cell">
                <School className="h-3.5 w-3.5 text-ink3" />
                <p className="ms-n">{data.classes.length}</p>
                <p className="ms-l">Classes</p>
              </div>
              <div className="ms-cell">
                <FileText className="h-3.5 w-3.5 text-ink3" />
                <p className="ms-n">{data.pdfs.length}</p>
                <p className="ms-l">PDFs</p>
              </div>
            </div>
          </Panel>

          <Panel title={`Achievements (${u.achievements.length})`}>
            {u.achievements.length === 0 ? (
              <EmptyState title="No achievements" />
            ) : (
              <ul className="space-y-2">
                {u.achievements.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--acid-dim)" }}>
                      <Award className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{a.name}</p>
                      {a.description && <p className="td-sub mt-0.5 line-clamp-2">{a.description}</p>}
                      <div className="mt-1 flex items-center gap-2">
                        <Badge color={rarityColor[a.rarity || "common"] || "slate"}>{a.rarity || "common"}</Badge>
                        <span className="td-mono td-sub">{formatDate(a.earnedAt)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`Purchases (${u.purchasedItems.length})`}>
            {u.purchasedItems.length === 0 ? (
              <EmptyState title="No purchases" />
            ) : (
              <ul className="space-y-2">
                {u.purchasedItems.map((p, i) => (
                  <li key={i} className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                      <p className="truncate text-xs font-semibold text-ink">
                        {p.courseTitle || ITEM_LABELS[p.itemType] || p.itemType}
                      </p>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="td-mono td-sub">{formatDate(p.purchaseDate)}</span>
                      {p.accessExpiresAt && (
                        <span className="td-mono td-sub">Expires {formatDate(p.accessExpiresAt)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <Panel title={`Classes (${data.classes.length})`} subtitle="Classrooms the user is enrolled in">
          <MiniList
            items={data.classes}
            empty="No classes"
            render={(item) => {
              const c = item as UserDetail["classes"][number];
              return (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-ink">{c.name}</p>
                    <Badge color={classStatusColor(c.status)}>{c.status}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {c.subject && <span className="td-mono td-sub truncate">{c.subject}</span>}
                    {c.instructor && (
                      <span className="td-mono td-sub truncate">
                        <School className="mr-1 inline h-3 w-3" />
                        {c.instructor}
                      </span>
                    )}
                    {c.joinedAt && <span className="td-mono td-sub">joined {formatDate(c.joinedAt)}</span>}
                  </div>
                </div>
              );
            }}
          />
        </Panel>

        <Panel title={`Assignments (${data.assignments.length})`} subtitle="Assignment progress in classes">
          <MiniList
            items={data.assignments}
            empty="No assignments"
            render={(item) => {
              const a = item as UserDetail["assignments"][number];
              return (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-ink">{a.title}</p>
                    <span className="td-mono td-sub">
                      {a.score !== null ? `${a.score}%` : `${a.progress}%`}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {a.className && <span className="td-mono td-sub truncate">{a.className}</span>}
                    <Badge color={classStatusColor(a.status)}>{a.status}</Badge>
                    {a.updatedAt && <span className="td-mono td-sub">updated {timeAgo(a.updatedAt)}</span>}
                  </div>
                </div>
              );
            }}
          />
        </Panel>

        <Panel title={`Quizzes (${data.quizzes.length})`} subtitle="Generated quizzes and results">
          <MiniList
            items={data.quizzes}
            empty="No quizzes"
            render={(item) => {
              const q = item as UserDetail["quizzes"][number];
              return (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-ink">{q.title}</p>
                    <span className="td-mono td-acid">{q.bestScore}%</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {q.course && <span className="td-mono td-sub truncate">{q.course}</span>}
                    {q.difficulty && <span className="chip">{q.difficulty}</span>}
                    <span className="td-mono td-sub">{q.attempts} attempt{q.attempts === 1 ? "" : "s"}</span>
                  </div>
                </div>
              );
            }}
          />
        </Panel>

        <Panel title={`Flashcards (${data.flashcards.length})`} subtitle="Flashcard sets">
          <MiniList
            items={data.flashcards}
            empty="No flashcard sets"
            render={(item) => {
              const f = item as UserDetail["flashcards"][number];
              return (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-ink">{f.title}</p>
                    <span className="td-mono td-sub">{f.totalCards} cards</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {f.topic && <span className="td-mono td-sub truncate">{f.topic}</span>}
                    {f.difficulty && <span className="chip">{f.difficulty}</span>}
                    {f.completed ? <Badge color="green">Completed</Badge> : null}
                  </div>
                </div>
              );
            }}
          />
        </Panel>

        <Panel title={`Study plans (${data.studyPlans.length})`}>
          <MiniList
            items={data.studyPlans}
            empty="No study plans"
            render={(item) => {
              const s = item as UserDetail["studyPlans"][number];
              return (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-ink">{s.title}</p>
                    <span className="td-mono td-acid">{Math.round(s.progress * 100)}%</span>
                  </div>
                  {s.topic && <p className="td-mono td-sub mt-1.5 truncate">{s.topic}</p>}
                </div>
              );
            }}
          />
        </Panel>

        <Panel title={`PDF documents (${data.pdfs.length})`}>
          <MiniList
            items={data.pdfs}
            empty="No PDF documents"
            render={(item) => {
              const p = item as UserDetail["pdfs"][number];
              return (
                <div>
                  <p className="truncate text-xs font-semibold text-ink">{p.fileName}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="td-mono td-sub">{p.pageCount} pages</span>
                    {p.fileSizeMB && <span className="td-mono td-sub">{p.fileSizeMB} MB</span>}
                    {p.createdAt && <span className="td-mono td-sub">{formatDate(p.createdAt)}</span>}
                  </div>
                </div>
              );
            }}
          />
        </Panel>

        <Panel title={`Notes (${data.notes.length})`}>
          <MiniList
            items={data.notes}
            empty="No notes"
            render={(item) => {
              const n = item as UserDetail["notes"][number];
              return (
                <div>
                  <p className="truncate text-xs font-semibold text-ink">{n.title}</p>
                  {n.content && <p className="td-sub mt-1 line-clamp-2">{n.content}</p>}
                  {n.createdAt && <p className="td-mono td-sub mt-1">{formatDate(n.createdAt)}</p>}
                </div>
              );
            }}
          />
        </Panel>

        <Panel title={`Certificates (${data.certificates.length})`}>
          <MiniList
            items={data.certificates}
            empty="No certificates"
            render={(item) => {
              const c = item as UserDetail["certificates"][number];
              return (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-ink">{c.title}</p>
                  {c.createdAt && <span className="td-mono td-sub">{formatDate(c.createdAt)}</span>}
                </div>
              );
            }}
          />
        </Panel>

        <Panel title={`Chats (${data.chatCount})`} subtitle={`Showing ${data.chats.length} most recent`}>
          <MiniList
            items={data.chats}
            empty="No chats"
            render={(item) => {
              const c = item as UserDetail["chats"][number];
              return (
                <div>
                  <p className="truncate text-xs font-semibold text-ink">{c.topic}</p>
                  {c.lastMessageAt && <p className="td-mono td-sub mt-1">{timeAgo(c.lastMessageAt)}</p>}
                </div>
              );
            }}
          />
        </Panel>
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
