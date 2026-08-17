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
      db.collection("assignments").find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection("assignments").countDocuments(filter),
    ]);

    const classrooms = await classroomNameMap(db, items.map((i) => i.classroomId).filter(Boolean));
    const creators = await userNameMap(db, items.map((i) => i.createdBy).filter(Boolean));

    return ok({
      items: items.map((a) => ({
        id: String(a._id),
        title: a.title,
        description: a.description || "",
        instructions: a.instructions || "",
        type: a.type,
        classroom: classrooms.get(String(a.classroomId)) || "—",
        creator: creators.get(String(a.createdBy))?.name || "—",
        dueDate: a.dueDate || null,
        maxScore: a.maxScore ?? 100,
        passingScore: a.passingScore ?? 60,
        weight: a.weight ?? 1,
        allowLateSubmissions: !!a.allowLateSubmissions,
        isActive: !!a.isActive,
        aiGenerated: !!a.aiGenerated,
        createdAt: a.createdAt,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Admin assignments list error:", error);
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
    if (body.isActive === undefined) return badRequest("No updates provided");

    const { db } = await connectToDatabase();
    const result = await db.collection("assignments").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isActive: !!body.isActive, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) return notFound("Assignment not found");

    await logAdminActivity({
      admin,
      action: "status_change",
      resource: "assignments",
      resourceId: id,
      summary: `${body.isActive ? "Activated" : "Deactivated"} assignment "${result.title}"`,
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin assignment update error:", error);
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
    const target = await db.collection("assignments").findOne({ _id: new ObjectId(id) }, { projection: { title: 1 } });
    const result = await db.collection("assignments").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound("Assignment not found");

    await logAdminActivity({
      admin,
      action: "delete",
      resource: "assignments",
      resourceId: id,
      summary: `Deleted assignment "${target?.title || id}"`,
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin assignment delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
