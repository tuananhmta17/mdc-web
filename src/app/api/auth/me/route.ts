import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const cookieUid = req.cookies.get("mdc_uid")?.value || req.headers.get("x-mdc-uid") || undefined;
  const db = readDb();
  const session = getCurrentSession(db, cookieUid);

  return NextResponse.json({
    success: true,
    session,
  });
}
