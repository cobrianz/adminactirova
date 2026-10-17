import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest, forbidden, isSuperAdmin } from "@/lib/admin";
import { deleteUserData } from "@/lib/userCascade";
import { logAdminActivity } from "@/lib/auditLog";

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
      filter.$or = [{ name: re }, { firstName: re }, { lastName: re }, { email: re }];
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
        name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
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
      if (!isSuperAdmin(admin)) return forbidden("Only super admins can change a user's role");
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
    const usersCol = db.collection("users");

    if (body.role !== undefined && body.role !== "admin") {
      // Mirror the admins API: refuse to remove the last remaining super
      // admin via a bulk demotion.
      const superAdminsInSelection = await usersCol.countDocuments({
        _id: { $in: ids },
        role: "admin",
        adminLevel: { $ne: "admin" },
      });
      if (superAdminsInSelection > 0) {
        const superAdminCount = await usersCol.countDocuments({
          role: "admin",
          adminLevel: { $ne: "admin" },
        });
        if (superAdminsInSelection >= superAdminCount) {
          return badRequest("Cannot demote the last super admin");
        }
      }
    }

    if (body.role === "admin") {
      // Promotions must never silently inherit super admin — split the
      // selection so only non-admins get the role change plus the explicit
      // least-privilege level, while existing admins keep their level.
      const alreadyAdmins = await usersCol
        .find({ _id: { $in: ids }, role: "admin" }, { projection: { _id: 1 } })
        .toArray();
      const alreadyAdminIds = new Set(alreadyAdmins.map((u) => String(u._id)));
      const promotedIds = ids.filter((oid) => !alreadyAdminIds.has(String(oid)));
      const restUpdates: Record<string, unknown> = { ...updates };
      delete restUpdates.role;

      let modifiedCount = 0;
      if (promotedIds.length > 0) {
        const promoted = await usersCol.updateMany(
          { _id: { $in: promotedIds } },
          { $set: { ...updates, adminLevel: "admin", updatedAt: new Date() } }
        );
        modifiedCount += promoted.modifiedCount;
      }
      if (alreadyAdminIds.size > 0 && Object.keys(restUpdates).length > 0) {
        const existing = await usersCol.updateMany(
          { _id: { $in: ids.filter((oid) => alreadyAdminIds.has(String(oid))) } },
          { $set: { ...restUpdates, updatedAt: new Date() } }
        );
        modifiedCount += existing.modifiedCount;
      }

      await logAdminActivity({
        admin,
        action: "role_change",
        resource: "users",
        summary: `Bulk-updated ${modifiedCount} user(s)`,
        meta: { ids: ids.map(String), ...updates },
      });

      return ok({ success: true, modifiedCount });
    }

    const result = await usersCol.updateMany(
      { _id: { $in: ids } },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    await logAdminActivity({
      admin,
      action: body.role !== undefined ? "role_change" : "bulk_update",
      resource: "users",
      summary: `Bulk-updated ${result.modifiedCount} user(s)`,
      meta: { ids: ids.map(String), ...updates },
    });

    return ok({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Admin users bulk update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();
  if (!isSuperAdmin(admin)) return forbidden("Only super admins can delete users");

  try {
    const url = new URL(req.url);
    const ids = parseIds(url.searchParams.get("ids"));
    if (!ids) return badRequest("Invalid ids");
    if (ids.some((o) => String(o) === admin.id)) {
      return badRequest("You cannot delete your own account");
    }

    const { db } = await connectToDatabase();
    const usersCol = db.collection("users");

    const superAdminsInSelection = await usersCol.countDocuments({
      _id: { $in: ids },
      role: "admin",
      adminLevel: { $ne: "admin" },
    });
    if (superAdminsInSelection > 0) {
      const superAdminCount = await usersCol.countDocuments({
        role: "admin",
        adminLevel: { $ne: "admin" },
      });
      if (superAdminsInSelection >= superAdminCount) {
        return badRequest("Cannot delete the last super admin");
      }
    }

    const result = await usersCol.deleteMany({ _id: { $in: ids } });

    await Promise.allSettled(ids.map((oid) => deleteUserData(db, oid)));
    await logAdminActivity({
      admin,
      action: "bulk_delete",
      resource: "users",
      summary: `Bulk-deleted ${result.deletedCount} user(s)`,
      meta: { ids: ids.map(String) },
    });

    return ok({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Admin users bulk delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
