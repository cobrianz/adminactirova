import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { connectToDatabase } from "./db";
import { readAdminToken, verifyAdminToken } from "./auth";

export type AdminLevel = "admin" | "superadmin";

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  adminLevel: AdminLevel;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF defense: for mutating requests, require the Origin (or Referer) to
 * match the Host serving the request. Browsers always attach Origin to
 * cross-origin mutations, so a mismatch means the request did not originate
 * from the admin panel. Requests without either header (non-browser clients)
 * are allowed through — SameSite=Lax already blocks cross-site cookie sends.
 */
export function isSameOriginRequest(req: Request): boolean {
  if (!MUTATING_METHODS.has((req.method || "GET").toUpperCase())) return true;

  const source = req.headers.get("origin") || req.headers.get("referer");
  if (!source) return true;

  const host = req.headers.get("host");
  if (!host) return false;

  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

export async function getAdminSession(req: Request): Promise<AdminSession | null> {
  if (!isSameOriginRequest(req)) return null;

  const token = readAdminToken(req);
  if (!token) return null;

  const decoded = verifyAdminToken(token);
  if (!decoded) return null;

  if (!ObjectId.isValid(decoded.id)) return null;

  const { db } = await connectToDatabase();
  const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.id) });

  const blockedStatuses = ["suspended", "inactive", "pending"];
  if (!user || user.role !== "admin" || blockedStatuses.includes(user.status)) {
    return null;
  }

  return {
    id: String(user._id),
    email: user.email,
    name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    role: user.role,
    // Fail closed: only an explicit "superadmin" grants super admin access.
    // Legacy accounts were migrated to an explicit value, and promotions set
    // "admin" explicitly, so anything else must be a plain admin.
    adminLevel: (user.adminLevel === "superadmin" ? "superadmin" : "admin") as AdminLevel,
  };
}

export function isSuperAdmin(admin: AdminSession): boolean {
  return admin.adminLevel === "superadmin";
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "This action requires super admin access") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message = "Bad request") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
