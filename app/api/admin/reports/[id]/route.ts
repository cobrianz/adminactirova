import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, notFound } from "@/lib/admin";
import { logAdminActivity } from "@/lib/auditLog";
import { htmlToText, reportWordCount } from "@/lib/reportText";

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
          .findOne({ _id: new ObjectId(String(report.userId)) }, { projection: { name: 1, firstName: 1, lastName: 1, email: 1 } })
      : null;

    const owner = user
      ? user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "—"
      : "—";

    const fullContent = typeof report.fullContent === "string" ? report.fullContent : "";

    return ok({
      report: {
        id: String(report._id),
        title: report.title || "Untitled",
        course: report.courseName || report.course || "",
        topic: report.topic || "",
        status: report.status || "draft",
        wordCount: reportWordCount(report),
        owner,
        email: user?.email || "",
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        abstract: report.abstract || "",
        content: fullContent ? htmlToText(fullContent) : "",
        references: Array.isArray(report.references)
          ? report.references.filter((r: unknown): r is string => typeof r === "string")
          : [],
        sections: Array.isArray(report.sections) ? report.sections : [],
      },
    });
  } catch (error) {
    console.error("Admin report detail error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { id } = await params;
  if (!ObjectId.isValid(id)) return notFound("Invalid report id");

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return ok({ error: "Title cannot be empty" }, 400);
      updates.title = title;
    }
    if (body.courseName !== undefined) updates.courseName = String(body.courseName);
    if (body.topic !== undefined) updates.topic = String(body.topic);

    if (Object.keys(updates).length === 0) return ok({ error: "No updates provided" }, 400);

    const { db } = await connectToDatabase();
    const result = await db
      .collection("reports")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: "after", projection: { title: 1 } }
      );
    if (!result) return notFound("Report not found");

    await logAdminActivity({
      admin,
      action: "update",
      resource: "reports",
      resourceId: id,
      summary: `Updated report "${result.title || id}"`,
      meta: { fields: Object.keys(updates) },
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin report update error:", error);
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
    const report = await db.collection("reports").findOne({ _id: new ObjectId(id) }, { projection: { title: 1 } });
    const result = await db.collection("reports").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound("Report not found");

    await logAdminActivity({
      admin,
      action: "delete",
      resource: "reports",
      resourceId: id,
      summary: `Deleted report "${report?.title || id}"`,
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Admin report delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
