import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest, notFound } from "@/lib/admin";
import { classroomNameMap, userNameMap } from "@/lib/classroomJoin";
import { logAdminActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const classroomId = url.searchParams.get("classroomId") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));

    const { db } = await connectToDatabase();
    const filter: Record<string, unknown> = {};
    if (search) filter.title = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    if (classroomId && ObjectId.isValid(classroomId)) filter.classroomId = new ObjectId(classroomId);

    const [items, total] = await Promise.all([
      db.collection("discussions").find(filter).sort({ lastActivityAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection("discussions").countDocuments(filter),
    ]);

    const classrooms = await classroomNameMap(db, items.map((i) => i.classroomId).filter(Boolean));
    const creators = await userNameMap(db, items.map((i) => i.createdBy).filter(Boolean));

    return ok({
      items: items.map((d) => ({
        id: String(d._id),
        title: d.title,
        description: d.description || "",
        classroom: classrooms.get(String(d.classroomId)) || "—",
        creator: creators.get(String(d.createdBy))?.name || "—",
        postCount: d.postCount || 0,
        isPinned: !!d.isPinned,
        isClosed: !!d.isClosed,
        lastActivityAt: d.lastActivityAt || d.createdAt,
        createdAt: d.createdAt,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Admin discussions list error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  if (!ObjectId.isValid(id)) return badRequest("Invalid id");

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.isPinned !== undefined) updates.isPinned = !!body.isPinned;
    if (body.isClosed !== undefined) updates.isClosed = !!body.isClosed;
    if (Object.keys(updates).length === 0) return badRequest("No updates provided");

    const { db } = await connectToDatabase();
    const result = await db.collection("discussions").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) return notFound("Discussion not found");

    await logAdminActivity({
      admin,
      action: "moderate",
      resource: "discussions",
      resourceId: id,
      summary: `Moderated discussion "${result.title}"`,
      meta: updates,
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin discussion update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  if (!ObjectId.isValid(id)) return badRequest("Invalid id");

  try {
    const { db } = await connectToDatabase();
    const target = await db.collection("discussions").findOne({ _id: new ObjectId(id) }, { projection: { title: 1 } });
    const result = await db.collection("discussions").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound("Discussion not found");
    await db.collection("discussionposts").deleteMany({ discussionId: new ObjectId(id) });

    await logAdminActivity({
      admin,
      action: "delete",
      resource: "discussions",
      resourceId: id,
      summary: `Deleted discussion "${target?.title || id}" and its posts`,
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin discussion delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
