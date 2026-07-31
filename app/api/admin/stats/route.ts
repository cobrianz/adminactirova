import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";

export const dynamic = "force-dynamic";

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

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
      db.collection("users").countDocuments({ isPremium: true }),
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

    // Revenue from successful billing history entries
    const revenueAgg = await db
      .collection("users")
      .aggregate([
        { $unwind: "$billingHistory" },
        {
          $match: {
            "billingHistory.status": "success",
            "billingHistory.amount": { $exists: true, $gt: 0 },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$billingHistory.date" } },
            total: { $sum: "$billingHistory.amount" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const revenueByDay = revenueAgg.filter((r) => r._id).map((r) => ({ date: r._id, total: r.total }));

    const revenueTotal = await db
      .collection("users")
      .aggregate([
        { $unwind: "$billingHistory" },
        {
          $match: {
            "billingHistory.status": "success",
            "billingHistory.amount": { $exists: true, $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$billingHistory.amount" },
            thisMonth: {
              $sum: {
                $cond: [{ $gte: ["$billingHistory.date", daysAgo(30)] }, "$billingHistory.amount", 0],
              },
            },
          },
        },
      ])
      .toArray();

    // Revenue by description (credit packs / subscriptions)
    const revenueBreakdown = await db
      .collection("users")
      .aggregate([
        { $unwind: "$billingHistory" },
        {
          $match: {
            "billingHistory.status": "success",
            "billingHistory.amount": { $exists: true, $gt: 0 },
          },
        },
        {
          $group: {
            _id: "$billingHistory.description",
            total: { $sum: "$billingHistory.amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
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
      .find({}, { projection: { firstName: 1, lastName: 1, email: 1, role: 1, status: 1, isPremium: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(8)
      .toArray();

    const topTopics = await db
      .collection("library")
      .aggregate([
        { $match: { topic: { $exists: true, $ne: "" } } },
        { $group: { _id: "$topic", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ])
      .toArray();

    const recentReports = await db
      .collection("reports")
      .find({}, { projection: { title: 1, course: 1, createdAt: 1, userId: 1 } })
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
        total: revenueTotal[0]?.total || 0,
        thisMonth: revenueTotal[0]?.thisMonth || 0,
      },
      signupsLast30Days: signups.filter((s) => s._id),
      revenueByDay,
      revenueBreakdown: revenueBreakdown.map((r) => ({
        label: r._id || "Other",
        total: r.total,
        count: r.count,
      })),
      usageByFeature,
      recentSignups: recentSignups.map((u) => ({
        id: String(u._id),
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
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
        course: r.course || "",
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
