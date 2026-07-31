import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";

export const dynamic = "force-dynamic";

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function classifyBrowser(ua: string): string {
  if (!ua) return "Unknown";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/")) return "Safari";
  if (ua.includes("Mobile")) return "Mobile";
  return "Other";
}

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const { db } = await connectToDatabase();

    const [visitorDoc, pageviews, activeNow, topPages, recentSessions] = await Promise.all([
      db.collection("visitorcounters").aggregate([{ $group: { _id: null, total: { $sum: "$count" } } }]).toArray(),
      db
        .collection("sessions")
        .aggregate([
          { $match: { startTime: { $gte: daysAgo(13) } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$startTime" } },
              sessions: { $sum: 1 },
              duration: { $sum: { $ifNull: ["$duration", 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      db.collection("sessions").countDocuments({ isActive: true, startTime: { $gte: new Date(Date.now() - 30 * 60 * 1000) } }),
      db
        .collection("sessions")
        .aggregate([
          { $match: { startTime: { $gte: daysAgo(13) } } },
          { $group: { _id: "$page", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ])
        .toArray(),
      db
        .collection("sessions")
        .find({}, { projection: { page: 1, userAgent: 1, startTime: 1, duration: 1, isActive: 1, userId: 1 } })
        .sort({ startTime: -1 })
        .limit(20)
        .toArray(),
    ]);

    // Browser classification done in JS to keep the aggregation simple
    const rawBrowsers = await db
      .collection("sessions")
      .aggregate([
        { $match: { startTime: { $gte: daysAgo(29) } } },
        { $group: { _id: "$userAgent", count: { $sum: 1 } } },
      ])
      .toArray();

    const browserMap = new Map<string, number>();
    rawBrowsers.forEach((r) => {
      const name = classifyBrowser(String(r._id || ""));
      browserMap.set(name, (browserMap.get(name) || 0) + r.count);
    });

    return ok({
      visitorCount: visitorDoc[0]?.total || 0,
      activeNow,
      pageviewsLast14Days: pageviews.map((p) => ({
        date: p._id,
        sessions: p.sessions,
        duration: p.duration,
      })),
      topPages: topPages.map((p) => ({ page: p._id || "/", count: p.count })),
      browsers: [...browserMap.entries()].map(([browser, count]) => ({ browser, count })).sort((a, b) => b.count - a.count),
      recentSessions: recentSessions.map((s) => ({
        id: String(s._id),
        page: s.page || "/",
        startTime: s.startTime,
        duration: s.duration || 0,
        isActive: !!s.isActive,
        userId: s.userId ? String(s.userId) : null,
      })),
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
