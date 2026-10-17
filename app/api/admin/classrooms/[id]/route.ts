import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest, notFound } from "@/lib/admin";
import { logAdminActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid classroom id");

  try {
    const { db } = await connectToDatabase();
    const oid = new ObjectId(id);
    const classroom = await db.collection("classrooms").findOne({ _id: oid });
    if (!classroom) return notFound("Classroom not found");

    const instructor = classroom.instructorId
      ? await db
          .collection("users")
          .findOne({ _id: new ObjectId(String(classroom.instructorId)) }, { projection: { name: 1, firstName: 1, lastName: 1, email: 1 } })
      : null;

    const [assignments, discussions, materials, notes, messages, enrollments, progress] = await Promise.all([
      db.collection("assignments").countDocuments({ classroomId: oid }),
      db.collection("discussions").countDocuments({ classroomId: oid }),
      db.collection("coursematerials").countDocuments({ classroomId: oid }),
      db.collection("course_notes").countDocuments({ classroomId: oid }),
      db.collection("classroommessages").countDocuments({ classroomId: oid }),
      db.collection("enrollments").countDocuments({ classroomId: oid, status: "active" }),
      db.collection("studentprogresses").countDocuments({ classroomId: oid }),
    ]);

    const instructorName = instructor
      ? instructor.name || `${instructor.firstName || ""} ${instructor.lastName || ""}`.trim() || instructor.email || "—"
      : "—";

    return ok({
      classroom: {
        id: String(classroom._id),
        name: classroom.name || "Untitled classroom",
        description: classroom.description || "",
        subject: classroom.subject || "",
        academicLevel: classroom.academicLevel || "",
        semester: classroom.semester || "",
        durationWeeks: classroom.durationWeeks || 0,
        inviteCode: classroom.inviteCode || "",
        maxStudents: classroom.maxStudents || 0,
        isActive: !!classroom.isActive,
        createdAt: classroom.createdAt,
        updatedAt: classroom.updatedAt,
        instructorName,
      },
      counts: {
        assignments,
        discussions,
        materials,
        notes,
        messages,
        enrollments,
        progress,
      },
    });
  } catch (error) {
    console.error("Admin classroom detail error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid classroom id");

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return badRequest("Name cannot be empty");
      updates.name = name;
    }
    if (body.description !== undefined) updates.description = String(body.description);
    if (body.subject !== undefined) updates.subject = String(body.subject).trim();
    if (body.academicLevel !== undefined) updates.academicLevel = String(body.academicLevel).trim();
    if (body.semester !== undefined) updates.semester = String(body.semester).trim();
    if (body.durationWeeks !== undefined) {
      const weeks = Number(body.durationWeeks);
      if (!Number.isFinite(weeks) || weeks < 0) return badRequest("Invalid duration");
      updates.durationWeeks = Math.round(weeks);
    }
    if (body.maxStudents !== undefined) {
      const max = Number(body.maxStudents);
      if (!Number.isFinite(max) || max < 0) return badRequest("Invalid max students");
      updates.maxStudents = Math.round(max);
    }
    if (body.isActive !== undefined) updates.isActive = !!body.isActive;

    if (Object.keys(updates).length === 0) return badRequest("No updates provided");

    const { db } = await connectToDatabase();
    const result = await db
      .collection("classrooms")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: "after", projection: { name: 1 } }
      );
    if (!result) return notFound("Classroom not found");

    await logAdminActivity({
      admin,
      action: "update",
      resource: "classrooms",
      resourceId: id,
      summary: `Updated classroom "${result.name || id}"`,
      meta: { fields: Object.keys(updates) },
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin classroom update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
