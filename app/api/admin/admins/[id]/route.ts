import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest, notFound, forbidden, isSuperAdmin } from "@/lib/admin";
import { logAdminActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();
  if (!isSuperAdmin(admin)) return forbidden("Only super admins can manage other admins");

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid admin id");

  try {
    const body = await req.json();
    const { db } = await connectToDatabase();
    const usersCol = db.collection("users");

    const target = await usersCol.findOne({ _id: new ObjectId(id) });
    if (!target || target.role !== "admin") return notFound("Admin not found");

    const updates: Record<string, unknown> = {};

    if (body.adminLevel !== undefined) {
      if (!["admin", "superadmin"].includes(body.adminLevel)) return badRequest("Invalid admin level");

      // Guard against locking everyone out: refuse to demote the last
      // remaining super admin, including via self-demotion.
      if (body.adminLevel === "admin" && (target.adminLevel ?? "superadmin") !== "admin") {
        const superAdminCount = await usersCol.countDocuments({
          role: "admin",
          adminLevel: { $ne: "admin" },
        });
        if (superAdminCount <= 1) {
          return badRequest("Cannot demote the last super admin");
        }
      }
      updates.adminLevel = body.adminLevel;
    }

    if (body.status !== undefined) {
      if (!["active", "suspended"].includes(body.status)) return badRequest("Invalid status");
      if (id === admin.id) return badRequest("You cannot change your own status");
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) return badRequest("No updates provided");

    const result = await usersCol.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after", projection: { password: 0, refreshTokens: 0 } }
    );

    await logAdminActivity({
      admin,
      action: body.adminLevel !== undefined ? "permission_change" : "status_change",
      resource: "admins",
      resourceId: id,
      summary: `Updated admin ${target.email}`,
      meta: updates,
    });

    return ok({ success: true, admin: result });
  } catch (error) {
    console.error("Admin update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
