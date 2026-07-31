import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest, notFound } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid message id");

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!["new", "in-progress", "resolved", "closed"].includes(body.status)) {
        return badRequest("Invalid status");
      }
      updates.status = body.status;
    }
    if (body.adminNotes !== undefined) updates.adminNotes = String(body.adminNotes).slice(0, 2000);

    if (Object.keys(updates).length === 0) return badRequest("No updates provided");

    const { db } = await connectToDatabase();
    const result = await db.collection("contacts").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) return notFound("Message not found");
    return ok({ success: true });
  } catch (error) {
    console.error("Admin contact update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid message id");

  try {
    const { db } = await connectToDatabase();
    const result = await db.collection("contacts").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound("Message not found");
    return ok({ success: true });
  } catch (error) {
    console.error("Admin contact delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
