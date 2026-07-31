import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest, notFound } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid post id");

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!["published", "draft"].includes(body.status)) return badRequest("Invalid status");
      updates.status = body.status;
      if (body.status === "published") updates.publishedAt = new Date();
    }
    if (body.featured !== undefined) updates.featured = !!body.featured;
    if (body.title !== undefined) updates.title = body.title;
    if (body.category !== undefined) updates.category = body.category;
    if (body.summary !== undefined) updates.summary = body.summary;
    if (body.content !== undefined) {
      updates.content = body.content;
      updates.readTime = Math.max(1, Math.round(body.content.split(/\s+/).length / 200));
    }

    if (Object.keys(updates).length === 0) return badRequest("No updates provided");

    const { db } = await connectToDatabase();
    const result = await db.collection("posts").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) return notFound("Post not found");
    return ok({ success: true, post: result });
  } catch (error) {
    console.error("Admin blog update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid post id");

  try {
    const { db } = await connectToDatabase();
    const result = await db.collection("posts").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound("Post not found");
    return ok({ success: true });
  } catch (error) {
    console.error("Admin blog delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
