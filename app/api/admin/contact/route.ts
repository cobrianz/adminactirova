import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));

    const { db } = await connectToDatabase();
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const [messages, total] = await Promise.all([
      db
        .collection("contacts")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      db.collection("contacts").countDocuments(filter),
    ]);

    const counts = await db
      .collection("contacts")
      .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray();

    return ok({
      messages: messages.map((m) => ({
        id: String(m._id),
        name: m.name || "",
        email: m.email || "",
        subject: m.subject || "",
        message: m.message || "",
        category: m.category || "general",
        status: m.status || "new",
        adminNotes: m.adminNotes || "",
        createdAt: m.createdAt,
      })),
      total,
      counts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin contact error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
