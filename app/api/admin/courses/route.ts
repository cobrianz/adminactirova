import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind") || "all";
    const search = url.searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));

    const { db } = await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [{ title: { $regex: search, $options: "i" } }, { topic: { $regex: search, $options: "i" } }];
    }

    const results: Record<string, unknown> = {};

    if (kind === "all" || kind === "library") {
      const searchOr = search
        ? { $or: [{ title: { $regex: search, $options: "i" } }, { topic: { $regex: search, $options: "i" } }] }
        : {};
      const [library, libraryTotal] = await Promise.all([
        db
          .collection("library")
          .find({ ...searchOr })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        db.collection("library").countDocuments({ ...searchOr }),
      ]);

      const userIds = [...new Set(library.map((c) => String(c.userId)))]
        .map((id) => {
          try {
            return new ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter((id): id is ObjectId => id !== null);

      const users = userIds.length
        ? await db
            .collection("users")
            .find({ _id: { $in: userIds } }, { projection: { firstName: 1, lastName: 1, email: 1 } })
            .toArray()
        : [];
      const userMap = new Map(users.map((u) => [String(u._id), u]));

      results.library = library.map((c) => ({
        id: String(c._id),
        title: c.title || "Untitled",
        topic: c.topic || "",
        difficulty: c.difficulty || "",
        progress: c.progress ?? 0,
        completed: !!c.completed,
        createdAt: c.createdAt,
        owner: userMap.get(String(c.userId))
          ? `${userMap.get(String(c.userId))?.firstName || ""} ${userMap.get(String(c.userId))?.lastName || ""}`.trim() ||
            userMap.get(String(c.userId))?.email ||
            "—"
          : "—",
        email: userMap.get(String(c.userId))?.email || "",
      }));
      results.libraryTotal = libraryTotal;
      results.libraryPages = Math.ceil(libraryTotal / limit);
    }

    if (kind === "all" || kind === "marketplace") {
      const [marketplace, marketplaceTotal] = await Promise.all([
        db
          .collection("courses")
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        db.collection("courses").countDocuments(filter),
      ]);

      const [enrollCounts] = await Promise.all([
        db
          .collection("enrollments")
          .aggregate([{ $group: { _id: "$courseId", count: { $sum: 1 } } }])
          .toArray(),
      ]);

      const enrollMap = new Map(enrollCounts.map((e) => [String(e._id), e.count]));

      results.marketplace = marketplace.map((c) => ({
        id: String(c._id),
        title: c.title || "Untitled",
        description: c.description || "",
        category: c.category || "",
        level: c.level || "",
        price: c.price || 0,
        isPremium: !!c.isPremium,
        published: c.published !== false,
        enrolled: enrollMap.get(String(c._id)) || 0,
        createdAt: c.createdAt,
      }));
      results.marketplaceTotal = marketplaceTotal;
      results.marketplacePages = Math.ceil(marketplaceTotal / limit);
    }

    return ok(results);
  } catch (error) {
    console.error("Admin courses error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
