import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30", 10) || 30));
    const adminEmail = url.searchParams.get("admin") || "";
    const action = url.searchParams.get("action") || "";
    const resource = url.searchParams.get("resource") || "";

    const filter: Record<string, unknown> = {};
    if (adminEmail) filter.adminEmail = adminEmail;
    if (action) filter.action = action;
    if (resource) filter.resource = resource;

    const { db } = await connectToDatabase();
    const col = db.collection("admin_activity_log");

    const [entries, total, distinctAdmins, distinctResources] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      col.countDocuments(filter),
      col.distinct("adminEmail"),
      col.distinct("resource"),
    ]);

    return ok({
      entries: entries.map((e) => ({
        id: String(e._id),
        adminEmail: e.adminEmail,
        adminName: e.adminName,
        action: e.action,
        resource: e.resource,
        resourceId: e.resourceId || null,
        summary: e.summary || null,
        meta: e.meta || null,
        createdAt: e.createdAt,
      })),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
      filters: { admins: distinctAdmins.sort(), resources: distinctResources.sort() },
    });
  } catch (error) {
    console.error("Admin activity list error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
