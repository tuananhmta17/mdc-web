import fs from "node:fs";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { DatabaseSchema, CurrentUserSession } from "./types";
import { getSupabase } from "./supabase";
import { hashPassword, tokenHash } from "./security";
import { validateInput, validateDatabase } from "./validation";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Scope = { db: DatabaseSchema; dirty: boolean; req?: NextRequest };
const shared = globalThis as typeof globalThis & { mdcStore?: { scope: AsyncLocalStorage<Scope>; queue: Promise<void> } };
const store = shared.mdcStore ??= { scope: new AsyncLocalStorage<Scope>(), queue: Promise.resolve() };

export function emptyDatabase(): DatabaseSchema {
  return { profiles: [], departments: [
    { id: "dept-board", code: "BOARD", name: "Ban Chủ nhiệm", description: "Điều hành hoạt động CLB" },
    { id: "dept-dance", code: "DANCE", name: "Ban Chuyên môn", description: "Biên đạo, luyện tập và biểu diễn" },
    { id: "dept-media", code: "MEDIA", name: "Ban Truyền thông", description: "Hình ảnh, nội dung và truyền thông" },
  ], department_memberships: [], role_assignments: [], dances: [], dance_poll_rounds: [], dance_poll_options: [], dance_votes: [], dance_registrations: [], availability_slots: [], practice_sessions: [], practice_rsvps: [], practice_attendance: [], media_tasks: [], media_task_submissions: [], announcements: [], notifications: [], email_outbox: [], audit_logs: [], auth_sessions: [], auth_attempts: [] };
}
function initialDatabase(): DatabaseSchema {
  const db = emptyDatabase();
  db.auth_sessions = [];
  db.auth_attempts = [];
  const email = process.env.MDC_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.MDC_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(503, "Chưa khởi tạo quản trị viên. Cần cấu hình MDC_ADMIN_EMAIL và MDC_ADMIN_PASSWORD (ít nhất 12 ký tự).");
  const now = new Date().toISOString();
  const id = randomUUID();
  db.profiles.push({ id, email, full_name: process.env.MDC_ADMIN_NAME || "Quản trị MDC", password: hashPassword(password), status: "ACTIVE", created_at: now, updated_at: now });
  db.role_assignments.push({ id: randomUUID(), user_id: id, role: "BOARD_ADMIN", assigned_at: now });
  db.department_memberships.push({ id: randomUUID(), user_id: id, department_id: db.departments.find(d => d.code === "BOARD")!.id, is_primary: true, status: "ACTIVE", joined_at: now });
  return db;
}
export function readDb(): DatabaseSchema {
  const scope = store.scope.getStore();
  if (!scope) throw new Error("Database access requires a transaction");
  return scope.db;
}
export function writeDb(data: DatabaseSchema): void {
  const scope = store.scope.getStore();
  if (!scope || data !== scope.db) throw new Error("Invalid database transaction");
  scope.dirty = true;
}
export async function withDatabase<T>(fn: () => Promise<T>, req?: NextRequest): Promise<T> {
  const previous = store.queue;
  let unlock!: () => void;
  store.queue = new Promise<void>(resolve => { unlock = resolve; });
  await previous;
  try {
    const supabase = getSupabase();
    if (process.env.VERCEL === "1" && !supabase) throw new ApiError(503, "Chưa cấu hình cơ sở dữ liệu Supabase cho production.");
    const dir = path.resolve(process.env.MDC_DATA_DIR || path.join(process.cwd(), "data"));
    const file = path.join(dir, "mdc-db.json");
    let db: DatabaseSchema;
    let revision: number | null = null;
    if (supabase) {
      const result = await supabase.from("app_state_snapshots").select("state_json, revision").eq("id", "latest_state").maybeSingle();
      if (result.error) throw new ApiError(503, "Không đọc được cơ sở dữ liệu. Kiểm tra kết nối và migration 002.");
      db = result.data?.state_json || initialDatabase();
      revision = result.data?.revision ?? null;
    } else {
      fs.mkdirSync(dir, { recursive: true });
      db = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : initialDatabase();
    }
    db.auth_sessions ??= [];
    db.auth_attempts ??= [];
    const scope: Scope = { db, dirty: false, req };
    return await store.scope.run(scope, async () => {
      const value = await fn();
      if (scope.dirty) {
        validateDatabase(db);
        if (supabase) {
          const payload = { state_json: db, updated_at: new Date().toISOString(), revision: (revision ?? -1) + 1 };
          const result = revision === null
            ? await supabase.from("app_state_snapshots").insert({ id: "latest_state", ...payload }).select("revision")
            : await supabase.from("app_state_snapshots").update(payload).eq("id", "latest_state").eq("revision", revision).select("revision");
          if (result.error && result.error.code !== "23505") throw new ApiError(503, "Không thể lưu dữ liệu vào Supabase. Vui lòng thử lại sau.");
          if (result.error || !result.data?.length) throw new ApiError(409, "Dữ liệu vừa được cập nhật. Vui lòng tải lại và thử lại thao tác.");
        } else {
          const temp = `${file}.${randomUUID()}.tmp`;
          fs.writeFileSync(temp, JSON.stringify(db), { encoding: "utf8", mode: 0o600 });
          fs.renameSync(temp, file);
        }
      }
      return value;
    });
  } finally { unlock(); }
}
export function buildSession(db: DatabaseSchema, userId: string): CurrentUserSession {
  const user = db.profiles.find(p => p.id === userId);
  if (!user) throw new ApiError(401, "Phiên đăng nhập không hợp lệ.");
  const primaryMembership = db.department_memberships.find(m => m.user_id === user.id && m.is_primary && m.status === "ACTIVE");
  const roles = db.role_assignments.filter(r => r.user_id === user.id).map(r => r.role);
  return { user, primaryDepartment: db.departments.find(d => d.id === primaryMembership?.department_id), roles,
    isBoardAdmin: roles.includes("BOARD_ADMIN"), isDanceHead: roles.includes("DANCE_HEAD"), isDanceLeader: roles.includes("DANCE_LEADER"), isDanceMember: roles.includes("DANCE_MEMBER"), isMediaHead: roles.includes("MEDIA_HEAD"), isMediaMember: roles.includes("MEDIA_MEMBER") };
}
export function getSessionFromRequest(req: NextRequest, db = readDb()): CurrentUserSession {
  const token = req.cookies.get("mdc_session")?.value;
  const auth = token && db.auth_sessions?.find(s => s.token_hash === tokenHash(token) && Date.parse(s.expires_at) > Date.now());
  if (!auth) throw new ApiError(401, "Vui lòng đăng nhập.");
  const session = buildSession(db, auth.user_id);
  if (session.user.status === "INACTIVE") throw new ApiError(403, "Tài khoản đã bị khóa.");
  return session;
}
export function getCurrentSession(db = readDb()): CurrentUserSession {
  const req = store.scope.getStore()?.req;
  if (!req) throw new ApiError(401, "Vui lòng đăng nhập.");
  return getSessionFromRequest(req, db);
}
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !["password", "token_hash", "claim_token", "auth_sessions", "auth_attempts"].includes(key)).map(([key, val]) => [key, redact(val)]));
  return value;
}
export function withApi<C>(handler: (req: NextRequest, context: C) => Promise<Response>, options: { public?: boolean; pending?: boolean; database?: boolean; commitOnError?: boolean } = {}) {
  return async (req: NextRequest, context: C): Promise<Response> => {
    try {
      const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
      const origin = req.headers.get("origin");
      const allowedOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : new URL(req.url).origin;
      if (mutating && ((origin && ![allowedOrigin, new URL(req.url).origin].includes(origin)) || req.headers.get("sec-fetch-site") === "cross-site")) throw new ApiError(403, "Yêu cầu khác nguồn bị từ chối.");
      if (mutating && req.headers.get("content-type")?.includes("application/json")) {
        const text = await req.clone().text();
        if (text.length > 100_000) throw new ApiError(413, "Nội dung yêu cầu quá lớn.");
        if (text) {
          let body;
          try { body = JSON.parse(text); } catch { throw new ApiError(400, "JSON không hợp lệ."); }
          validateInput(new URL(req.url).pathname, req.method, body);
        }
      }
      const execute = async () => {
        let actorId: string | undefined;
        if (!options.public) {
          const session = getSessionFromRequest(req);
          actorId = session.user.id;
          if (!options.pending && session.user.status !== "ACTIVE") throw new ApiError(403, "Tài khoản đang chờ phê duyệt.");
        }
        const scope = store.scope.getStore();
        const beforeAuditCount = scope?.db.audit_logs.length;
        const response = await handler(req, context);
        if (!response.ok && !options.commitOnError && store.scope.getStore()) store.scope.getStore()!.dirty = false;
        if (response.ok && actorId && scope?.dirty && scope.db.audit_logs.length === beforeAuditCount) {
          scope.db.audit_logs.unshift({ id: randomUUID(), actor_id: actorId, action: `${req.method} ${new URL(req.url).pathname}`, entity_type: "api_action", occurred_at: new Date().toISOString() });
        }
        if (response.headers.get("content-type")?.includes("application/json")) {
          const clean = NextResponse.json(redact(await response.json()), { status: response.status, headers: response.headers });
          clean.headers.set("cache-control", "private, no-store");
          return clean;
        }
        response.headers.set("cache-control", "private, no-store");
        return response;
      };
      return options.database === false ? await execute() : await withDatabase(execute, req);
    } catch (err) {
      if (!(err instanceof ApiError)) console.error("[API]", err instanceof Error ? err.message : "Unexpected failure");
      return NextResponse.json({ error: err instanceof ApiError ? err.message : "Không thể hoàn tất yêu cầu. Vui lòng thử lại." }, { status: err instanceof ApiError ? err.status : 500, headers: { "cache-control": "private, no-store" } });
    }
  };
}
