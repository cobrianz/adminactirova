import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, forbidden, isSuperAdmin, ok, notFound } from "@/lib/admin";
import { logAdminActivity } from "@/lib/auditLog";

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

    // The main app gates visibility with `isPublished` while legacy docs
    // use `published` — keep both in sync so toggling works everywhere.
    if (body.published !== undefined) {
      updates.published = !!body.published;
      updates.isPublished = !!body.published;
    }
    if (body.isPremium !== undefined) updates.isPremium = !!body.isPremium;
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) return ok({ error: "Invalid price" }, 400);
      updates.price = price;
    }
    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return ok({ error: "Title cannot be empty" }, 400);
      updates.title = title;
    }
    if (body.description !== undefined) updates.description = String(body.description);
    if (body.category !== undefined) updates.category = String(body.category).trim();
    if (body.level !== undefined || body.difficulty !== undefined) {
      updates.difficulty = String(body.level ?? body.difficulty).trim().toLowerCase();
    }
    if (body.duration !== undefined) updates.duration = String(body.duration).trim();
    if (body.instructor !== undefined) updates.instructor = String(body.instructor).trim();

    if (Object.keys(updates).length === 0) return ok({ error: "No updates provided" }, 400);

    const { db } = await connectToDatabase();
    const result = await db.collection("courses").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) return notFound("Course not found");

    await logAdminActivity({
      admin,
      action: "update",
      resource: "courses",
      resourceId: id,
      summary: `Updated course "${result.title || id}"`,
      meta: { fields: Object.keys(updates) },
    });

    return ok({ success: true, course: result });
  } catch (error) {
    console.error("Admin course update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();
  if (!isSuperAdmin(admin)) return forbidden();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid course id");

  try {
    const { db } = await connectToDatabase();
    const oid = new ObjectId(id);

    const course = await db.collection("courses").findOne({ _id: oid }, { projection: { title: 1 } });
    const result = await db.collection("courses").deleteOne({ _id: oid });
    if (result.deletedCount === 0) return notFound("Course not found");

    await Promise.allSettled([
      db.collection("enrollments").deleteMany({ courseId: oid }),
    ]);

    await logAdminActivity({
      admin,
      action: "delete",
      resource: "courses",
      resourceId: id,
      summary: `Deleted course "${course?.title || id}" (cascaded enrollments)`,
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin course delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
