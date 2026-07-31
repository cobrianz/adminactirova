import { ObjectId, type Db } from "mongodb";

const USER_CASCADE: { collection: string; field: string }[] = [
  { collection: "library", field: "userId" },
  { collection: "reports", field: "userId" },
  { collection: "exams", field: "userId" },
  { collection: "chats", field: "userId" },
  { collection: "ai_conversations", field: "userId" },
  { collection: "sessions", field: "userId" },
  { collection: "notifications", field: "userId" },
  { collection: "pdfdocuments", field: "userId" },
  { collection: "pdfchats", field: "userId" },
  { collection: "cardSets", field: "userId" },
  { collection: "careerhistories", field: "userId" },
  { collection: "personalizeddiscoveries", field: "userId" },
  { collection: "premium_generation_intents", field: "userId" },
  { collection: "api_usage", field: "userId" },
  { collection: "user_library", field: "userId" },
  { collection: "user_notes", field: "userId" },
  { collection: "course_notes", field: "userId" },
  { collection: "studentprogresses", field: "studentId" },
  { collection: "classroommessages", field: "senderId" },
  { collection: "discussionposts", field: "authorId" },
];

export async function deleteUserData(db: Db, oid: ObjectId) {
  const queries: { collection: string; query: Record<string, unknown> }[] = USER_CASCADE.map((c) => ({
    collection: c.collection,
    query: { [c.field]: oid },
  }));
  queries.push({
    collection: "enrollments",
    query: { $or: [{ studentId: oid }, { userId: oid }] },
  });
  await Promise.allSettled(queries.map((q) => db.collection(q.collection).deleteMany(q.query)));
}
