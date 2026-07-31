import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest, notFound } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid notice id");

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.active !== undefined) updates.active = !!body.active;
    if (body.title !== undefined) updates.title = body.title;
    if (body.message !== undefined) updates.message = body.message;
    if (body.variant !== undefined) updates.variant = body.variant;
    if (body.priority !== undefined) updates.priority = Number(body.priority) || 0;
    if (body.key !== undefined) updates.key = body.key;

    if (Object.keys(updates).length === 0) return badRequest("No updates provided");

    const { db } = await connectToDatabase();
    const result = await db.collection("site_notices").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) return notFound("Notice not found");
    return ok({ success: true });
  } catch (error) {
    console.error("Admin notice update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid notice id");

  try {
    const { db } = await connectToDatabase();
    const result = await db.collection("site_notices").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound("Notice not found");
    return ok({ success: true });
  } catch (error) {
    console.error("Admin notice delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
