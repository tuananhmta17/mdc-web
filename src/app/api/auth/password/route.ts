import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb, withApi } from "@/lib/db";
import { hashPassword, verifyPassword, sessionCookieOptions } from "@/lib/security";
export const POST = withApi(async (req: NextRequest) => {
  const { currentPassword, newPassword } = await req.json();
  if (typeof currentPassword !== "string" || currentPassword.length > 128 || typeof newPassword !== "string" || newPassword.length < 12 || newPassword.length > 128) return NextResponse.json({ error: "Mật khẩu mới cần từ 12 đến 128 ký tự." }, { status: 400 });
  const db = readDb(); const session = getCurrentSession(db);
  if (!verifyPassword(currentPassword, session.user.password)) return NextResponse.json({ error: "Mật khẩu hiện tại không chính xác." }, { status: 400 });
  session.user.password = hashPassword(newPassword); session.user.updated_at = new Date().toISOString();
  db.auth_sessions = db.auth_sessions?.filter(s => s.user_id !== session.user.id);
  writeDb(db);
  const response = NextResponse.json({ success: true }); response.cookies.set("mdc_session", "", { ...sessionCookieOptions, maxAge: 0 }); return response;
});
