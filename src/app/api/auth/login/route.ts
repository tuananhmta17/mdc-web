import { NextRequest, NextResponse } from "next/server";
import { buildSession, readDb, writeDb, withApi } from "@/lib/db";
import { newToken, tokenHash, verifyPassword, sessionCookieOptions } from "@/lib/security";

export const POST = withApi(async (req: NextRequest) => {
  const { email, password, userId } = await req.json();
  if (userId || typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) return NextResponse.json({ error: "Vui lòng nhập email và mật khẩu." }, { status: 400 });
  const db = readDb();
  const normalized = email.trim().toLowerCase();
  const key = tokenHash(normalized);
  db.auth_attempts = (db.auth_attempts || []).filter(a => Date.parse(a.reset_at) > Date.now()).slice(-2000);
  let attempt = db.auth_attempts.find(a => a.key === key);
  if (attempt && attempt.count >= 10) return NextResponse.json({ error: "Đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút." }, { status: 429, headers: { "retry-after": "900" } });
  if (!attempt) { attempt = { key, count: 0, reset_at: new Date(Date.now() + 15 * 60000).toISOString() }; db.auth_attempts.push(attempt); }
  attempt.count++;
  writeDb(db);
  const user = db.profiles.find(p => p.email.trim().toLowerCase() === normalized);
  const fallback = "scrypt:00000000000000000000000000000000:" + "0".repeat(128);
  const valid = verifyPassword(password, user?.password?.startsWith("scrypt:") ? user.password : fallback);
  if (!user || !valid) return NextResponse.json({ error: "Email hoặc mật khẩu không chính xác." }, { status: 401 });
  if (user.status === "INACTIVE") return NextResponse.json({ error: "Tài khoản đã bị khóa. Vui lòng liên hệ Ban Chủ nhiệm." }, { status: 403 });
  db.auth_attempts = db.auth_attempts.filter(a => a.key !== key);
  const token = newToken();
  const oldToken = req.cookies.get("mdc_session")?.value;
  db.auth_sessions = (db.auth_sessions || []).filter(s => Date.parse(s.expires_at) > Date.now() && s.token_hash !== tokenHash(oldToken || "")).slice(-5000);
  db.auth_sessions.push({ token_hash: tokenHash(token), user_id: user.id, expires_at: new Date(Date.now() + sessionCookieOptions.maxAge * 1000).toISOString() });
  const res = NextResponse.json({ success: true, user, session: buildSession(db, user.id) });
  res.cookies.set("mdc_session", token, sessionCookieOptions);
  res.cookies.set("mdc_uid", "", { path: "/", maxAge: 0 });
  return res;
}, { public: true, commitOnError: true });
