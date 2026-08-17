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
    const status = url.searchParams.get("status") || "";
    const classroomId = url.searchParams.get("classroomId") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));

    const { db } = await connectToDatabase();
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (classroomId && ObjectId.isValid(classroomId)) filter.classroomId = new ObjectId(classroomId);

    const [items, total] = await Promise.all([
      db.collection("enrollments").find(filter).sort({ joinedAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection("enrollments").countDocuments(filter),
    ]);

    const classrooms = await classroomNameMap(db, items.map((i) => i.classroomId).filter(Boolean));
    const students = await userNameMap(db, items.map((i) => i.studentId).filter(Boolean));

    return ok({
      items: items.map((e) => ({
        id: String(e._id),
        classroom: classrooms.get(String(e.classroomId)) || "—",
        student: students.get(String(e.studentId))?.name || "—",
        studentEmail: students.get(String(e.studentId))?.email || "",
        status: e.status || "active",
        joinedAt: e.joinedAt || e.createdAt,
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Admin enrollments list error:", error);
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
    if (!["active", "removed", "left"].includes(body.status)) return badRequest("Invalid status");

    const { db } = await connectToDatabase();
    const result = await db.collection("enrollments").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status: body.status, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) return notFound("Enrollment not found");

    await logAdminActivity({
      admin,
      action: "status_change",
      resource: "enrollments",
      resourceId: id,
      summary: `Set enrollment status to "${body.status}"`,
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin enrollment update error:", error);
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
    const result = await db.collection("enrollments").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound("Enrollment not found");

    await logAdminActivity({
      admin,
      action: "delete",
      resource: "enrollments",
      resourceId: id,
      summary: "Deleted an enrollment",
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin enrollment delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
