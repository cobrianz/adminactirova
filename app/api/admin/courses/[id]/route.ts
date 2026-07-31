import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, notFound } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid course id");

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.published !== undefined) updates.published = !!body.published;
    if (body.isPremium !== undefined) updates.isPremium = !!body.isPremium;
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) return ok({ error: "Invalid price" }, 400);
      updates.price = price;
    }

    if (Object.keys(updates).length === 0) return ok({ error: "No updates provided" }, 400);

    const { db } = await connectToDatabase();
    const result = await db.collection("courses").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) return notFound("Course not found");
    return ok({ success: true, course: result });
  } catch (error) {
    console.error("Admin course update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid course id");

  try {
    const { db } = await connectToDatabase();
    const oid = new ObjectId(id);

    const result = await db.collection("courses").deleteOne({ _id: oid });
    if (result.deletedCount === 0) return notFound("Course not found");

    await Promise.allSettled([
      db.collection("enrollments").deleteMany({ courseId: oid }),
      db.collection("premium_course_favorites").deleteMany({ courseId: oid }),
    ]);

    return ok({ success: true });
  } catch (error) {
    console.error("Admin course delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
