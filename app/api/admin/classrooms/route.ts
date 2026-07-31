import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));

    const { db } = await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (search) {
      const re = { $regex: search, $options: "i" };
      filter.$or = [{ name: re }, { subject: re }];
    }

    const [classrooms, total] = await Promise.all([
      db.collection("classrooms").find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection("classrooms").countDocuments(filter),
    ]);

    const ids = classrooms.map((c) => c._id);
    const instructorIds = [...new Set(classrooms.map((c) => String(c.instructorId)).filter((s) => ObjectId.isValid(s)))].map(
      (s) => new ObjectId(s)
    );

    const [enrollCounts, instructorUsers] = await Promise.all([
      ids.length
        ? db
            .collection("enrollments")
            .aggregate([{ $match: { classroomId: { $in: ids } } }, { $group: { _id: "$classroomId", count: { $sum: 1 } } }])
            .toArray()
        : [],
      instructorIds.length
        ? db
            .collection("users")
            .find({ _id: { $in: instructorIds } }, { projection: { firstName: 1, lastName: 1, email: 1 } })
            .toArray()
        : [],
    ]);

    const enrollMap = new Map(enrollCounts.map((r) => [String(r._id), r.count]));
    const instructorMap = new Map(instructorUsers.map((u) => [String(u._id), u]));

    return ok({
      classrooms: classrooms.map((c) => {
        const instructor = instructorMap.get(String(c.instructorId));
        const instructorName = instructor
          ? `${instructor.firstName || ""} ${instructor.lastName || ""}`.trim() || instructor.email || "—"
          : "—";
        return {
          id: String(c._id),
          name: c.name || "Untitled classroom",
          subject: c.subject || "",
          academicLevel: c.academicLevel || "",
          semester: c.semester || "",
          durationWeeks: c.durationWeeks || 0,
          isActive: !!c.isActive,
          inviteCode: c.inviteCode || "",
          maxStudents: c.maxStudents || 0,
          students: enrollMap.get(String(c._id)) || 0,
          instructorName,
          createdAt: c.createdAt,
        };
      }),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin classrooms list error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
