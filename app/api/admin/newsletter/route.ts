import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));

    const { db } = await connectToDatabase();
    const subscribers = await db
      .collection("newsletters")
      .find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const [total, subscribed] = await Promise.all([
      db.collection("newsletters").countDocuments(),
      db.collection("newsletters").countDocuments({ status: "subscribed" }),
    ]);

    return ok({
      subscribers: subscribers.map((s) => ({
        id: String(s._id),
        email: s.email,
        status: s.status || "subscribed",
        createdAt: s.createdAt,
      })),
      total,
      subscribed,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin newsletter error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  try {
    const body = await req.json().catch(() => null);
    const email = body?.email?.trim();
    if (!email) return ok({ error: "Email is required" }, 400);

    const { db } = await connectToDatabase();
    const result = await db.collection("newsletters").deleteOne({ email: String(email).toLowerCase() });
    if (result.deletedCount === 0) return ok({ error: "Subscriber not found" }, 404);
    return ok({ success: true });
  } catch (error) {
    console.error("Admin newsletter delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
