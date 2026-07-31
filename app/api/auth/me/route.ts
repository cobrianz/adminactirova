import { NextResponse } from "next/server";
import { getAdminSession, unauthorized } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminSession(req);
  if (!admin) return unauthorized();
  return NextResponse.json({ admin });
}
