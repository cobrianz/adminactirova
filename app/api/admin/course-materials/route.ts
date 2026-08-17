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
      db.collection("coursematerials").find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection("coursematerials").countDocuments(filter),
    ]);

    const classrooms = await classroomNameMap(db, items.map((i) => i.classroomId).filter(Boolean));
    const uploaders = await userNameMap(db, items.map((i) => i.uploadedBy).filter(Boolean));

    return ok({
      items: items.map((m) => ({
        id: String(m._id),
        title: m.title,
        description: m.description || "",
        type: m.type || "document",
        classroom: classrooms.get(String(m.classroomId)) || "—",
        uploader: uploaders.get(String(m.uploadedBy))?.name || "—",
        fileName: m.fileName || "",
        url: m.url || "",
        fileSize: m.fileSize || 0,
        aiSummary: m.aiSummary || "",
        isRequired: !!m.isRequired,
        createdAt: m.createdAt,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Admin course materials list error:", error);
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
    if (body.isRequired === undefined) return badRequest("No updates provided");

    const { db } = await connectToDatabase();
    const result = await db.collection("coursematerials").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isRequired: !!body.isRequired, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) return notFound("Material not found");

    await logAdminActivity({
      admin,
      action: "update",
      resource: "coursematerials",
      resourceId: id,
      summary: `Updated material "${result.title}"`,
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin course material update error:", error);
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
    const target = await db.collection("coursematerials").findOne({ _id: new ObjectId(id) }, { projection: { title: 1 } });
    const result = await db.collection("coursematerials").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound("Material not found");

    await logAdminActivity({
      admin,
      action: "delete",
      resource: "coursematerials",
      resourceId: id,
      summary: `Deleted material "${target?.title || id}"`,
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin course material delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
