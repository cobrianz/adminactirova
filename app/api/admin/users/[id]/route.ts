import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest, notFound } from "@/lib/admin";
import { deleteUserData } from "@/lib/userCascade";

export const dynamic = "force-dynamic";

const PROJECTION = {
  password: 0,
  refreshTokens: 0,
  emailVerificationToken: 0,
  emailVerificationExpires: 0,
  passwordResetCode: 0,
  passwordResetExpires: 0,
  pushSubscriptions: 0,
};

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid user id");

  try {
    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) }, { projection: PROJECTION });
    if (!user) return notFound("User not found");

    const [library, reports, exams, chatCount, quizzes, flashcards, enrollments, pdfs, certificates, notes, recentChats, studyPlans, studentProgress] = await Promise.all([
      db
        .collection("library")
        .find({ userId: user._id }, { projection: { title: 1, topic: 1, difficulty: 1, progress: 1, completed: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      db
        .collection("reports")
        .find({ userId: user._id }, { projection: { title: 1, course: 1, status: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      db.collection("exams").countDocuments({ userId: user._id }),
      db.collection("chats").countDocuments({ userId: user._id }),
      db
        .collection("tests")
        .find({ userId: user._id }, { projection: { title: 1, course: 1, difficulty: 1, createdAt: 1, performances: 1 } })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      db
        .collection("cardSets")
        .find(
          { userId: user._id },
          { projection: { title: 1, topic: 1, difficulty: 1, totalCards: 1, progress: 1, completed: 1, createdAt: 1, lastAccessed: 1 } }
        )
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      db
        .collection("enrollments")
        .find({ studentId: user._id }, { projection: { classroomId: 1, status: 1, joinedAt: 1 } })
        .sort({ joinedAt: -1 })
        .limit(100)
        .toArray(),
      db
        .collection("pdfdocuments")
        .find({ userId: user._id }, { projection: { fileName: 1, fileSizeMB: 1, pages: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      db
        .collection("certificates")
        .find({ userId: user._id }, { projection: { title: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      db
        .collection("user_notes")
        .find({ userId: user._id }, { projection: { title: 1, content: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      db
        .collection("chats")
        .find({ userId: user._id }, { projection: { topic: 1, createdAt: 1, lastMessageAt: 1 } })
        .sort({ lastMessageAt: -1 })
        .limit(10)
        .toArray(),
      db
        .collection("library")
        .find({ userId: user._id, format: "study_plan" }, { projection: { title: 1, topic: 1, progress: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      db
        .collection("studentprogresses")
        .find(
          { studentId: user._id },
          { projection: { assignmentId: 1, classroomId: 1, status: 1, score: 1, progress: 1, updatedAt: 1 } }
        )
        .sort({ updatedAt: -1 })
        .limit(50)
        .toArray(),
    ]);

    // Join enrollments → classrooms → instructor names
    const classIds = enrollments.map((e) => e.classroomId).filter(Boolean);
    const classroomDocs = classIds.length
      ? await db
          .collection("classrooms")
          .find({ _id: { $in: classIds } }, { projection: { name: 1, subject: 1, instructorId: 1 } })
          .toArray()
      : [];
    const classroomMap = new Map(classroomDocs.map((c) => [String(c._id), c]));
    const instructorIds = [...new Set(classroomDocs.map((c) => c.instructorId).filter(Boolean))];
    const instructorDocs = instructorIds.length
      ? await db
          .collection("users")
          .find({ _id: { $in: instructorIds } }, { projection: { name: 1, email: 1 } })
          .toArray()
      : [];
    const instructorMap = new Map(instructorDocs.map((i) => [String(i._id), i]));

    const classes = enrollments.map((e) => {
      const cr = classroomMap.get(String(e.classroomId));
      const inst = cr ? instructorMap.get(String(cr.instructorId)) : null;
      return {
        id: String(e._id),
        classroomId: String(e.classroomId),
        name: cr?.name || "Unknown class",
        subject: cr?.subject || "",
        instructor: inst?.name || inst?.email || "",
        status: e.status || "active",
        joinedAt: e.joinedAt || null,
      };
    });

    // Join student progress → assignments → classroom names
    const assignmentIds = studentProgress.map((p) => p.assignmentId).filter(Boolean);
    const assignmentDocs = assignmentIds.length
      ? await db
          .collection("assignments")
          .find({ _id: { $in: assignmentIds } }, { projection: { title: 1, classroomId: 1 } })
          .toArray()
      : [];
    const assignmentMap = new Map(assignmentDocs.map((a) => [String(a._id), a]));

    const assignments = studentProgress.map((p) => {
      const a = assignmentMap.get(String(p.assignmentId));
      const cr = a ? classroomMap.get(String(a.classroomId)) : null;
      return {
        id: String(p._id),
        title: a?.title || "Assignment",
        className: cr?.name || "",
        status: p.status || "",
        score: p.score ?? null,
        progress: p.progress || 0,
        updatedAt: p.updatedAt || null,
      };
    });

    return ok({
      user: {
        id: String(user._id),
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: !!user.emailVerified,
        isPremium: !!user.isPremium,
        credits: user.credits || 0,
        xp: user.xp || 0,
        level: user.level || 1,
        streak: user.streak?.current || 0,
        longestStreak: user.streak?.longest || 0,
        dailyXp: user.dailyXp || 0,
        dailyXpDate: user.dailyXpDate || "",
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || null,
        interests: user.interests || [],
        interestCategories: user.interestCategories || [],
        goals: user.goals || [],
        skillLevel: user.skillLevel || "",
        timeCommitment: user.timeCommitment || "",
        ageGroup: user.ageGroup || "",
        educationLevel: user.educationLevel || "",
        learningStyle: user.learningStyle || "",
        onboardingCompleted: !!user.onboardingCompleted,
        settings: user.settings || {},
        subscription: user.subscription || null,
        billingHistory: (user.billingHistory || []).slice(-10).reverse(),
        purchasedItems: user.purchasedItems || [],
        usage: user.usage || {},
        achievements: (user.achievements || []).slice(-10).reverse(),
      },
      library,
      reports,
      quizzes: quizzes.map((t) => ({
        _id: String(t._id),
        title: t.title || "Untitled quiz",
        course: t.course || "",
        difficulty: t.difficulty || "",
        createdAt: t.createdAt || null,
        attempts: (t.performances || []).length,
        bestScore: Math.round(
          Math.max(
            0,
            ...((t.performances || []) as { percentage?: unknown }[]).map(
              (p) => Number(p.percentage) || 0
            )
          )
        ),
      })),
      flashcards: flashcards.map((c) => ({
        _id: String(c._id),
        title: c.title || "Untitled set",
        topic: c.topic || "",
        difficulty: c.difficulty || "",
        totalCards: c.totalCards || 0,
        progress: c.progress || 0,
        completed: !!c.completed,
        createdAt: c.createdAt || null,
        lastAccessed: c.lastAccessed || null,
      })),
      classes,
      assignments,
      pdfs: pdfs.map((p) => ({
        _id: String(p._id),
        fileName: p.fileName || "Untitled PDF",
        fileSizeMB: p.fileSizeMB || "",
        pageCount: (p.pages || []).length,
        createdAt: p.createdAt || null,
      })),
      certificates: certificates.map((c) => ({
        _id: String(c._id),
        title: c.title || "Certificate",
        createdAt: c.createdAt || null,
      })),
      notes: notes.map((n) => ({
        _id: String(n._id),
        title: n.title || "Untitled note",
        content: n.content || "",
        createdAt: n.createdAt || null,
      })),
      chats: recentChats.map((c) => ({
        _id: String(c._id),
        topic: c.topic || "Untitled chat",
        createdAt: c.createdAt || null,
        lastMessageAt: c.lastMessageAt || null,
      })),
      studyPlans: studyPlans.map((s) => ({
        _id: String(s._id),
        title: s.title || "Study plan",
        topic: s.topic || "",
        progress: s.progress || 0,
        createdAt: s.createdAt || null,
      })),
      exams,
      chatCount,
    });
  } catch (error) {
    console.error("Admin user detail error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid user id");

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!["active", "inactive", "suspended", "pending"].includes(body.status)) {
        return badRequest("Invalid status");
      }
      updates.status = body.status;
    }
    if (body.role !== undefined) {
      if (!["student", "instructor", "admin"].includes(body.role)) {
        return badRequest("Invalid role");
      }
      updates.role = body.role;
    }
    if (body.credits !== undefined) {
      const credits = Number(body.credits);
      if (!Number.isFinite(credits) || credits < 0) return badRequest("Invalid credits");
      updates.credits = credits;
    }
    if (body.isPremium !== undefined) {
      updates.isPremium = !!body.isPremium;
    }

    if (Object.keys(updates).length === 0) return badRequest("No updates provided");

    const { db } = await connectToDatabase();
    const result = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after", projection: PROJECTION }
    );

    if (!result) return notFound("User not found");
    return ok({ success: true, user: result });
  } catch (error) {
    console.error("Admin user update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid user id");
  if (id === admin.id) return badRequest("You cannot delete your own account");

  try {
    const { db } = await connectToDatabase();
    const oid = new ObjectId(id);

    const result = await db.collection("users").deleteOne({ _id: oid });
    if (result.deletedCount === 0) return notFound("User not found");

    await deleteUserData(db, oid);

    return ok({ success: true });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
