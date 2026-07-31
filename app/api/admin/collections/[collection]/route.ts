import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { getAdminSession, unauthorized, ok, badRequest, notFound } from "@/lib/admin";
import { COLLECTIONS } from "@/lib/collections";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ collection: string }> };

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 8) return undefined;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitize(v, depth + 1)).filter((v) => v !== undefined);
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (["_id", "__proto__", "constructor", "prototype"].includes(k)) continue;
      if (!Object.prototype.hasOwnProperty.call(value, k)) continue;
      const s = sanitize(v, depth + 1);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function GET(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { collection } = await params;
  const meta = COLLECTIONS[collection];
  if (!meta) return notFound("Unknown collection");

  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 300);

    const fField = url.searchParams.get("f_field") || "";
    const fValueRaw = url.searchParams.get("f_value") || "";
    const query: Record<string, unknown> = {};
    if (fField && fValueRaw && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fField)) {
      if (/Id$/i.test(fField) && ObjectId.isValid(fValueRaw)) {
        const oid = new ObjectId(fValueRaw);
        query[fField] = { $in: [oid, fValueRaw] };
      } else {
        query[fField] = fValueRaw;
      }
    }

    const { db } = await connectToDatabase();
    const coll = db.collection(collection);

    const sample = await coll.findOne(query);
    const sort: Record<string, 1 | -1> =
      sample && "createdAt" in sample ? { createdAt: -1 } : { _id: -1 };

    const items = await coll.find(query).sort(sort).limit(limit).toArray();
    return ok({ items, total: items.length, limit });
  } catch (error) {
    console.error("Admin collection list error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function POST(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { collection } = await params;
  const meta = COLLECTIONS[collection];
  if (!meta) return notFound("Unknown collection");
  if (meta.readOnly) return badRequest("This collection is read-only");

  try {
    const body = await req.json();
    const clean = sanitize(body);
    if (!isPlainObject(clean)) return badRequest("Invalid payload");

    const now = new Date();
    const doc = { ...clean, createdAt: now, updatedAt: now };

    const { db } = await connectToDatabase();
    const res = await db.collection(collection).insertOne(doc as Record<string, unknown>);
    return ok({ success: true, id: String(res.insertedId) }, 201);
  } catch (error) {
    console.error("Admin collection create error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { collection } = await params;
  const meta = COLLECTIONS[collection];
  if (!meta) return notFound("Unknown collection");
  if (meta.readOnly) return badRequest("This collection is read-only");

  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const id = url.searchParams.get("id") || "";
  if (ids.length === 0 && (!id || !ObjectId.isValid(id))) return badRequest("Invalid id");

  try {
    const body = await req.json();
    const clean = sanitize(body);
    if (!isPlainObject(clean)) return badRequest("Invalid payload");

    const { db } = await connectToDatabase();
    if (ids.length > 0) {
      const idsOid = ids.map((s) => {
        if (!ObjectId.isValid(s)) throw new Error("Invalid ids");
        return new ObjectId(s);
      });
      const result = await db.collection(collection).updateMany(
        { _id: { $in: idsOid } },
        { $set: { ...clean, updatedAt: new Date() } }
      );
      return ok({ success: true, modifiedCount: result.modifiedCount });
    }

    const result = await db.collection(collection).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...clean, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) return notFound("Document not found");
    return ok({ success: true, item: result });
  } catch (error) {
    console.error("Admin collection update error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();

  const { collection } = await params;
  const meta = COLLECTIONS[collection];
  if (!meta) return notFound("Unknown collection");
  if (meta.readOnly) return badRequest("This collection is read-only");

  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const id = url.searchParams.get("id") || "";
  if (ids.length === 0 && (!id || !ObjectId.isValid(id))) return badRequest("Invalid id");

  try {
    const { db } = await connectToDatabase();
    if (ids.length > 0) {
      const idsOid = ids.map((s) => {
        if (!ObjectId.isValid(s)) throw new Error("Invalid ids");
        return new ObjectId(s);
      });
      const result = await db.collection(collection).deleteMany({ _id: { $in: idsOid } });
      return ok({ success: true, deletedCount: result.deletedCount });
    }
    const result = await db.collection(collection).deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return notFound("Document not found");
    return ok({ success: true });
  } catch (error) {
    console.error("Admin collection delete error:", error);
    return ok({ error: "Internal server error" }, 500);
  }
}
