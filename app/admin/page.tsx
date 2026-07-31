"use client";

import React from "react";
import { Users, GraduationCap, BookOpen, FileText, DollarSign, Activity, Mail, MessageSquare, School } from "lucide-react";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from "chart.js";
import { useApi } from "@/components/useApi";
import { StatCard, Panel, EmptyState, Spinner, PageHeader } from "@/components/ui";
import { formatDate, timeAgo } from "@/lib/utils";
import { useThemeColors, hexToRgba } from "@/lib/theme-colors";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

type Stats = {
  counts: Record<string, number>;
  revenue: { total: number; thisMonth: number };
  signupsLast30Days: { _id: string; count: number }[];
  revenueByDay: { date: string; total: number }[];
  revenueBreakdown: { label: string; total: number; count: number }[];
  usageByFeature: { feature: string; count: number }[];
  recentSignups: { id: string; name: string; email: string; role: string; status: string; isPremium: boolean; createdAt: string }[];
  topTopics: { topic: string; count: number }[];
  recentReports: { id: string; title: string; course: string; createdAt: string }[];
};

const statusTone: Record<string, string> = {
  active: "sp-active",
  pending: "sp-pending",
  inactive: "sp-paused",
  suspended: "sp-cancel",
};
const roleTone: Record<string, string> = {
  student: "sp-active",
  instructor: "sp-pending",
  admin: "sp-done",
};

function chartScales(colors: ReturnType<typeof useThemeColors>) {
  return {
    y: { beginAtZero: true, grid: { color: colors.border }, ticks: { color: colors.ink3, font: { family: "JetBrains Mono", size: 10 } } },
    x: { grid: { display: false }, ticks: { color: colors.ink3, font: { family: "JetBrains Mono", size: 10 }, maxTicksLimit: 8 } },
  };
}

