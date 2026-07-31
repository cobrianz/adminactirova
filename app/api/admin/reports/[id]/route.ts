import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, notFound } from "@/lib/admin";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid report id");

  try {
    const { db } = await connectToDatabase();
    const report = await db.collection("reports").findOne({ _id: new ObjectId(id) });
    if (!report) return notFound("Report not found");

    const user = report.userId
      ? await db
          .collection("users")
          .findOne({ _id: new ObjectId(String(report.userId)) }, { projection: { firstName: 1, lastName: 1, email: 1 } })
      : null;

    const owner = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "—"
      : "—";

    return ok({
      report: {
        id: String(report._id),
        title: report.title || "Untitled",
        course: report.course || "",
        topic: report.topic || "",
        status: report.status || "draft",
        wordCount:
          report.sections?.reduce?.((sum: number, s: { content?: string }) => sum + (s.content || "").split(/\s+/).length, 0) || 0,
        owner,
        email: user?.email || "",
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        sections: report.sections || [],
      },
    });
  } catch (error) {
    console.error("Admin report detail error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid report id");

  try {
    const { db } = await connectToDatabase();
    const result = await db.collection("reports").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound("Report not found");
    return ok({ success: true });
  } catch (error) {
    console.error("Admin report delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
