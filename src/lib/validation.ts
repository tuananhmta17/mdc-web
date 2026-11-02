import { ApiError } from "./db";
import { DatabaseSchema } from "./types";
import { isValidHttpUrl } from "./utils";

const enums: Record<string, string[]> = {
  role: ["BOARD_ADMIN", "DANCE_HEAD", "DANCE_LEADER", "DANCE_MEMBER", "MEDIA_HEAD", "MEDIA_MEMBER"],
  department_code: ["BOARD", "DANCE", "MEDIA"], visibility: ["DANCE_ONLY", "ALL_CLUB"], scope: ["DANCE_ONLY", "ALL_CLUB"],
  audience: ["ALL_CLUB", "BOARD_ONLY", "DANCE_ONLY", "MEDIA_ONLY"],
  priority: ["LOW", "MEDIUM", "HIGH", "URGENT"], task_type: ["POST", "PHOTO", "VIDEO", "DESIGN", "STORY", "LOGISTICS", "OTHER"],
  result_visibility: ["PUBLIC", "HIDDEN_UNTIL_CLOSED"], review_status: ["APPROVED", "REVISION_REQUESTED"],
};
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new ApiError(400, message); }
const dateValid = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));

export function validateInput(route: string, method: string, body: unknown) {
  check(body && typeof body === "object" && !Array.isArray(body), "Nội dung yêu cầu phải là một đối tượng.");
  const b = body as Record<string, unknown>;
  const strings = ["email", "password", "full_name", "phone", "cohort_class", "title", "description", "song_title", "music_url", "video_url", "cover_url", "leader_id", "dance_id", "assignee_id", "location", "notes", "note", "url", "feedback", "body", "reference_links", "status", "role", "department_code", "scope", "audience", "priority", "task_type", "review_status", "cancel_reason", "response"];
  for (const key of strings) if (b[key] !== undefined) check(typeof b[key] === "string" && (b[key] as string).length <= 10000, `${key}: giá trị không hợp lệ.`);
  for (const key of ["title", "song_title", "full_name", "location", "body"]) if (b[key] !== undefined) check((b[key] as string).trim().length > 0, `${key}: không được để trống.`);
  for (const [key, values] of Object.entries(enums)) if (b[key] !== undefined) check(values.includes(b[key] as string), `${key}: lựa chọn không hợp lệ.`);
  if (b.email !== undefined) check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((b.email as string).trim()), "Email không hợp lệ.");
  if (b.password !== undefined && !route.endsWith("/login")) check((b.password as string).length >= 12 && (b.password as string).length <= 128, "Mật khẩu cần từ 12 đến 128 ký tự.");
  if (route.endsWith("/login") && typeof b.password === "string") check(b.password.length <= 128, "Mật khẩu quá dài.");
  for (const key of ["start_at", "end_at", "due_at", "target_performance_date"]) if (b[key] !== undefined && b[key] !== "") check(dateValid(b[key]), `${key}: thời gian không hợp lệ.`);
  if (b.start_at && b.end_at) check(Date.parse(b.end_at as string) > Date.parse(b.start_at as string), "Giờ kết thúc phải sau giờ bắt đầu.");
  for (const key of ["music_url", "video_url", "cover_url", "url"]) if (b[key]) check(isValidHttpUrl(b[key] as string), `${key}: cần đường dẫn http hoặc https hợp lệ.`);
  if (b.capacity !== undefined) check(Number.isInteger(Number(b.capacity)) && Number(b.capacity) >= 1 && Number(b.capacity) <= 1000, "Số lượng thành viên phải từ 1 đến 1000.");
  if (b.progress_percent !== undefined) check(typeof b.progress_percent === "number" && Number.isFinite(b.progress_percent) && b.progress_percent >= 0 && b.progress_percent <= 100, "Tiến độ phải từ 0 đến 100.");
  if (b.dance_ids !== undefined) check(Array.isArray(b.dance_ids) && b.dance_ids.length >= 2 && b.dance_ids.every(x => typeof x === "string") && new Set(b.dance_ids).size === b.dance_ids.length, "Cần ít nhất hai bài nhảy khác nhau.");
  if (b.slots !== undefined) {
    check(Array.isArray(b.slots) && b.slots.length <= 100, "Danh sách lịch rảnh không hợp lệ.");
    const slots = b.slots as Record<string, unknown>[];
    for (const slot of slots) {
      check(slot && typeof slot === "object", "Khung giờ không hợp lệ.");
      check(Number.isInteger(slot.day_of_week) && Number(slot.day_of_week) >= 0 && Number(slot.day_of_week) <= 6, "Ngày trong tuần không hợp lệ.");
      check(typeof slot.start_time === "string" && typeof slot.end_time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start_time) && /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end_time) && slot.start_time < slot.end_time, "Khung giờ rảnh không hợp lệ.");
      check(["AVAILABLE", "MAYBE", "UNAVAILABLE"].includes(slot.level as string), "Mức độ rảnh không hợp lệ.");
    }
    slots.forEach((s, i) => check(!slots.slice(i + 1).some(t => t.day_of_week === s.day_of_week && String(t.start_time) < String(s.end_time) && String(t.end_time) > String(s.start_time)), "Các khung giờ rảnh không được chồng lấn."));
  }
  if (b.status !== undefined) {
    const values = route.includes("/members") ? ["PENDING", "ACTIVE", "INACTIVE"]
      : route.includes("/register") ? ["REGISTERED", "APPROVED", "WAITLISTED", "CANCELLED"]
      : route.includes("/attendance") ? ["PRESENT", "LATE", "EXCUSED", "ABSENT"]
      : route.includes("/practices") ? ["SCHEDULED", "RESCHEDULED", "CANCELLED", "COMPLETED"]
      : route.includes("/media") ? ["TODO", "IN_PROGRESS", "SUBMITTED", "REVISION_REQUESTED", "APPROVED"]
      : ["DRAFT", "VOTING", "SELECTED", "REJECTED", "RECRUITING", "PRACTICING", "COMPLETED", "ARCHIVED"];
    check(values.includes(b.status as string), "Trạng thái không hợp lệ.");
  }
  if (route === "/api/members" && method === "POST") check(typeof b.password === "string" && b.password.length >= 12, "Cần mật khẩu riêng cho thành viên (ít nhất 12 ký tự).");
}

