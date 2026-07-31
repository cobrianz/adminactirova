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

    const [library, reports, exams, chatCount] = await Promise.all([
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
    ]);

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
