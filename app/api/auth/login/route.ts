import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyPassword, signAdminToken, adminTokenCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne({ email: String(email).toLowerCase().trim() });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(String(password), user.password);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.status === "suspended" || user.status === "inactive") {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 });
    }

    const token = signAdminToken(user as unknown as { _id: unknown; email: string; role: string });

    const res = NextResponse.json({
      admin: {
        id: String(user._id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
    res.headers.append("Set-Cookie", adminTokenCookie(token));
    return res;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
