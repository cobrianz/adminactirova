import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));

    const { db } = await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (search) filter.title = { $regex: search, $options: "i" };

    const [reports, total] = await Promise.all([
      db
        .collection("reports")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      db.collection("reports").countDocuments(filter),
    ]);

    const userIds = [...new Set(reports.map((r) => String(r.userId)))]
      .map((id) => (id === "undefined" || id === "null" ? null : id))
      .filter((id): id is string => id !== null && /^[0-9a-f]{24}$/i.test(id));

    const users = userIds.length
      ? await db
          .collection("users")
          .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } }, { projection: { firstName: 1, lastName: 1, email: 1 } })
          .toArray()
      : [];
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    return ok({
      reports: reports.map((r) => {
        const user = userMap.get(String(r.userId));
        const owner = user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "—"
          : r.userId
          ? "—"
          : "—";
        return {
          id: String(r._id),
          title: r.title || "Untitled",
          course: r.course || "",
          status: r.status || "draft",
          wordCount: r.sections?.reduce?.((sum: number, s: { content?: string }) => sum + (s.content || "").split(/\s+/).length, 0) || 0,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          owner,
          email: user?.email || "",
        };
      }),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin reports error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
