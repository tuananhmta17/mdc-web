import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb, withApi } from "@/lib/db";
import { tokenHash, sessionCookieOptions } from "@/lib/security";
export const POST = withApi(async (req: NextRequest) => {
  const db = readDb();
  const token = req.cookies.get("mdc_session")?.value;
  if (token) { db.auth_sessions = db.auth_sessions?.filter(s => s.token_hash !== tokenHash(token)); writeDb(db); }
  const res = NextResponse.json({ success: true });
  res.cookies.set("mdc_session", "", { ...sessionCookieOptions, maxAge: 0 });
  res.cookies.set("mdc_uid", "", { path: "/", maxAge: 0 });
  return res;
}, { public: true });
