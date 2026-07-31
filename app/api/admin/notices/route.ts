import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const { db } = await connectToDatabase();
    const notices = await db
      .collection("site_notices")
      .find({})
      .sort({ priority: -1, updatedAt: -1, createdAt: -1 })
      .limit(100)
      .toArray();

    return ok({
      notices: notices.map((n) => ({
        id: String(n._id),
        key: n.key || "",
        title: n.title || "",
        message: n.message || "",
        variant: n.variant || "info",
        icon: n.icon || "",
        active: !!n.active,
        priority: n.priority || 0,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Admin notices error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function POST(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const body = await req.json();
    if (!body.message?.trim()) return badRequest("Message is required");

    const { db } = await connectToDatabase();
    const now = new Date();

    const notice = {
      key: body.key?.trim() || `notice-${Date.now().toString(36)}`,
      title: body.title?.trim() || "Notice",
      message: body.message.trim(),
      variant: body.variant || "info",
      icon: body.icon || "",
      active: body.active !== false,
      priority: Number(body.priority) || 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("site_notices").insertOne(notice);
    return ok({ success: true, id: String(result.insertedId) }, 201);
  } catch (error) {
    console.error("Admin notice create error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
