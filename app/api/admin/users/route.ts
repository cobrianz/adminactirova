import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest } from "@/lib/admin";
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

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const role = url.searchParams.get("role") || "";
    const status = url.searchParams.get("status") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));

    const { db } = await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ firstName: re }, { lastName: re }, { email: re }];
    }

    const [users, total] = await Promise.all([
      db
        .collection("users")
        .find(filter, { projection: PROJECTION })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      db.collection("users").countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const [libraryCounts, reportCounts] = await Promise.all([
      db
        .collection("library")
        .aggregate([{ $match: { userId: { $in: userIds } } }, { $group: { _id: "$userId", count: { $sum: 1 } } }])
        .toArray(),
      db
        .collection("reports")
        .aggregate([{ $match: { userId: { $in: userIds } } }, { $group: { _id: "$userId", count: { $sum: 1 } } }])
        .toArray(),
    ]);

    const libMap = new Map(libraryCounts.map((r) => [String(r._id), r.count]));
    const repMap = new Map(reportCounts.map((r) => [String(r._id), r.count]));

    return ok({
      users: users.map((u) => ({
        id: String(u._id),
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        email: u.email,
        role: u.role,
        status: u.status,
        emailVerified: !!u.emailVerified,
        isPremium: !!u.isPremium,
        credits: u.credits || 0,
        xp: u.xp || 0,
        level: u.level || 1,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin || null,
        courses: libMap.get(String(u._id)) || 0,
        reports: repMap.get(String(u._id)) || 0,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin users list error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

function parseIds(raw: string | null): ObjectId[] | null {
  const ids = (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0 || ids.some((s) => !ObjectId.isValid(s))) return null;
  return ids.map((s) => new ObjectId(s));
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const ids = parseIds(url.searchParams.get("ids"));
    if (!ids) return badRequest("Invalid ids");

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
    if (body.isPremium !== undefined) {
      updates.isPremium = !!body.isPremium;
    }

    if (Object.keys(updates).length === 0) return badRequest("No updates provided");
    if (ids.some((o) => String(o) === admin.id)) {
      return badRequest("You cannot change your own account");
    }

    const { db } = await connectToDatabase();
    const result = await db
      .collection("users")
      .updateMany({ _id: { $in: ids } }, { $set: { ...updates, updatedAt: new Date() } });

    return ok({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Admin users bulk update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const ids = parseIds(url.searchParams.get("ids"));
    if (!ids) return badRequest("Invalid ids");
    if (ids.some((o) => String(o) === admin.id)) {
      return badRequest("You cannot delete your own account");
    }

    const { db } = await connectToDatabase();
    const result = await db.collection("users").deleteMany({ _id: { $in: ids } });

    await Promise.allSettled(ids.map((oid) => deleteUserData(db, oid)));

    return ok({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Admin users bulk delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
