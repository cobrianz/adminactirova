import type { Db, ObjectId } from "mongodb";

/**
 * Shared helper for the classroom-content admin routes (assignments,
 * discussions, enrollments, course materials) — they all reference a
 * classroomId and need the classroom's display name for the admin table.
 */
export async function classroomNameMap(db: Db, classroomIds: ObjectId[]): Promise<Map<string, string>> {
  if (classroomIds.length === 0) return new Map();
  const docs = await db
    .collection("classrooms")
    .find({ _id: { $in: classroomIds } }, { projection: { name: 1, subject: 1 } })
    .toArray();
  return new Map(docs.map((c) => [String(c._id), c.name || c.subject || "Unnamed classroom"]));
}

export async function userNameMap(db: Db, userIds: ObjectId[]): Promise<Map<string, { name: string; email: string }>> {
  if (userIds.length === 0) return new Map();
  const docs = await db
    .collection("users")
    .find({ _id: { $in: userIds } }, { projection: { firstName: 1, lastName: 1, email: 1 } })
    .toArray();
  return new Map(
    docs.map((u) => [
      String(u._id),
      { name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email, email: u.email },
    ])
  );
}
