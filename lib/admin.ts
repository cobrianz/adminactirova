import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { connectToDatabase } from "./db";
import { readAdminToken, verifyAdminToken } from "./auth";

export type AdminLevel = "admin" | "superadmin";

export type AdminSession = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  adminLevel: AdminLevel;
};

export async function getAdminSession(req: Request): Promise<AdminSession | null> {
  const token = readAdminToken(req);
  if (!token) return null;

  const decoded = verifyAdminToken(token);
  if (!decoded) return null;

  const { db } = await connectToDatabase();
  const user = await db.collection("users").findOne({ _id: new ObjectId(decoded.id) });

  if (!user || user.role !== "admin" || user.status === "suspended" || user.status === "inactive") {
    return null;
  }

  return {
    id: String(user._id),
    email: user.email,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    role: user.role,
    // Accounts created before the permission tier existed default to
    // superadmin so nobody who already had full access loses it silently.
    // New admins should be explicitly assigned "admin" by a superadmin.
    adminLevel: (user.adminLevel === "admin" ? "admin" : "superadmin") as AdminLevel,
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
