import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, notFound } from "@/lib/admin";

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
          .findOne({ _id: new ObjectId(String(classroom.instructorId)) }, { projection: { firstName: 1, lastName: 1, email: 1 } })
      : null;

    const [assignments, discussions, materials, notes, messages, enrollments, progress] = await Promise.all([
      db.collection("assignments").countDocuments({ classroomId: oid }),
      db.collection("discussions").countDocuments({ classroomId: oid }),
      db.collection("coursematerials").countDocuments({ classroomId: oid }),
      db.collection("coursenotes").countDocuments({ classroomId: oid }),
      db.collection("classroommessages").countDocuments({ classroomId: oid }),
      db.collection("enrollments").countDocuments({ classroomId: oid }),
      db.collection("studentprogresses").countDocuments({ classroomId: oid }),
    ]);

    const instructorName = instructor
      ? `${instructor.firstName || ""} ${instructor.lastName || ""}`.trim() || instructor.email || "—"
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
