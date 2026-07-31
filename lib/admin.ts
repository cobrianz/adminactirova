import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { connectToDatabase } from "./db";
import { readAdminToken, verifyAdminToken } from "./auth";

export type AdminSession = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
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
  };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
