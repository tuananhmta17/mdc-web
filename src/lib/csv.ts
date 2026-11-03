import { DatabaseSchema } from "./types";
import { formatVNDateTime } from "./utils";

// Add UTF-8 Byte Order Mark (BOM) so Excel opens Vietnamese characters without broken accents
const UTF8_BOM = "\uFEFF";

export function exportMembersToCsv(db: DatabaseSchema): string {
  const headers = [
    "ID",
    "Họ và Tên",
    "Email",
    "Số Điện Thoại",
    "Khóa / Lớp",
    "Ban Chính",
    "Vai Trò",
    "Trạng Thái",
    "Ngày Tham Gia",
  ];

  const rows = db.profiles.map((p) => {
    const primaryDeptMembership = db.department_memberships.find(
      (m) => m.user_id === p.id && m.is_primary
    );
    const dept = db.departments.find(
      (d) => d.id === primaryDeptMembership?.department_id
    );
    const roles = db.role_assignments
      .filter((r) => r.user_id === p.id)
      .map((r) => r.role)
      .join("; ");

    return [
      p.id,
      escapeCsv(p.full_name),
      escapeCsv(p.email),
      escapeCsv(p.phone || ""),
      escapeCsv(p.cohort_class || ""),
      escapeCsv(dept?.name || "Chưa phân ban"),
      escapeCsv(roles),
      p.status,
      p.created_at ? formatVNDateTime(p.created_at) : "",
    ];
  });

  return (
    UTF8_BOM +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
  );
}

export function exportPollResultsToCsv(
  db: DatabaseSchema,
  roundId: string
): string {
  const round = db.dance_poll_rounds.find((r) => r.id === roundId);
  if (!round) return "";

  const options = db.dance_poll_options.filter((o) => o.round_id === roundId);
  const totalVotes = db.dance_votes.filter((v) => v.round_id === roundId).length;

  const headers = [
    "Mã Bài Nhảy",
    "Tên Bài Nhảy",
    "Bài Hát",
    "Số Phiếu Bầu",
    "Tỷ Lệ (%)",
    "Danh Sách Người Đã Vote",
  ];

  const rows = options.map((opt) => {
    const dance = db.dances.find((d) => d.id === opt.dance_id);
    const votes = db.dance_votes.filter(
      (v) => v.round_id === roundId && v.option_id === opt.id
    );
    const pct = totalVotes > 0 ? ((votes.length / totalVotes) * 100).toFixed(1) : "0";
    const voterNames = votes
      .map((v) => {
        const u = db.profiles.find((p) => p.id === v.user_id);
        return u?.full_name || v.user_id;
      })
      .join("; ");

    return [
      dance?.code || "",
      escapeCsv(dance?.title || ""),
      escapeCsv(dance?.song_title || ""),
      votes.length.toString(),
      `${pct}%`,
      escapeCsv(voterNames),
    ];
  });

  return (
    UTF8_BOM +
    [
      escapeCsv(`Đợt bình chọn: ${round.title}`),
      `"Tổng số phiếu: ${totalVotes}"`,
      "",
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\r\n")
  );
}

export function exportPracticesToCsv(db: DatabaseSchema): string {
  const headers = [
    "Mã Buổi Tập",
    "Tên Buổi Tập",
    "Bài Nhảy",
    "Thời Gian Bắt Đầu (VN)",
    "Thời Gian Kết Thúc (VN)",
    "Địa Điểm",
    "Trạng Thái",
    "Sĩ Số Có Mặt",
    "Sĩ Số Vắng",
  ];

  const rows = db.practice_sessions.map((ps) => {
    const dance = db.dances.find((d) => d.id === ps.dance_id);
    const atts = db.practice_attendance.filter((a) => a.session_id === ps.id);
    const presentCount = atts.filter(
      (a) => a.status === "PRESENT" || a.status === "LATE"
    ).length;
    const absentCount = atts.filter(
      (a) => a.status === "ABSENT" || a.status === "EXCUSED"
    ).length;

    return [
      ps.id,
      escapeCsv(ps.title),
      escapeCsv(dance?.title || ""),
      formatVNDateTime(ps.start_at),
      formatVNDateTime(ps.end_at),
      escapeCsv(ps.location),
      ps.status,
      presentCount.toString(),
      absentCount.toString(),
    ];
  });

  return (
    UTF8_BOM +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
  );
}

export function exportMediaTasksToCsv(db: DatabaseSchema): string {
  const headers = [
    "Mã Task",
    "Tiêu Đề",
    "Loại Công Việc",
    "Mức Ưu Tiên",
    "Người Giao",
    "Người Nhận",
    "Hạn Chót (VN)",
    "Tiến Độ (%)",
    "Trạng Thái",
    "Số Phiên Bản Nộp",
    "Link Mới Nhất",
  ];

  const rows = db.media_tasks.map((t) => {
    const assigner = db.profiles.find((p) => p.id === t.assigner_id);
    const assignee = db.profiles.find((p) => p.id === t.assignee_id);
    const subs = db.media_task_submissions.filter((s) => s.task_id === t.id);
    const latestSub = subs[subs.length - 1];

    return [
      t.id,
      escapeCsv(t.title),
      t.task_type,
      t.priority,
      escapeCsv(assigner?.full_name || ""),
      escapeCsv(assignee?.full_name || ""),
      formatVNDateTime(t.due_at),
      `${t.progress_percent}%`,
      t.status,
      subs.length.toString(),
      escapeCsv(latestSub ? latestSub.url : ""),
    ];
  });

  return (
    UTF8_BOM +
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
  );
}

export function escapeCsv(val: string): string {
  if (/^[\s]*[=+@\-\t\r]/.test(val)) val = "'" + val;
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return `"${val}"`;
}
