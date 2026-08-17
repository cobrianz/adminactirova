import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest, forbidden, isSuperAdmin } from "@/lib/admin";
import { logAdminActivity } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

const SETTINGS_ID = "platform";

const DEFAULTS = {
  siteName: "Actirova AI Tutor",
  supportEmail: "",
  maintenanceMode: false,
  maintenanceMessage: "We're performing scheduled maintenance. Please check back shortly.",
  allowSignups: true,
  featuredAnnouncement: "",
};

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const { db } = await connectToDatabase();
    const doc = await db.collection("settings").findOne({ key: SETTINGS_ID });
    return ok({ settings: { ...DEFAULTS, ...(doc || {}) } });
  } catch (error) {
    console.error("Admin settings fetch error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();
  if (!isSuperAdmin(admin)) return forbidden("Only super admins can change platform settings");

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    for (const key of Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) return badRequest("No updates provided");

    const { db } = await connectToDatabase();
    await db.collection("settings").updateOne(
      { key: SETTINGS_ID },
      { $set: { ...updates, updatedAt: new Date(), updatedBy: admin.email }, $setOnInsert: { key: SETTINGS_ID } },
      { upsert: true }
    );

    await logAdminActivity({
      admin,
      action: "update",
      resource: "settings",
      summary: "Updated platform settings",
      meta: updates,
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin settings update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
