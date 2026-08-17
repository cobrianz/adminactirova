import { connectToDatabase } from "./db";
import type { AdminSession } from "./admin";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "bulk_update"
  | "bulk_delete"
  | "role_change"
  | "status_change"
  | "permission_change"
  | "publish"
  | "unpublish"
  | "moderate";

export type AuditLogEntry = {
  _id: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  summary: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

/**
 * Records an admin action for the activity log. Every mutation route in the
 * panel should call this after a successful write — it's the only place
 * admin actions are tracked, since none of it existed before this pass.
 * Failures here are swallowed (logged to console only) so a logging hiccup
 * never blocks the actual admin action from completing.
 */
export async function logAdminActivity({
  admin,
  action,
  resource,
  resourceId,
  summary,
  meta,
}: {
  admin: AdminSession;
  action: AuditAction | string;
  resource: string;
  resourceId?: string | null;
  summary?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    const { db } = await connectToDatabase();
    await db.collection("admin_activity_log").insertOne({
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: `${admin.firstName} ${admin.lastName}`.trim() || admin.email,
      action,
      resource,
      resourceId: resourceId ?? null,
      summary: summary ?? null,
      meta: meta ?? null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to log admin activity:", err);
  }
}
