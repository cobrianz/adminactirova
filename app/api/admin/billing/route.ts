import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";

export const dynamic = "force-dynamic";

type BillingEntry = {
  _id?: unknown;
  type?: string;
  description?: string;
  itemType?: string;
  plan?: string;
  amount?: unknown;
  currency?: string;
  status?: string;
  paymentMethod?: string;
  channel?: string;
  gateway?: string;
  reference?: string;
  transactionId?: unknown;
  paidAt?: unknown;
  createdAt?: unknown;
  date?: unknown;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const { db } = await connectToDatabase();

    const users = await db
      .collection("users")
      .find(
        {},
        { projection: { name: 1, email: 1, subscription: 1, billingHistory: 1, isPremium: 1 } }
      )
      .limit(1000)
      .toArray();

    const transactions: Record<string, unknown>[] = [];
    const subscriptions: Record<string, unknown>[] = [];

    for (const user of users) {
      const sub = user.subscription && typeof user.subscription === "object" ? user.subscription : {};
      const plan = sub.plan;
      if (plan && plan !== "free" && plan !== "none") {
        subscriptions.push({
          userId: String(user._id),
          name: user.name || user.email || "",
          email: user.email || "",
          plan,
          tier: sub.tier || "",
          status: sub.status || "unknown",
          autoRenew: !!sub.autoRenew,
          billingCycle: sub.billingCycle || "",
          currentPeriodStart: sub.currentPeriodStart ? String(sub.currentPeriodStart) : null,
          currentPeriodEnd: sub.currentPeriodEnd ? String(sub.currentPeriodEnd) : null,
          lastPaymentDate: sub.lastPaymentDate ? String(sub.lastPaymentDate) : null,
          expiresAt: sub.expiresAt || sub.expiryDate ? String(sub.expiresAt || sub.expiryDate) : null,
        });
      }

      const history = Array.isArray(user.billingHistory) ? user.billingHistory : [];
      for (const entry of history as BillingEntry[]) {
        if (!entry || typeof entry !== "object") continue;

        // Skip records with no money exchanged (e.g. credit_usage logs) —
        // they only pollute the payments table with $0.00 rows.
        const amount = toNumber(entry.amount);
        if (amount === 0) continue;

        const date = toDate(entry.paidAt || entry.createdAt || entry.date);
        transactions.push({
          userId: String(user._id),
          name: user.name || user.email || "",
          email: user.email || "",
          id: entry._id ? String(entry._id) : null,
          type: entry.type || "subscription",
          description: entry.description || entry.itemType || entry.plan || "",
          plan: entry.plan || "",
          amount: toNumber(entry.amount),
          currency: entry.currency || "USD",
          status: entry.status || "success",
          paymentMethod: entry.paymentMethod || entry.channel || "",
          gateway: entry.gateway || "",
          reference: entry.reference || (entry.transactionId != null ? String(entry.transactionId) : ""),
          date: date ? date.toISOString() : null,
        });
      }
    }

    transactions.sort((a, b) => {
      const ad = a.date ? Date.parse(String(a.date)) : 0;
      const bd = b.date ? Date.parse(String(b.date)) : 0;
      return bd - ad;
    });

    const successful = transactions.filter(
      (t) => t.status === "success" && toNumber(t.amount) > 0
    );

    const totalByCurrency: Record<string, number> = {};
    for (const t of successful) {
      const cur = String(t.currency || "USD");
      totalByCurrency[cur] = (totalByCurrency[cur] || 0) + toNumber(t.amount);
    }

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentByCurrency: Record<string, number> = {};
    for (const t of successful) {
      const ts = t.date ? Date.parse(String(t.date)) : 0;
      if (ts >= thirtyDaysAgo) {
        const cur = String(t.currency || "USD");
        recentByCurrency[cur] = (recentByCurrency[cur] || 0) + toNumber(t.amount);
      }
    }

    const payingUserIds = new Set<string>();
    for (const t of successful) payingUserIds.add(String(t.userId));
    for (const s of subscriptions) payingUserIds.add(String(s.userId));

    const activeSubscriptions = subscriptions.filter((s) =>
      ["active", "trialing", "trial", "renewing"].includes(String(s.status))
    ).length;

    return ok({
      summary: {
        totalTransactions: transactions.length,
        successfulTransactions: successful.length,
        payingUsers: payingUserIds.size,
        totalSubscriptions: subscriptions.length,
        activeSubscriptions,
        revenueByCurrency: Object.entries(totalByCurrency)
          .map(([currency, amount]) => ({ currency, amount }))
          .sort((a, b) => b.amount - a.amount),
        revenueLast30Days: Object.entries(recentByCurrency)
          .map(([currency, amount]) => ({ currency, amount }))
          .sort((a, b) => b.amount - a.amount),
      },
      subscriptions,
      transactions,
    });
  } catch (error) {
    console.error("Admin billing error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
