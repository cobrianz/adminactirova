import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyPassword, signAdminToken, adminTokenCookie } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/admin";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours — mirrors the main app's User.incLoginAttempts

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const users = db.collection("users");
    const user = await users.findOne({ email: String(email).toLowerCase().trim() });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Same lockUntil/loginAttempts fields the main app's User model uses —
    // shared users collection, so a lockout here also protects that login path.
    const isLocked = !!(user.lockUntil && new Date(user.lockUntil).getTime() > Date.now());
    if (isLocked) {
      return NextResponse.json(
        { error: "Account is temporarily locked due to too many failed login attempts. Try again later." },
        { status: 423 }
      );
    }

    const ok = await verifyPassword(String(password), user.password);
    if (!ok) {
      // If a previous lock has expired, restart the counter at 1
      if (user.lockUntil && new Date(user.lockUntil).getTime() < Date.now()) {
        await users.updateOne({ _id: user._id }, { $unset: { lockUntil: 1 }, $set: { loginAttempts: 1 } });
      } else {
        const nextAttempts = (user.loginAttempts || 0) + 1;
        const update: Record<string, unknown> = { $inc: { loginAttempts: 1 } };
        if (nextAttempts >= MAX_ATTEMPTS) {
          update.$set = { lockUntil: new Date(Date.now() + LOCK_DURATION_MS) };
        }
        await users.updateOne({ _id: user._id }, update);
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status === "suspended" || user.status === "inactive") {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 });
    }

    // Successful login — clear any prior failed-attempt tracking
    if (user.loginAttempts || user.lockUntil) {
      await users.updateOne({ _id: user._id }, { $unset: { loginAttempts: 1, lockUntil: 1 } });
    }

    const token = signAdminToken(user as unknown as { _id: unknown; email: string; role: string });

    const res = NextResponse.json({
      admin: {
        id: String(user._id),
        email: user.email,
        name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        adminLevel: user.adminLevel === "superadmin" ? "superadmin" : "admin",
      },
    });
    res.headers.append("Set-Cookie", adminTokenCookie(token));
    return res;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
