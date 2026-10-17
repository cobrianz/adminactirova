import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Day boundaries are anchored to UTC so they line up with the
// $dateToString aggregation buckets (which are UTC by default).
function daysAgo(n: number) {
  const d = startOfToday();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// billingHistory entries are written by the payment fulfillment code with
// `createdAt` (no `status`/`date` fields) — only successful payments are
// ever recorded, so the presence of an amount is the success signal.
const REVENUE_DATE = {
  $toDate: {
    $ifNull: ["$billingHistory.paidAt", { $ifNull: ["$billingHistory.createdAt", "$billingHistory.date"] }],
  },
};

const REVENUE_MATCH = {
  "billingHistory.amount": { $exists: true, $gt: 0 },
  $or: [
    { "billingHistory.status": { $exists: false } },
    { "billingHistory.status": "success" },
  ],
};

const REVENUE_CURRENCY = { $ifNull: ["$billingHistory.currency", "USD"] };

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const { db } = await connectToDatabase();

    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      premiumUsers,
      instructorUsers,
      newToday,
      newThisMonth,
      courseCount,
      marketplaceCount,
      reportCount,
      examCount,
      contactNew,
      newsletterSubs,
      classroomCount,
    ] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("users").countDocuments({ status: "active" }),
      db.collection("users").countDocuments({ status: "pending" }),
      db.collection("users").countDocuments({ status: "suspended" }),
      db.collection("users").countDocuments({
        $or: [
          { premiumAccessExpiresAt: { $gt: new Date() } },
          { isPremium: true, premiumAccessExpiresAt: null },
        ],
      }),
      db.collection("users").countDocuments({ role: "instructor" }),
      db.collection("users").countDocuments({ createdAt: { $gte: startOfToday() } }),
      db.collection("users").countDocuments({ createdAt: { $gte: daysAgo(30) } }),
      db.collection("library").countDocuments(),
      db.collection("courses").countDocuments(),
      db.collection("reports").countDocuments(),
      db.collection("exams").countDocuments({}),
      db.collection("contacts").countDocuments({ status: "new" }),
      db.collection("newsletters").countDocuments({ status: "subscribed" }),
      db.collection("classrooms").countDocuments(),
    ]);

    const [visitorDoc] = await Promise.all([
      db
        .collection("visitorcounters")
        .aggregate([{ $group: { _id: null, total: { $sum: "$count" } } }])
        .toArray(),
    ]);

    const visitorCount = visitorDoc[0]?.total || 0;

    const activeSessions = await db.collection("sessions").countDocuments({
      isActive: true,
      startTime: { $gte: daysAgo(1) },
    });

    // Signups per day, last 30 days
    const signups = await db
      .collection("users")
      .aggregate([
        { $match: { createdAt: { $gte: daysAgo(29) } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    // Revenue from billing history, grouped per day and per currency so
    // USD (cents) and KES (whole shillings) totals are never mixed.
    const revenueAgg = await db
      .collection("users")
      .aggregate([
        { $unwind: "$billingHistory" },
        { $match: REVENUE_MATCH },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: REVENUE_DATE } },
              currency: REVENUE_CURRENCY,
            },
            total: { $sum: "$billingHistory.amount" },
          },
        },
        { $sort: { "_id.date": 1 } },
      ])
      .toArray();

    const revenueByDay = revenueAgg
      .filter((r) => r._id?.date)
      .map((r) => ({ date: r._id.date, currency: r._id.currency, total: r.total }));

    const revenueTotalAgg = await db
      .collection("users")
      .aggregate([
        { $unwind: "$billingHistory" },
        { $match: REVENUE_MATCH },
        {
          $group: {
            _id: REVENUE_CURRENCY,
            total: { $sum: "$billingHistory.amount" },
            thisMonth: {
              $sum: {
                $cond: [{ $gte: [REVENUE_DATE, daysAgo(30)] }, "$billingHistory.amount", 0],
              },
            },
          },
        },
        { $sort: { total: -1 } },
      ])
      .toArray();

    // Revenue by product (credit packs / premium generation / etc.)
    const revenueBreakdownAgg = await db
      .collection("users")
      .aggregate([
        { $unwind: "$billingHistory" },
        { $match: REVENUE_MATCH },
        {
          $group: {
            _id: {
              label: {
                $ifNull: [
                  "$billingHistory.description",
                  { $ifNull: ["$billingHistory.itemType", { $ifNull: ["$billingHistory.type", "other"] }] },
                ],
              },
              currency: REVENUE_CURRENCY,
            },
            total: { $sum: "$billingHistory.amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 12 },
      ])
      .toArray();

    // Feature usage across all users
    const usageAgg = await db
      .collection("users")
      .aggregate([
        { $match: { usage: { $exists: true, $ne: null } } },
        { $project: { usageArr: { $objectToArray: "$usage" } } },
        { $unwind: "$usageArr" },
        { $group: { _id: "$usageArr.k", count: { $sum: "$usageArr.v" } } },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ])
      .toArray();

    const usageByFeature = usageAgg.map((u) => ({ feature: u._id, count: u.count }));

    const recentSignups = await db
      .collection("users")
      .find({}, { projection: { name: 1, firstName: 1, lastName: 1, email: 1, role: 1, status: 1, isPremium: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(8)
      .toArray();

    const topTopics = await db
      .collection("library")
      .aggregate([
        { $match: { $or: [{ topic: { $exists: true, $ne: "" } }, { originalTopic: { $exists: true, $ne: "" } }] } },
        { $group: { _id: { $ifNull: ["$originalTopic", "$topic"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ])
      .toArray();

    const recentReports = await db
      .collection("reports")
      .find({}, { projection: { title: 1, courseName: 1, topic: 1, createdAt: 1, userId: 1 } })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    return ok({
      counts: {
        totalUsers,
        activeUsers,
        pendingUsers,
        suspendedUsers,
        premiumUsers,
        instructorUsers,
        newToday,
        newThisMonth,
        courseCount,
        marketplaceCount,
        reportCount,
        examCount,
        contactNew,
        newsletterSubs,
        classroomCount,
        visitorCount,
        activeSessions,
      },
      revenue: {
        byCurrency: revenueTotalAgg.map((r) => ({ currency: r._id, total: r.total, thisMonth: r.thisMonth })),
      },
      signupsLast30Days: signups.filter((s) => s._id),
      revenueByDay,
      revenueBreakdown: revenueBreakdownAgg.map((r) => ({
        label: r._id?.label || "other",
        currency: r._id?.currency || "USD",
        total: r.total,
        count: r.count,
      })),
      usageByFeature,
      recentSignups: recentSignups.map((u) => ({
        id: String(u._id),
        name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        email: u.email,
        role: u.role,
        status: u.status,
        isPremium: !!u.isPremium,
        createdAt: u.createdAt,
      })),
      topTopics: topTopics.map((t) => ({ topic: t._id, count: t.count })),
      recentReports: recentReports.map((r) => ({
        id: String(r._id),
        title: r.title || "Untitled",
        course: r.courseName || r.topic || "",
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
