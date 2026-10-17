import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";
import { logAdminActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "course";
}

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
            .find(
              { _id: { $in: userIds } },
              { projection: { name: 1, firstName: 1, lastName: 1, email: 1, courses: 1 } }
            )
            .toArray()
        : [];
      const userMap = new Map(users.map((u) => [String(u._id), u]));

      // Canonical course progress lives on user.courses as a 0-100
      // percentage (the library document's own `progress` is a stale
      // module counter and must not be shown as a percent).
      const progressFor = (course: { userId?: unknown; _id?: unknown }) => {
        const owner = userMap.get(String(course.userId));
        const entry = Array.isArray(owner?.courses)
          ? (owner.courses as { courseId?: unknown; progress?: number }[]).find(
              (c) => String(c.courseId) === String(course._id)
            )
          : undefined;
        return typeof entry?.progress === "number" ? entry.progress : 0;
      };

      results.library = library.map((c) => ({
        id: String(c._id),
        title: c.title || "Untitled",
        topic: c.originalTopic || c.topic || "",
        difficulty: c.difficulty || "",
        format: c.format || "course",
        totalModules: c.totalModules || (Array.isArray(c.modules) ? c.modules.length : 0),
        progress: progressFor(c),
        completed: !!c.completed,
        createdAt: c.createdAt,
        owner: userMap.get(String(c.userId))
          ? userMap.get(String(c.userId))?.name ||
            `${userMap.get(String(c.userId))?.firstName || ""} ${userMap.get(String(c.userId))?.lastName || ""}`.trim() ||
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
        level: c.level || c.difficulty || "",
        price: c.price || 0,
        isPremium: !!c.isPremium,
        published: c.isPublished !== false && c.published !== false,
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

export async function POST(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const body = await req.json();

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const category = String(body.category || "").trim();
    const difficulty = String(body.level ?? body.difficulty ?? "beginner").trim().toLowerCase() || "beginner";

    if (!title || !description || !category) {
      return ok({ error: "Title, description and category are required" }, 400);
    }

    const price = Number(body.price ?? 0);
    if (!Number.isFinite(price) || price < 0) return ok({ error: "Invalid price" }, 400);

    const now = new Date();
    const { db } = await connectToDatabase();

    let slug = slugify(title);
    if (await db.collection("courses").findOne({ slug }, { projection: { _id: 1 } })) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const doc = {
      title,
      description,
      category,
      difficulty,
      duration: String(body.duration || "30 days").trim(),
      instructor: String(body.instructor || "Actirova Academy").trim(),
      thumbnail: String(body.thumbnail || "/hero.png").trim(),
      badge: String(body.badge || "Admin Pick").trim(),
      featured: !!body.featured,
      slug,
      isPremium: body.isPremium !== false,
      isGlobal: true,
      isPublished: body.published !== false,
      published: body.published !== false,
      price,
      tierRequired: "premium-course",
      rating: 0,
      highlights: Array.isArray(body.highlights) ? body.highlights : [],
      totalModules: 0,
      totalLessons: 0,
      lessonsCount: 0,
      tags: Array.isArray(body.tags) ? body.tags : [],
      modules: [],
      createdBy: new ObjectId(admin.id),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("courses").insertOne(doc);

    await logAdminActivity({
      admin,
      action: "create",
      resource: "courses",
      resourceId: String(result.insertedId),
      summary: `Created course "${title}"`,
    });

    return ok({ success: true, id: String(result.insertedId) }, 201);
  } catch (error) {
    console.error("Admin course create error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
