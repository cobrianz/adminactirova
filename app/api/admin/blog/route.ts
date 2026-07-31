import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const search = url.searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));

    const { db } = await connectToDatabase();
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: "i" };

    const [posts, total] = await Promise.all([
      db
        .collection("posts")
        .find(filter, { projection: { content: 0 } })
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      db.collection("posts").countDocuments(filter),
    ]);

    return ok({
      posts: posts.map((p) => ({
        id: String(p._id),
        title: p.title,
        slug: p.slug,
        summary: p.summary || p.excerpt || "",
        category: p.category || "",
        status: p.status || "draft",
        featured: !!p.featured,
        viewsCount: p.viewsCount || 0,
        readTime: p.readTime || 0,
        authorName: p.author?.name || "Actirova",
        publishedAt: p.publishedAt || p.createdAt || null,
        createdAt: p.createdAt,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin blog list error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function POST(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const body = await req.json();
    if (!body.title?.trim()) return badRequest("Title is required");

    const { db } = await connectToDatabase();

    let slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.title);
    if (!slug) return badRequest("Could not generate a slug");

    // Ensure unique slug
    const existing = await db.collection("posts").findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const now = new Date();
    const status = body.status === "draft" ? "draft" : "published";

    const post = {
      title: body.title.trim(),
      slug,
      summary: body.summary || "",
      excerpt: body.excerpt || body.summary || "",
      content: body.content || "",
      category: body.category || "General",
      tags: Array.isArray(body.tags) ? body.tags : [],
      thumbnailUrl: body.thumbnailUrl || "",
      author: { id: admin.id, name: `${admin.firstName} ${admin.lastName}`.trim() || "Admin", role: "admin" },
      featured: !!body.featured,
      trending: !!body.trending,
      period: body.period || "weekly",
      periodKey: body.periodKey || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      viewsCount: 0,
      readTime: Math.max(1, Math.round((body.content || "").split(/\s+/).length / 200)),
      status,
      publishedAt: status === "published" ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("posts").insertOne(post);
    return ok({ success: true, id: String(result.insertedId) }, 201);
  } catch (error) {
    console.error("Admin blog create error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