export function validateDatabase(db: DatabaseSchema) {
  const profileIds = new Set(db.profiles.map(p => p.id));
  const danceIds = new Set(db.dances.map(d => d.id));
  check(new Set(db.profiles.map(p => p.email.trim().toLowerCase())).size === db.profiles.length, "Email đã tồn tại.");
  check(db.profiles.some(p => p.status === "ACTIVE" && db.role_assignments.some(r => r.user_id === p.id && r.role === "BOARD_ADMIN")), "Hệ thống cần ít nhất một quản trị viên đang hoạt động.");
  for (const d of db.dances) check(!d.leader_id || db.profiles.some(p => p.id === d.leader_id && p.status === "ACTIVE" && db.role_assignments.some(r => r.user_id === p.id && ["BOARD_ADMIN", "DANCE_HEAD", "DANCE_LEADER"].includes(r.role))), "Leader phải là thành viên đang hoạt động có quyền phụ trách.");
  for (const p of db.practice_sessions) check(danceIds.has(p.dance_id) && dateValid(p.start_at) && Date.parse(p.end_at) > Date.parse(p.start_at), "Buổi tập hoặc khoảng thời gian không hợp lệ.");
  for (const p of db.dance_poll_rounds) check(dateValid(p.start_at) && Date.parse(p.end_at) > Date.parse(p.start_at), "Thời gian bình chọn không hợp lệ.");
  for (const o of db.dance_poll_options) {
    const round = db.dance_poll_rounds.find(r => r.id === o.round_id);
    check(round && danceIds.has(o.dance_id), "Bài nhảy ứng viên không tồn tại.");
    check(round.scope !== "ALL_CLUB" || db.dances.find(d => d.id === o.dance_id)?.visibility === "ALL_CLUB", "Đợt toàn CLB chỉ được chọn bài nhảy công khai toàn CLB.");
  }
  for (const t of db.media_tasks) check(profileIds.has(t.assignee_id) && profileIds.has(t.assigner_id) && dateValid(t.due_at) && (!t.dance_id || danceIds.has(t.dance_id)), "Người nhận việc, bài nhảy hoặc hạn nộp không hợp lệ.");
  const unique = (rows: string[], message: string) => check(new Set(rows).size === rows.length, message);
  unique(db.dance_votes.map(v => `${v.round_id}:${v.user_id}`), "Mỗi người chỉ có một phiếu trong mỗi đợt.");
  unique(db.dance_registrations.map(r => `${r.dance_id}:${r.user_id}`), "Đăng ký bị trùng.");
  unique(db.media_task_submissions.map(s => `${s.task_id}:${s.version}`), "Phiên bản sản phẩm bị trùng.");
}