export default function OverviewPage() {
  const { data, loading, error, refetch } = useApi<Stats>("/api/admin/stats");
  const colors = useThemeColors();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !data) return <EmptyState title="Failed to load stats" subtitle={error || undefined} />;

  const c = data.counts;

  const signupChart = {
    labels: data.signupsLast30Days.map((s) => (s._id || "").slice(5)),
    datasets: [
      {
        label: "Signups",
        data: data.signupsLast30Days.map((s) => s.count),
        borderColor: colors.acid,
        backgroundColor: hexToRgba(colors.acid, 0.12),
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const revenueChart = {
    labels: data.revenueByDay.map((r) => (r.date || "").slice(5)),
    datasets: [
      {
        label: "Revenue",
        data: data.revenueByDay.map((r) => r.total),
        borderColor: colors.green,
        backgroundColor: hexToRgba(colors.green, 0.12),
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const doughnutChart = {
    labels: data.revenueBreakdown.map((r) => r.label),
    datasets: [
      {
        data: data.revenueBreakdown.map((r) => r.total),
        backgroundColor: [colors.acid, colors.green, colors.orange, colors.purple, colors.red, colors.blue],
        borderWidth: 0,
      },
    ],
  };

  const usageChart = {
    labels: data.usageByFeature.map((u) => u.feature),
    datasets: [
      {
        label: "Uses",
        data: data.usageByFeature.map((u) => u.count),
        backgroundColor: hexToRgba(colors.acid, 0.7),
        borderRadius: 4,
      },
    ],
  };

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="A snapshot of your platform at a glance"
        actions={
          <button onClick={refetch} className="pa-btn">
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value={c.totalUsers} icon={<Users />} hint={`${c.newToday} new today`} />
        <StatCard label="Active Now" value={c.activeUsers} icon={<Activity />} hint={`${c.activeSessions} sessions`} />
        <StatCard label="Premium" value={c.premiumUsers} icon={<GraduationCap />} />
        <StatCard
          label="Revenue"
          value={`$${data.revenue.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<DollarSign />}
          hint={`$${data.revenue.thisMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })} this month`}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Courses" value={c.courseCount} icon={<BookOpen />} hint={`${c.marketplaceCount} marketplace`} />
        <StatCard label="Visitors" value={c.visitorCount} icon={<Activity />} />
        <StatCard label="Instructors" value={c.instructorUsers} icon={<GraduationCap />} />
        <StatCard label="Reports" value={c.reportCount} icon={<FileText />} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Classrooms" value={c.classroomCount} icon={<School />} />
        <StatCard label="Exams" value={c.examCount} icon={<FileText />} />
        <StatCard label="New contacts" value={c.contactNew} icon={<MessageSquare />} />
        <StatCard label="Newsletter" value={c.newsletterSubs} icon={<Mail />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Signups" subtitle="New users per day, last 30 days">
          {data.signupsLast30Days.length === 0 ? (
            <EmptyState title="No signups recorded" />
          ) : (
            <div className="chart-wrap">
              <Line data={signupChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: chartScales(colors) }} />
            </div>
          )}
        </Panel>

        <Panel title="Revenue" subtitle="Successful payments per day, all-time">
          {data.revenueByDay.length === 0 ? (
            <EmptyState title="No revenue yet" />
          ) : (
            <div className="chart-wrap">
              <Line data={revenueChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: chartScales(colors) }} />
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Revenue by product" subtitle="Breakdown from billing history">
          {data.revenueBreakdown.length === 0 ? (
            <EmptyState title="No revenue yet" />
          ) : (
            <div className="donut-wrap">
              <div className="mx-auto h-44 w-44 shrink-0">
                <Doughnut data={doughnutChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: "68%" }} />
              </div>
              <div className="donut-legend">
                {data.revenueBreakdown.map((r) => (
                  <div key={r.label} className="dl-row">
                    <span className="dl-dot" style={{ background: "var(--acid)" }} />
                    <span className="dl-label">{r.label}</span>
                    <span className="dl-val">${r.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Feature usage" subtitle="Total usage across all users">
          {data.usageByFeature.length === 0 ? (
            <EmptyState title="No usage recorded yet" />
          ) : (
            <div className="chart-wrap">
              <Bar data={usageChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: chartScales(colors) }} />
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-7">
        <Panel title="Recent signups" subtitle="Latest registered users" className="xl:col-span-4">
          {data.recentSignups.length === 0 ? (
            <EmptyState title="No signups yet" />
          ) : (
            <div className="activity-list">
              {data.recentSignups.map((u) => (
                <div key={u.id} className="act-item">
                  <div className="act-dot-wrap">
                    <span className="act-dot" style={{ background: u.isPremium ? "var(--acid)" : "var(--green)" }} />
                    <span className="act-line" />
                  </div>
                  <div className="act-content">
                    <p className="act-msg">
                      <strong>{u.name || u.email || "—"}</strong> signed up
                    </p>
                    <p className="act-time">
                      {u.email} · {timeAgo(u.createdAt)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={`status-pill ${roleTone[u.role] || "sp-paused"}`}>
                        <span className="sp-dot" />
                        {u.role}
                      </span>
                      <span className={`status-pill ${statusTone[u.status] || "sp-paused"}`}>
                        <span className="sp-dot" />
                        {u.status}
                      </span>
                      {u.isPremium && (
                        <span className="status-pill sp-done">
                          <span className="sp-dot" />
                          Premium
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-6 xl:col-span-3">
          <Panel title="Top topics" subtitle="Most popular personalized courses">
            {data.topTopics.length === 0 ? (
              <EmptyState title="No courses generated yet" />
            ) : (
              <div>
                {data.topTopics.map((t, i) => (
                  <div key={t.topic} className="prog-item">
                    <div className="prog-head">
                      <span className="prog-name truncate">{t.topic}</span>
                      <span className="prog-val">{t.count}</span>
                    </div>
                    <div className="prog-track">
                      <div
                        className="prog-fill"
                        style={{ width: `${Math.max(8, (t.count / data.topTopics[0].count) * 100)}%`, background: i === 0 ? "var(--acid)" : "var(--border2)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Recent reports" subtitle="Latest generated research reports">
            {data.recentReports.length === 0 ? (
              <EmptyState title="No reports yet" />
            ) : (
              <div className="activity-list">
                {data.recentReports.map((r) => (
                  <div key={r.id} className="act-item">
                    <div className="act-dot-wrap">
                      <span className="act-dot" style={{ background: "var(--purple)" }} />
                      <span className="act-line" />
                    </div>
                    <div className="act-content">
                      <p className="act-msg">
                        <strong>{r.title}</strong>
                      </p>
                      <p className="act-time">
                        {r.course || "—"} · {formatDate(r.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
