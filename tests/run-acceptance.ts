import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { readDb, writeDb, withDatabase } from "../src/lib/db";
import { formatVNDateTime, isValidHttpUrl, vnInputToISO } from "../src/lib/utils";
import { escapeCsv } from "../src/lib/csv";
import { calculateBestPracticeSlots } from "../src/lib/scheduler";
import { verifyPassword } from "../src/lib/security";
import { createNotificationAndOutbox, processEmailOutboxWorker } from "../src/lib/notifications";
import { sendEmail } from "../src/lib/mailer";
import { DatabaseSchema } from "../src/lib/types";

// All API tests use an isolated directory and fake contacts. Never reset the application database.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mdc-acceptance-"));
process.env.MDC_DATA_DIR = dir;
process.env.VERCEL = "0";
for (const name of ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "GMAIL_USER", "GMAIL_APP_PASSWORD", "RESEND_API_KEY"]) delete process.env[name];
process.env.MDC_ADMIN_EMAIL = "admin@example.test";
process.env.MDC_ADMIN_PASSWORD = "Acceptance!Secret2026";
process.env.APP_URL = "https://mdc.example.test";
const password = process.env.MDC_ADMIN_PASSWORD;
let checks = 0;
function check(value: unknown, label: string) { assert.ok(value, label); checks++; console.log(`PASS ${checks}: ${label}`); }
type RouteHandler = (req: NextRequest, context: { params: Promise<{ id: string }> }) => Promise<Response>;
async function main() {
const modules = {
  login: await import("../src/app/api/auth/login/route"), logout: await import("../src/app/api/auth/logout/route"), me: await import("../src/app/api/auth/me/route"), password: await import("../src/app/api/auth/password/route"),
  state: await import("../src/app/api/state/route"), members: await import("../src/app/api/members/route"), member: await import("../src/app/api/members/[id]/route"),
  dances: await import("../src/app/api/dances/route"), dance: await import("../src/app/api/dances/[id]/route"), registration: await import("../src/app/api/dances/[id]/register/route"), availability: await import("../src/app/api/dances/[id]/availability/route"),
  polls: await import("../src/app/api/polls/route"), vote: await import("../src/app/api/polls/[id]/vote/route"), close: await import("../src/app/api/polls/[id]/close/route"),
  practices: await import("../src/app/api/practices/route"), practice: await import("../src/app/api/practices/[id]/route"), rsvp: await import("../src/app/api/practices/[id]/rsvp/route"), attendance: await import("../src/app/api/practices/[id]/attendance/route"),
  tasks: await import("../src/app/api/media/tasks/route"), task: await import("../src/app/api/media/tasks/[id]/route"), submission: await import("../src/app/api/media/tasks/[id]/submissions/route"), review: await import("../src/app/api/media/submissions/[id]/review/route"),
  announcements: await import("../src/app/api/board/announcements/route"), notifications: await import("../src/app/api/notifications/route"), cron: await import("../src/app/api/cron/process-outbox/route"), export: await import("../src/app/api/export/route"),
  reset: await import("../src/app/api/system/reset/route"), switch: await import("../src/app/api/auth/switch-role/route"),
};
async function call(key: keyof typeof modules, method: string, route: string, cookie = "", body?: unknown, id = "", extra: Record<string, string> = {}) {
  const handler = (modules[key] as Record<string, unknown>)[method] as RouteHandler;
  const req = new NextRequest(`http://localhost:3000${route}`, { method, headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}), ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const res = await handler(req, { params: Promise.resolve({ id }) });
  const text = await res.text();
  const json = res.headers.get("content-type")?.includes("json") ? JSON.parse(text) : null;
  return { status: res.status, json, text, headers: res.headers, cookie: res.headers.get("set-cookie")?.split(";")[0] || "" };
}
async function snapshot(): Promise<DatabaseSchema> { return withDatabase(async () => structuredClone(readDb())); }
async function run() {
  const protectedGets: [keyof typeof modules, string][] = [["state", "/api/state"], ["me", "/api/auth/me"], ["members", "/api/members"], ["dances", "/api/dances"], ["dance", "/api/dances/x"], ["polls", "/api/polls"], ["practices", "/api/practices"], ["tasks", "/api/media/tasks"], ["task", "/api/media/tasks/x"], ["availability", "/api/dances/x/availability"], ["export", "/api/export"]];
  for (const [key, route] of protectedGets) check((await call(key, "GET", route)).status === 401, `${route} requires authentication`);
  check((await call("state", "GET", "/api/state", "mdc_uid=u-board-1", undefined, "", { "x-mdc-uid": "u-board-1" })).status === 401, "Forged user ID cookie/header cannot authenticate");
  check((await call("login", "POST", "/api/auth/login", "", { userId: "u-board-1" })).status === 400, "One-click login is disabled");
  check((await call("switch", "POST", "/api/auth/switch-role")).status === 410, "Role simulator removed");
  check((await call("reset", "POST", "/api/system/reset")).status === 410, "Reset endpoint cannot erase data");
  check((await call("cron", "GET", "/api/cron/process-outbox")).status === 401, "Cron rejects requests without a secret");
  check((await call("login", "POST", "/api/auth/login", "", { email: "admin@example.test", password: "wrong" })).status === 401, "Wrong password rejected");
  const login = await call("login", "POST", "/api/auth/login", "", { email: " ADMIN@example.test ", password });
  check(login.status === 200, "Admin authenticates with normalized email");
  const admin = login.cookie; const adminId = login.json.user.id;
  check(login.headers.get("set-cookie")?.includes("HttpOnly") && login.headers.get("set-cookie")?.includes("SameSite=lax"), "Session cookie is HttpOnly and SameSite");
  check(!login.text.includes("password") && !login.text.includes("scrypt:"), "Login never exposes password hashes");
  check((await call("state", "GET", "/api/state", admin)).headers.get("cache-control") === "private, no-store", "Private state is never publicly cached");
  const users: Record<string, { id: string; cookie: string }> = {};
  for (const [name, role, department_code, status] of [
    ["head", "DANCE_HEAD", "DANCE", "ACTIVE"], ["leader", "DANCE_LEADER", "DANCE", "ACTIVE"], ["dancer", "DANCE_MEMBER", "DANCE", "ACTIVE"], ["dancer2", "DANCE_MEMBER", "DANCE", "ACTIVE"],
    ["mediahead", "MEDIA_HEAD", "MEDIA", "ACTIVE"], ["media", "MEDIA_MEMBER", "MEDIA", "ACTIVE"], ["pending", "DANCE_MEMBER", "DANCE", "PENDING"], ["locked", "DANCE_MEMBER", "DANCE", "INACTIVE"],
  ]) {
    const created = await call("members", "POST", "/api/members", admin, { email: `${name}@example.test`, full_name: `Test ${name}`, password, role, department_code, status });
    check(created.status === 200 && !created.text.includes("password"), `Create ${role}/${status} with no credential leakage`);
    const signed = await call("login", "POST", "/api/auth/login", "", { email: `${name}@example.test`, password });
    users[name] = { id: created.json.member.id, cookie: signed.cookie };
    check(signed.status === (status === "INACTIVE" ? 403 : 200), `${name} account status enforced at login`);
  }
  const { head, leader, dancer, dancer2, mediahead, media, pending } = users;
  const pendingState = await call("state", "GET", "/api/state", pending.cookie);
  check(pendingState.json.isPendingApproval && !pendingState.json.profiles && !pendingState.json.announcements, "Pending members see no internal data");
  check((await call("dances", "GET", "/api/dances", pending.cookie)).status === 403, "Pending members cannot call internal APIs");
  check((await call("members", "POST", "/api/members", dancer.cookie, { email: "no@example.test", full_name: "No", password })).status === 403, "Members cannot create accounts");
  check((await call("members", "POST", "/api/members", admin, { email: "head@example.test", full_name: "Duplicate", password })).status === 409, "Duplicate email rejected");
  check((await call("members", "POST", "/api/members", admin, { email: "new@example.test", full_name: "New", password: "123456" })).status === 400, "Weak new-account passwords rejected");
  check((await call("member", "PATCH", `/api/members/${dancer.id}`, dancer.cookie, { role: "BOARD_ADMIN" }, dancer.id)).status === 403, "Self-service cannot elevate privileges");
  check((await call("member", "PATCH", `/api/members/${dancer.id}`, dancer.cookie, { full_name: "Updated Dancer" }, dancer.id)).status === 200, "Members can save their own profile");
  check((await call("member", "DELETE", `/api/members/${adminId}`, admin, undefined, adminId)).status === 400, "Admin cannot delete their own account");
  check((await call("member", "PATCH", `/api/members/${adminId}`, admin, { role: "DANCE_HEAD", full_name: "Must not persist" }, adminId)).status === 400, "Last admin cannot demote themselves");
  check((await snapshot()).profiles.find(p => p.id === adminId)?.full_name !== "Must not persist", "Rejected mutations roll back all partial changes");
  const createDance = async (title: string, visibility = "ALL_CLUB", capacity = 10) => call("dances", "POST", "/api/dances", head.cookie, { title, song_title: "Test Song", visibility, capacity, leader_id: leader.id });
  check((await call("dances", "POST", "/api/dances", head.cookie, { title: "Bad", song_title: "Bad", capacity: -1 })).status === 400, "Negative capacity rejected");
  check((await call("dances", "POST", "/api/dances", head.cookie, { title: "Bad", song_title: "Bad", video_url: "javascript:alert(1)" })).status === 400, "Unsafe media links rejected");
  const d1 = (await createDance("Crew One", "ALL_CLUB", 1)).json.dance;
  const d2 = (await createDance("Crew Two")).json.dance;
  const internal = (await createDance("Dance Internal", "DANCE_ONLY")).json.dance;
  check(Boolean(d1.id && d2.id && internal.id), "Dance Head creates three dances");
  check((await call("registration", "POST", `/api/dances/${d1.id}/register`, dancer.cookie, {}, d1.id)).status === 400, "Draft dances do not accept registration");
  for (const d of [d1, d2, internal]) await call("dance", "PATCH", `/api/dances/${d.id}`, head.cookie, { status: "RECRUITING" }, d.id);
  check((await call("dance", "GET", `/api/dances/${internal.id}`, media.cookie, undefined, internal.id)).status === 404, "Internal dances are hidden from Media");
  check((await call("registration", "POST", `/api/dances/${internal.id}/register`, media.cookie, {}, internal.id)).status === 403, "Media cannot register for DANCE_ONLY");
  check((await call("dance", "PATCH", `/api/dances/${d1.id}`, leader.cookie, { leader_id: dancer.id }, d1.id)).status === 403, "Leaders cannot reassign privileged fields");
  const reg = await call("registration", "POST", `/api/dances/${d1.id}/register`, dancer.cookie, {}, d1.id);
  check(reg.status === 200 && reg.json.registration.status === "REGISTERED", "Dance registration persisted");
  check((await call("registration", "POST", `/api/dances/${d1.id}/register`, dancer.cookie, {}, d1.id)).status === 409, "Duplicate registration rejected");
  const wait = await call("registration", "POST", `/api/dances/${d1.id}/register`, dancer2.cookie, {}, d1.id);
  check(wait.json.registration.status === "WAITLISTED", "Full dance creates a waitlist");
  check((await call("availability", "PUT", `/api/dances/${d1.id}/availability`, media.cookie, { slots: [] }, d1.id)).status === 403, "Unregistered users cannot submit availability");
  const slot = { day_of_week: 1, start_time: "18:00", end_time: "20:00", level: "AVAILABLE" };
  check((await call("availability", "PUT", `/api/dances/${d1.id}/availability`, dancer.cookie, { slots: [slot] }, d1.id)).status === 200, "Participant availability saved");
  check((await call("availability", "PUT", `/api/dances/${d1.id}/availability`, dancer.cookie, { slots: [slot, slot] }, d1.id)).status === 400, "Overlapping availability rejected");
  check((await call("availability", "GET", `/api/dances/${d1.id}/availability`, media.cookie, undefined, d1.id)).status === 403, "Non-participants cannot read private availability");
  check((await call("availability", "GET", `/api/dances/${d1.id}/availability`, leader.cookie, undefined, d1.id)).json.recommendations.length > 0, "Designated leader receives schedule recommendations");
  const now = Date.now();
  const pollBody = { title: "Pick next", dance_ids: [d1.id, d2.id], scope: "ALL_CLUB", start_at: new Date(now - 60000).toISOString(), end_at: new Date(now + 86400000).toISOString(), result_visibility: "HIDDEN_UNTIL_CLOSED" };
  check((await call("polls", "POST", "/api/polls", head.cookie, { ...pollBody, dance_ids: [d1.id, d1.id] })).status === 400, "Poll options must be distinct");
  check((await call("polls", "POST", "/api/polls", head.cookie, { ...pollBody, dance_ids: [d1.id, "missing"] })).status === 400, "Poll cannot reference nonexistent dances");
  const poll = (await call("polls", "POST", "/api/polls", head.cookie, pollBody)).json.round;
  const options = (await snapshot()).dance_poll_options.filter(o => o.round_id === poll.id);
  for (const option of options) check((await call("vote", "POST", `/api/polls/${poll.id}/vote`, dancer.cookie, { option_id: option.id }, poll.id)).status === 200, "Vote can be submitted and changed");
  check((await snapshot()).dance_votes.filter(v => v.user_id === dancer.id && v.round_id === poll.id).length === 1, "Vote changes preserve single-vote uniqueness");
  check((await call("polls", "GET", "/api/polls", media.cookie)).json[0].totalVotes === null, "Hidden poll counts do not leak through API");
  check((await call("close", "POST", `/api/polls/${poll.id}/close`, head.cookie, { winning_dance_id: internal.id }, poll.id)).status === 400, "Winner must belong to the poll");
  check((await call("close", "POST", `/api/polls/${poll.id}/close`, head.cookie, { winning_dance_id: d1.id }, poll.id)).status === 200, "Poll winner is selected");
  check((await call("vote", "POST", `/api/polls/${poll.id}/vote`, dancer.cookie, { option_id: options[0].id }, poll.id)).status === 400, "Closed poll refuses votes");
  const expired = (await call("polls", "POST", "/api/polls", head.cookie, { ...pollBody, start_at: new Date(now - 120000).toISOString(), end_at: new Date(now - 60000).toISOString() })).json.round;
  const expiredOption = (await snapshot()).dance_poll_options.find(o => o.round_id === expired.id)!;
  check((await call("vote", "POST", `/api/polls/${expired.id}/vote`, dancer.cookie, { option_id: expiredOption.id }, expired.id)).status === 400, "Expired open poll refuses votes");
  const practiceBody = { dance_id: d1.id, title: "Rehearsal", start_at: new Date(now + 3600000).toISOString(), end_at: new Date(now + 7200000).toISOString(), location: "MTA Studio" };
  check((await call("practices", "POST", "/api/practices", dancer.cookie, practiceBody)).status === 403, "Only leaders/managers can schedule practice");
  check((await call("practices", "POST", "/api/practices", leader.cookie, { ...practiceBody, end_at: practiceBody.start_at })).status === 400, "Zero-length practice rejected");
  const practice = (await call("practices", "POST", "/api/practices", leader.cookie, practiceBody)).json.practice;
  check(Boolean(practice.id), "Designated leader publishes practice");
  check((await call("rsvp", "POST", `/api/practices/${practice.id}/rsvp`, dancer.cookie, { response: "ATTENDING" }, practice.id)).status === 200, "Participant RSVP saved");
  check((await call("rsvp", "POST", `/api/practices/${practice.id}/rsvp`, media.cookie, { response: "ATTENDING" }, practice.id)).status === 403, "Outsider cannot RSVP");
  check((await call("attendance", "POST", `/api/practices/${practice.id}/attendance`, leader.cookie, { user_id: dancer.id, status: "PRESENT" }, practice.id)).status === 200, "Leader records attendance");
  check((await call("attendance", "POST", `/api/practices/${practice.id}/attendance`, dancer.cookie, { user_id: dancer.id, status: "PRESENT" }, practice.id)).status === 403, "Members cannot self-mark attendance");
  check((await call("practice", "PATCH", `/api/practices/${practice.id}`, leader.cookie, { status: "CANCELLED", cancel_reason: "Weather" }, practice.id)).status === 200, "Practice cancellation saved");
  check((await call("rsvp", "POST", `/api/practices/${practice.id}/rsvp`, dancer.cookie, { response: "ATTENDING" }, practice.id)).status === 400, "Canceled practice refuses RSVP");
  const taskBody = { title: "Crew poster", assignee_id: media.id, due_at: new Date(now + 60000).toISOString(), task_type: "DESIGN", priority: "HIGH" };
  check((await call("tasks", "POST", "/api/media/tasks", dancer.cookie, taskBody)).status === 403, "Dancers cannot assign Media tasks");
  const task = (await call("tasks", "POST", "/api/media/tasks", mediahead.cookie, taskBody)).json.task;
  check(Boolean(task.id), "Media Head assigns a task");
  check((await call("task", "GET", `/api/media/tasks/${task.id}`, dancer.cookie, undefined, task.id)).status === 404, "Unrelated members cannot read task details");
  check((await call("task", "PATCH", `/api/media/tasks/${task.id}`, media.cookie, { progress_percent: 40 }, task.id)).status === 200, "Assignee updates progress");
  check((await call("task", "PATCH", `/api/media/tasks/${task.id}`, media.cookie, { status: "APPROVED" }, task.id)).status === 403, "Assignee cannot approve their own task");
  check((await call("submission", "POST", `/api/media/tasks/${task.id}/submissions`, media.cookie, { url: "javascript:alert(1)" }, task.id)).status === 400, "Unsafe submission URL rejected");
  const sub1 = (await call("submission", "POST", `/api/media/tasks/${task.id}/submissions`, media.cookie, { url: "https://example.test/v1" }, task.id)).json.submission;
  const sub2 = (await call("submission", "POST", `/api/media/tasks/${task.id}/submissions`, media.cookie, { url: "https://example.test/v2" }, task.id)).json.submission;
  check(sub1.version === 1 && sub2.version === 2 && sub2.review_status === "PENDING", "Submissions preserve version history and require review");
  check((await call("review", "POST", `/api/media/submissions/${sub1.id}/review`, mediahead.cookie, { review_status: "APPROVED" }, sub1.id)).status === 409, "Older versions cannot overwrite current review");
  check((await call("review", "POST", `/api/media/submissions/${sub2.id}/review`, mediahead.cookie, { review_status: "REVISION_REQUESTED", feedback: "Improve contrast" }, sub2.id)).status === 200, "Media Head requests revisions");
  const sub3 = (await call("submission", "POST", `/api/media/tasks/${task.id}/submissions`, media.cookie, { url: "https://example.test/v3" }, task.id)).json.submission;
  check((await call("review", "POST", `/api/media/submissions/${sub3.id}/review`, mediahead.cookie, { review_status: "APPROVED" }, sub3.id)).json.task.progress_percent === 100, "Latest approval completes the task");
  check((await call("announcements", "POST", "/api/board/announcements", admin, { title: "Board confidential", body: "Board only", audience: "BOARD_ONLY" })).status === 200, "Board publishes targeted announcements");
  check(!(await call("state", "GET", "/api/state", media.cookie)).text.includes("Board confidential"), "Board-only announcements stay private");
  const notification = (await snapshot()).notifications.find(n => n.recipient_id === dancer.id)!;
  await call("notifications", "PATCH", "/api/notifications", dancer.cookie, { notificationId: notification.id });
  check(Boolean((await snapshot()).notifications.find(n => n.id === notification.id)?.read_at), "Own notifications can be marked read");
  check((await call("export", "GET", "/api/export?type=members", media.cookie)).status === 403, "Member export restricted to Board");
  check((await call("export", "GET", "/api/export?type=members", admin)).headers.get("content-type")?.includes("text/csv"), "Board downloads member CSV");
  for (const type of ["poll", "practices", "tasks"]) check((await call("export", "GET", `/api/export?type=${type}`, admin)).status === 200, `${type} CSV export works`);
  check(escapeCsv('=HYPERLINK("bad")').startsWith('"\'='), "CSV escapes formula injection");
  check(formatVNDateTime("2026-11-04T18:00:00Z") === "01:00 05/11/2026", "Vietnam formatting handles UTC date rollover");
  check(vnInputToISO("2026-11-05T01:00") === "2026-11-04T18:00:00.000Z", "Form dates are interpreted in Vietnam regardless of device timezone");
  check(!isValidHttpUrl("https://user:password@example.test"), "Credential-bearing URLs rejected");
  const mail = await sendEmail({ to: "nobody@example.test", subject: "Isolated", html: "<p>Test</p>" });
  check(!mail.success && mail.provider === "unconfigured", "Missing mail provider never reports a fake send");
  const firstRun = await processEmailOutboxWorker(); const afterFirst = await snapshot();
  await processEmailOutboxWorker(); const afterSecond = await snapshot();
  check(firstRun.sentCount === 0 && !afterSecond.email_outbox.some(e => e.status === "SENT"), "Worker never marks unsent mail as SENT");
  check(afterFirst.notifications.length === afterSecond.notifications.length && afterFirst.email_outbox.length === afterSecond.email_outbox.length, "Repeated worker runs do not duplicate notifications or emails");
  check(afterFirst.email_outbox[0].attempts === afterSecond.email_outbox[0].attempts, "Worker respects retry backoff");
  check((await call("cron", "POST", "/api/cron/process-outbox", media.cookie)).status === 403, "Only Board can manually process email");
  const stateBefore = await snapshot();
  const n1 = stateBefore.notifications.length;
  createNotificationAndOutbox(stateBefore, { recipient: stateBefore.profiles[0], type: "TEST", subject: "Escape", bodyText: '<script>alert("x")</script>', bodyHtml: "<script>unsafe</script>", linkUrl: "/practice", idempotencyKey: "test-html" });
  createNotificationAndOutbox(stateBefore, { recipient: stateBefore.profiles[0], type: "TEST", subject: "Escape", bodyText: "same", bodyHtml: "same", idempotencyKey: "test-html" });
  check(stateBefore.notifications.length === n1 + 1 && !stateBefore.email_outbox[0].body_html.includes("<script>"), "Notifications deduplicate and email content is escaped");
  check(stateBefore.email_outbox[0].body_html.includes("https://mdc.example.test/practice"), "Email links use the real configured site origin");
  await withDatabase(async () => {
    const db = readDb();
    for (let i = 0; i < 7; i++) createNotificationAndOutbox(db, { recipient: db.profiles[0], type: "TEST", subject: "Parallel worker", bodyText: "Isolated delivery", bodyHtml: "", idempotencyKey: `parallel-delivery-${i}` });
    writeDb(db);
  });
  const originalFetch = globalThis.fetch;
  const deliveries: string[] = [];
  process.env.RESEND_API_KEY = "re_isolated_test_key";
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    assert.equal(new URL(request.url).hostname, "api.resend.com");
    deliveries.push(request.headers.get("idempotency-key") || "");
    return new Response(JSON.stringify({ id: "isolated-message" }), { headers: { "content-type": "application/json" } });
  };
  try {
    const results = await Promise.all([processEmailOutboxWorker(), processEmailOutboxWorker()]);
    check(results.reduce((sum, r) => sum + r.sentCount, 0) === 7 && new Set(deliveries).size === 7 && deliveries.length === 7, "Concurrent workers send each claimed email once across multiple batches");
  } finally { globalThis.fetch = originalFetch; delete process.env.RESEND_API_KEY; }
  const change = await call("password", "POST", "/api/auth/password", dancer.cookie, { currentPassword: password, newPassword: "New!CrewSecret2026" });
  check(change.status === 200 && (await call("state", "GET", "/api/state", dancer.cookie)).status === 401, "Password change revokes existing sessions");
  check(verifyPassword("New!CrewSecret2026", (await snapshot()).profiles.find(p => p.id === dancer.id)?.password), "Passwords are stored as verifiable scrypt hashes");
  await call("member", "PATCH", `/api/members/${media.id}`, admin, { status: "INACTIVE" }, media.id);
  check((await call("state", "GET", "/api/state", media.cookie)).status === 401, "Account lock revokes sessions immediately");
  check((await call("member", "PATCH", `/api/members/${pending.id}`, admin, { status: "ACTIVE" }, pending.id)).status === 200, "Board approves a pending account");
  check((await call("state", "GET", "/api/state", pending.cookie)).json.isPendingApproval === false, "Approved account gains access on refresh");
  check((await call("member", "DELETE", `/api/members/${pending.id}`, admin, undefined, pending.id)).status === 200, "Board deletes an unassigned member");
  check((await call("state", "GET", "/api/state", pending.cookie)).status === 401, "Deleted member sessions are revoked");
  const csrf = await call("member", "PATCH", `/api/members/${adminId}`, admin, { phone: "bad" }, adminId, { origin: "https://attacker.example" });
  check(csrf.status === 403, "Cross-origin mutations are rejected");
  const concurrently = await Promise.all(Array.from({ length: 6 }, (_, i) => call("member", "PATCH", `/api/members/${head.id}`, admin, { cohort_class: `Class ${i}` }, head.id)));
  check(concurrently.every(r => r.status === 200), "Concurrent local mutations are serialized");
  check((await snapshot()).audit_logs.filter(a => a.entity_id === head.id && a.action === "UPDATE_MEMBER").length === 6, "Concurrent writes preserve every audit entry");
  await call("logout", "POST", "/api/auth/logout", admin);
  check((await call("state", "GET", "/api/state", admin)).status === 401, "Logout revokes the server session");
  for (let i = 0; i < 10; i++) await call("login", "POST", "/api/auth/login", "", { email: "blocked@example.test", password: "wrong" });
  check((await call("login", "POST", "/api/auth/login", "", { email: "blocked@example.test", password: "wrong" })).status === 429, "Repeated failed logins are rate limited");
  const dbPath = path.join(dir, "mdc-db.json"); const saved = fs.readFileSync(dbPath, "utf8"); fs.writeFileSync(dbPath, "corrupt");
  check((await call("login", "POST", "/api/auth/login", "", { email: "admin@example.test", password })).status === 500 && fs.readFileSync(dbPath, "utf8") === "corrupt", "Corrupt storage is never replaced with demo data"); fs.writeFileSync(dbPath, saved);
  process.env.VERCEL = "1";
  check((await call("login", "POST", "/api/auth/login", "", { email: "admin@example.test", password })).status === 503, "Vercel requires durable Supabase storage");
  // Exercise the actual Supabase client and revision contract without contacting live storage.
  process.env.SUPABASE_URL = "https://storage.example.test";
  process.env.SUPABASE_SECRET_KEY = "isolated-server-key";
  const realFetch = globalThis.fetch;
  let cloudState = JSON.parse(saved) as DatabaseSchema;
  let revision = 7; let conflict = false; let unavailable = false;
  const cloudFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init); const url = new URL(request.url);
    if (url.hostname !== "storage.example.test") throw new Error("Tests must not contact external services");
    if (unavailable) return new Response(JSON.stringify({ message: "unavailable", code: "XX000" }), { status: 503, headers: { "content-type": "application/json" } });
    if (request.method === "GET") return new Response(JSON.stringify([{ state_json: cloudState, revision }]), { headers: { "content-type": "application/json" } });
    const update = await request.json();
    const match = url.searchParams.get("revision") === `eq.${revision}`;
    if (conflict || !match) return new Response("[]", { headers: { "content-type": "application/json" } });
    cloudState = update.state_json; revision = update.revision;
    return new Response(JSON.stringify([{ revision }]), { headers: { "content-type": "application/json" } });
  };
  globalThis.fetch = cloudFetch;
  try {
    const signed = await call("login", "POST", "/api/auth/login", "", { email: "admin@example.test", password });
    check(signed.status === 200 && revision === 8, "Supabase reads fresh state and commits a versioned mutation");
    conflict = true;
    const conflictResult = await call("member", "PATCH", `/api/members/${head.id}`, signed.cookie, { full_name: "Must not overwrite cloud" }, head.id);
    check(conflictResult.status === 409 && cloudState.profiles.find(p => p.id === head.id)?.full_name !== "Must not overwrite cloud", "Supabase revision conflicts cannot overwrite concurrent data");
    conflict = false; unavailable = true;
    check((await call("state", "GET", "/api/state", signed.cookie)).status === 503, "Cloud outage never falls back to local sample data");
  } finally { globalThis.fetch = realFetch; }
  console.log(`\n${checks}/${checks} acceptance checks passed. Production data was untouched.`);
}
try { await run(); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
