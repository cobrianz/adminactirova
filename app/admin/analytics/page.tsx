"use client";

import React from "react";
import { Activity, Globe, Radio, Clock } from "lucide-react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from "chart.js";
import { useApi } from "@/components/useApi";
import { StatCard, Panel, Badge, EmptyState, Spinner, PageHeader } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { useThemeColors, hexToRgba } from "@/lib/theme-colors";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

type Analytics = {
  visitorCount: number;
  activeNow: number;
  pageviewsLast14Days: { date: string; sessions: number; duration: number }[];
  topPages: { page: string; count: number }[];
  browsers: { browser: string; count: number }[];
  recentSessions: { id: string; page: string; startTime: string; duration: number; isActive: boolean; userId: string | null }[];
};

export default function AnalyticsPage() {
  const { data, loading, error } = useApi<Analytics>("/api/admin/analytics");
  const colors = useThemeColors();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !data) return <EmptyState title="Failed to load analytics" subtitle={error || undefined} />;

  const avgDuration = data.pageviewsLast14Days.reduce((s, d) => s + d.duration, 0);
  const totalSessions = data.pageviewsLast14Days.reduce((s, d) => s + d.sessions, 0);
  const avgPerSession = totalSessions ? Math.round(avgDuration / totalSessions) : 0;

  const sessionsChart = {
    labels: data.pageviewsLast14Days.map((d) => d.date.slice(5)),
    datasets: [
      {
        label: "Sessions",
        data: data.pageviewsLast14Days.map((d) => d.sessions),
        borderColor: colors.acid,
        backgroundColor: hexToRgba(colors.acid, 0.12),
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const pagesChart = {
    labels: data.topPages.map((p) => (p.page.length > 24 ? p.page.slice(0, 24) + "…" : p.page)),
    datasets: [
      {
        label: "Visits",
        data: data.topPages.map((p) => p.count),
        backgroundColor: hexToRgba(colors.acid, 0.7),
        borderRadius: 4,
      },
    ],
  };

  const browsersChart = {
    labels: data.browsers.map((b) => b.browser),
    datasets: [
      {
        data: data.browsers.map((b) => b.count),
        backgroundColor: [colors.acid, colors.green, colors.orange, colors.purple, colors.blue],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Sessions, traffic and engagement" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total visits" value={data.visitorCount.toLocaleString()} icon={<Globe />} />
        <StatCard label="Active now" value={data.activeNow} icon={<Radio />} />
        <StatCard label="Sessions (14d)" value={totalSessions} icon={<Activity />} />
        <StatCard label="Avg per session" value={`${Math.floor(avgPerSession / 60)}m ${avgPerSession % 60}s`} icon={<Clock />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Sessions" subtitle="Per day, last 14 days">
          {data.pageviewsLast14Days.length === 0 ? (
            <EmptyState title="No sessions recorded" />
          ) : (
            <div className="chart-wrap">
              <Line
                data={sessionsChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: colors.border }, ticks: { color: colors.ink3, font: { family: "JetBrains Mono", size: 10 } } },
                    x: { grid: { display: false }, ticks: { color: colors.ink3, font: { family: "JetBrains Mono", size: 10 } } },
                  },
                }}
              />
            </div>
          )}
        </Panel>

        <Panel title="Top pages" subtitle="Most visited routes">
          {data.topPages.length === 0 ? (
            <EmptyState title="No sessions recorded" />
          ) : (
            <div className="chart-wrap">
              <Bar
                data={pagesChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: "y" as const,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { beginAtZero: true, grid: { color: colors.border }, ticks: { color: colors.ink3, font: { family: "JetBrains Mono", size: 10 } } },
                    y: { grid: { display: false }, ticks: { color: colors.ink3, font: { family: "JetBrains Mono", size: 10 } } },
                  },
                }}
              />
            </div>
          )}
        </Panel>

        <Panel title="Browsers" subtitle="Last 30 days">
          {data.browsers.length === 0 ? (
            <EmptyState title="No data" />
          ) : (
            <div className="donut-wrap">
              <div className="mx-auto h-44 w-44 shrink-0">
                <Doughnut data={browsersChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: "68%" }} />
              </div>
              <div className="donut-legend">
                {data.browsers.map((b, i) => (
                  <div key={b.browser} className="dl-row">
                    <span className="dl-dot" style={{ background: browsersChart.datasets[0].backgroundColor[i] }} />
                    <span className="dl-label">{b.browser}</span>
                    <span className="dl-val">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Recent sessions" subtitle="Latest activity">
          {data.recentSessions.length === 0 ? (
            <EmptyState title="No sessions" />
          ) : (
            <div className="activity-list">
              {data.recentSessions.map((s) => (
                <div key={s.id} className="act-item">
                  <div className="act-dot-wrap">
                    <span className="act-dot" style={{ background: s.isActive ? "var(--green)" : "var(--ink4)" }} />
                    <span className="act-line" />
                  </div>
                  <div className="act-content">
                    <p className="act-msg">
                      <strong>{s.page}</strong>
                    </p>
                    <p className="act-time">
                      {timeAgo(s.startTime)} · {s.duration ? `${Math.floor(s.duration / 60)}m` : "—"}
                    </p>
                  </div>
                  {s.isActive ? <Badge color="green">Live</Badge> : <span className="act-time">ended</span>}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
