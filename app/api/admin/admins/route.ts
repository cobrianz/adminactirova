import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";

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
    const { db } = await connectToDatabase();
    const admins = await db
      .collection("users")
      .find({ role: "admin" }, { projection: PROJECTION })
      .sort({ createdAt: 1 })
      .toArray();

    const superAdminCount = admins.filter((a) => a.adminLevel !== "admin").length;

    return ok({
      admins: admins.map((a) => ({
        id: String(a._id),
        firstName: a.firstName || "",
        lastName: a.lastName || "",
        email: a.email,
        status: a.status,
        adminLevel: a.adminLevel === "admin" ? "admin" : "superadmin",
        lastLogin: a.lastLogin || null,
        createdAt: a.createdAt || null,
        isSelf: String(a._id) === admin.id,
      })),
      superAdminCount,
      currentAdminLevel: admin.adminLevel,
    });
  } catch (error) {
    console.error("Admin list error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
