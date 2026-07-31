import { NextResponse } from "next/server";
import { clearAdminTokenCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.headers.append("Set-Cookie", clearAdminTokenCookie());
  return res;
}
