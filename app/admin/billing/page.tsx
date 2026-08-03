"use client";

import React, { useMemo, useState } from "react";
import {
  CreditCard,
  Users,
  ReceiptText,
  TrendingUp,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useApi } from "@/components/useApi";
import { PageHeader, StatCard, Panel, Badge, EmptyState, Spinner } from "@/components/ui";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";

type Transaction = {
  userId: string;
  name: string;
  email: string;
  id: string | null;
  type: string;
  description: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  gateway: string;
  reference: string;
  date: string | null;
};

type Subscription = {
  userId: string;
  name: string;
  email: string;
  plan: string;
  tier: string;
  status: string;
  autoRenew: boolean;
  billingCycle: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  lastPaymentDate: string | null;
  expiresAt: string | null;
};

type Billing = {
  summary: {
    totalTransactions: number;
    successfulTransactions: number;
    payingUsers: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    revenueByCurrency: { currency: string; amount: number }[];
    revenueLast30Days: { currency: string; amount: number }[];
  };
  subscriptions: Subscription[];
  transactions: Transaction[];
};

function formatMoney(amount: number, currency: string) {
  const cur = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: cur === "KES" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${cur} ${amount}`;
  }
}

function moneyList(items: { currency: string; amount: number }[]): string {
  if (!items || items.length === 0) return "—";
  return items.map((r) => formatMoney(r.amount, r.currency)).join(" · ");
}

function subStatusColor(status: string): string {
  if (["active", "trialing", "trial", "renewing"].includes(status)) return "green";
  if (["pending", "past_due", "overdue"].includes(status)) return "amber";
  if (["expired", "cancelled", "canceled", "failed", "suspended"].includes(status)) return "red";
  return "slate";
}

function txnStatusColor(status: string): string {
  if (status === "success") return "green";
  if (status === "pending") return "amber";
  return "red";
}

const TXN_PAGE_SIZE = 12;

export default function BillingPage() {
  const { data, loading, error, refetch } = useApi<Billing>("/api/admin/billing");
  const [txnSearch, setTxnSearch] = useState("");
  const [txnPage, setTxnPage] = useState(1);
  const [subSearch, setSubSearch] = useState("");

  const transactions = useMemo(() => data?.transactions || [], [data]);
  const subscriptions = useMemo(() => data?.subscriptions || [], [data]);

  const filteredTxns = useMemo(() => {
    const q = txnSearch.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.reference || "").toLowerCase().includes(q)
    );
  }, [transactions, txnSearch]);

  const filteredSubs = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    if (!q) return subscriptions;
    return subscriptions.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.plan || "").toLowerCase().includes(q) ||
        (s.status || "").toLowerCase().includes(q)
    );
  }, [subscriptions, subSearch]);

  const txnPageCount = Math.max(1, Math.ceil(filteredTxns.length / TXN_PAGE_SIZE));
  const pageTxns = filteredTxns.slice((txnPage - 1) * TXN_PAGE_SIZE, txnPage * TXN_PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !data) return <EmptyState title="Failed to load billing" subtitle={error || undefined} />;

  const summary = data.summary;

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Subscriptions, payments and revenue."
        actions={
          <button onClick={refetch} className="tb-btn" aria-label="Refresh">
            <RefreshCw />
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active subscriptions" value={summary.activeSubscriptions} icon={<CreditCard />} hint={`${summary.totalSubscriptions} total`} />
        <StatCard label="Paying users" value={summary.payingUsers} icon={<Users />} />
        <StatCard label="Successful payments" value={summary.successfulTransactions} icon={<ReceiptText />} hint={`${summary.totalTransactions} recorded`} />
        <StatCard label="Revenue (30d)" value={moneyList(summary.revenueLast30Days)} icon={<TrendingUp />} hint="successful payments" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Revenue by currency" subtitle="All-time, successful payments">
          {summary.revenueByCurrency.length === 0 ? (
            <EmptyState title="No revenue yet" />
          ) : (
            <div>
              {summary.revenueByCurrency.map((r, i) => (
                <div key={r.currency} className="dl-row">
                  <span className="dl-dot" style={{ background: ["var(--acid)", "var(--green)", "var(--blue)", "var(--orange)", "var(--purple)"][i % 5] }} />
                  <span className="dl-label">{r.currency}</span>
                  <span className="dl-val">{formatMoney(r.amount, r.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Subscriptions" subtitle={`${filteredSubs.length} non-free plans`} className="xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="tb-search w-64">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                placeholder="Search by user, plan or status…"
              />
            </div>
          </div>
          {filteredSubs.length === 0 ? (
            <EmptyState title="No subscriptions" subtitle="No users on a paid plan yet." />
          ) : (
            <div className="table-wrap">
              <table className="min-w-[760px]">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Cycle</th>
                    <th>Renews</th>
                    <th>Last payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.map((s) => (
                    <tr key={`${s.userId}-${s.plan}`}>
                      <td>
                        <p className="text-sm font-medium text-ink">{s.name}</p>
                        <p className="td-mono td-sub">{s.email}</p>
                      </td>
                      <td>
                        <span className="chip">{s.plan}</span>
                        {s.tier && s.tier !== "free" && s.tier !== s.plan && <span className="chip ml-1">{s.tier}</span>}
                      </td>
                      <td>
                        <Badge color={subStatusColor(s.status)}>{s.status}</Badge>
                      </td>
                      <td className="td-mono">{s.billingCycle || "—"}</td>
                      <td className="td-mono" title={s.currentPeriodEnd ? formatDateTime(s.currentPeriodEnd) : undefined}>
                        {s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : "—"}
                      </td>
                      <td className="td-mono" title={s.lastPaymentDate ? formatDateTime(s.lastPaymentDate) : undefined}>
                        {s.lastPaymentDate ? timeAgo(s.lastPaymentDate) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Transactions" subtitle={`${filteredTxns.length} payments recorded`}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="tb-search w-72">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                value={txnSearch}
                onChange={(e) => {
                  setTxnSearch(e.target.value);
                  setTxnPage(1);
                }}
                placeholder="Search user, description or reference…"
              />
            </div>
            <p className="td-mono td-sub ml-auto">
              Page {txnPage} of {txnPageCount}
            </p>
          </div>

          {pageTxns.length === 0 ? (
            <EmptyState title="No transactions" subtitle="No payments recorded yet." />
          ) : (
            <div className="table-wrap">
              <table className="min-w-[900px]">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {pageTxns.map((t, i) => (
                    <tr key={`${t.userId}-${t.reference || t.id || t.date || i}-${i}`}>
                      <td className="td-mono" title={t.date ? formatDateTime(t.date) : undefined}>
                        {t.date ? timeAgo(t.date) : "—"}
                      </td>
                      <td>
                        <p className="text-sm font-medium text-ink">{t.name}</p>
                        <p className="td-mono td-sub">{t.email}</p>
                      </td>
                      <td>
                        <p className="text-sm text-ink">{t.description || t.type}</p>
                        {t.plan && <p className="td-mono td-sub">{t.type} · {t.plan}</p>}
                      </td>
                      <td className="td-mono">{formatMoney(t.amount, t.currency)}</td>
                      <td>
                        <Badge color={txnStatusColor(t.status)}>{t.status}</Badge>
                      </td>
                      <td className="td-mono">
                        {[t.gateway, t.paymentMethod].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="td-mono td-sub" title={t.reference || undefined}>
                        {t.reference || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {txnPageCount > 1 && (
            <div className="flex items-center justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "var(--border)" }}>
              <button disabled={txnPage <= 1} onClick={() => setTxnPage((p) => p - 1)} className="pa-btn">
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <button disabled={txnPage >= txnPageCount} onClick={() => setTxnPage((p) => p + 1)} className="pa-btn">
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
