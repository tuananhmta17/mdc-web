"use client";

import React, { useState } from "react";
import { apiRequest, useAppState } from "@/lib/state-context";
import { formatVNDateTime } from "@/lib/utils";
import {
  ShieldCheck,
  Users,
  Flame,
  KanbanSquare,
  Download,
  Bell,
  Plus,
  History,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";

export default function BoardExecutivePage() {
  const { data, refresh } = useAppState();
  const session = data.session;

  const [showAncModal, setShowAncModal] = useState(false);
  const [ancTitle, setAncTitle] = useState("");
  const [ancBody, setAncBody] = useState("");
  const [ancAudience, setAncAudience] = useState<"ALL_CLUB" | "DANCE_ONLY" | "MEDIA_ONLY" | "BOARD_ONLY">("ALL_CLUB");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  const activeMembers = data.profiles.filter((p) => p.status === "ACTIVE");
  const danceMembers = data.departmentMemberships.filter(
    (m) => m.department_id === "dept-dance" && m.status === "ACTIVE"
  ).length;
  const mediaMembers = data.departmentMemberships.filter(
    (m) => m.department_id === "dept-media" && m.status === "ACTIVE"
  ).length;
  const boardMembers = data.departmentMemberships.filter(
    (m) => m.department_id === "dept-board" && m.status === "ACTIVE"
  ).length;

  const approvedTasks = data.mediaTasks.filter((t) => t.status === "APPROVED").length;
  const totalTasks = data.mediaTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;
  const overdueTasks = data.mediaTasks.filter(
    (t) => new Date(t.due_at) < new Date() && t.status !== "APPROVED"
  );

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPosting(true);
    try {
      const res = await apiRequest("/api/board/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ancTitle,
          body: ancBody,
          audience: ancAudience,
        }),
      });

      if (res.ok) {
        setShowAncModal(false);
        setAncTitle("");
        setAncBody("");
        await refresh();
      }
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-mdc-amber" />
            <span>Trung Tâm Điều Hành Ban Chủ Nhiệm (Executive Dashboard)</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Giám sát toàn diện dữ liệu Ban Chuyên môn và Ban Truyền thông, đăng thông báo và tra cứu nhật ký kiểm toán.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAncModal(true)}
            className="px-4 py-2.5 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-xs font-semibold text-white transition-all flex items-center gap-2 shadow-glowRed active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng Thông Báo CLB</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng Thành Viên Hoạt Động</span>
            <Users className="w-5 h-5 text-mdc-red" />
          </div>
          <div className="text-3xl font-black text-white">{activeMembers.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span>Chuyên môn: {danceMembers}</span> &bull; <span>Media: {mediaMembers}</span> &bull; <span>Chủ nhiệm: {boardMembers}</span>
          </div>
        </div>

        <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Bài Nhảy & Routine</span>
            <Flame className="w-5 h-5 text-mdc-amber" />
          </div>
          <div className="text-3xl font-black text-white">{data.dances.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {data.dances.filter((d) => d.status === "PRACTICING").length} bài đang trong giai đoạn tập luyện
          </div>
        </div>

        <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tỷ Lệ Hoàn Thành Task Media</span>
            <KanbanSquare className="w-5 h-5 text-mdc-cyan" />
          </div>
          <div className="text-3xl font-black text-white">{completionRate}%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Đã duyệt {approvedTasks} / {totalTasks} nhiệm vụ
          </div>
        </div>

        <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cảnh Báo Quá Hạn</span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-black text-red-400">{overdueTasks.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {overdueTasks.length > 0 ? "Cần nhắc nhở các bạn phụ trách" : "Mọi việc đều đúng hạn"}
          </div>
        </div>
      </div>

      {/* CSV Export Suite */}
      <div className="p-6 bg-mdc-surface border border-mdc-border rounded-2xl shadow-card space-y-3">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-mdc-emerald" />
          <span>Bộ Xuất Báo Cáo CSV (Tương Thích Excel Tiếng Việt)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <a
            href="/api/export?type=members"
            download
            className="p-3 bg-mdc-card hover:bg-white/10 border border-mdc-border rounded-xl text-xs font-semibold text-white flex items-center justify-between transition-all"
          >
            <span>Danh Sách Thành Viên</span>
            <Download className="w-4 h-4 text-mdc-red" />
          </a>
          <a
            href="/api/export?type=poll"
            download
            className="p-3 bg-mdc-card hover:bg-white/10 border border-mdc-border rounded-xl text-xs font-semibold text-white flex items-center justify-between transition-all"
          >
            <span>Kết Quả Bình Chọn Vote</span>
            <Download className="w-4 h-4 text-mdc-amber" />
          </a>
          <a
            href="/api/export?type=practices"
            download
            className="p-3 bg-mdc-card hover:bg-white/10 border border-mdc-border rounded-xl text-xs font-semibold text-white flex items-center justify-between transition-all"
          >
            <span>Lịch Tập & Điểm Danh</span>
            <Download className="w-4 h-4 text-mdc-emerald" />
          </a>
          <a
            href="/api/export?type=tasks"
            download
            className="p-3 bg-mdc-card hover:bg-white/10 border border-mdc-border rounded-xl text-xs font-semibold text-white flex items-center justify-between transition-all"
          >
            <span>Nhiệm Vụ & Link Media</span>
            <Download className="w-4 h-4 text-mdc-cyan" />
          </a>
        </div>
      </div>

      {/* Audit Logs Viewer (Section 3.5 & Acceptance criterion 11) */}
      <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-mdc-amber" />
            <span>Nhật Ký Kiểm Toán Hoạt Động (Audit Logs)</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {data.auditLogs.length} sự kiện được ghi lại
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Mọi thao tác thay đổi quyền, bài nhảy, lịch tập, duyệt sản phẩm và gửi thông báo đều được lưu vết chi tiết trước/sau để Ban Chủ nhiệm giám sát.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-mdc-card text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-mdc-border">
              <tr>
                <th className="py-3 px-4">Thời Gian (VN)</th>
                <th className="py-3 px-4">Người Thực Hiện</th>
                <th className="py-3 px-4">Hành Động</th>
                <th className="py-3 px-4">Đối Tượng</th>
                <th className="py-3 px-4 text-right">Chi Tiết JSON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mdc-border">
              {data.auditLogs.slice(0, 10).map((log) => {
                const actor = data.profiles.find((p) => p.id === log.actor_id);

                return (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {formatVNDateTime(log.occurred_at)}
                    </td>
                    <td className="py-3 px-4 text-white font-semibold">
                      {actor?.full_name || log.actor_id || "Hệ thống"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-mdc-red font-bold">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {log.entity_type}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedAuditLog(log)}
                        className="text-xs text-mdc-amber hover:underline font-semibold"
                      >
                        Xem Diff &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Diff Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mdc-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-mdc-amber" />
                <span>Chi Tiết Sự Kiện: {selectedAuditLog.action}</span>
              </h3>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400">Thời gian:</span>{" "}
                <span className="font-mono text-white">{formatVNDateTime(selectedAuditLog.occurred_at)}</span>
              </div>

              {selectedAuditLog.before_json && (
                <div>
                  <div className="font-semibold text-red-400 mb-1">Dữ liệu trước thay đổi (Before):</div>
                  <pre className="p-3 bg-mdc-card rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedAuditLog.before_json, null, 2)}
                  </pre>
                </div>
              )}

              {selectedAuditLog.after_json && (
                <div>
                  <div className="font-semibold text-mdc-emerald mb-1">Dữ liệu sau thay đổi (After):</div>
                  <pre className="p-3 bg-mdc-card rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedAuditLog.after_json, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-mdc-border">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 rounded-xl bg-mdc-card text-white text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Announcement Modal */}
      {showAncModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mdc-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-mdc-red" />
                <span>Đăng Thông Báo Toàn CLB</span>
              </h3>
              <button
                onClick={() => setShowAncModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tiêu Đề Thông Báo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kế hoạch biểu diễn kỷ niệm 60 năm Học viện"
                  value={ancTitle}
                  onChange={(e) => setAncTitle(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nội Dung Thông Báo *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Nội dung truyền đạt đến các ban..."
                  value={ancBody}
                  onChange={(e) => setAncBody(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Đối Tượng Nhận</label>
                <select
                  value={ancAudience}
                  onChange={(e) => setAncAudience(e.target.value as any)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                >
                  <option value="ALL_CLUB">Toàn Thể CLB (Tất cả thành viên)</option>
                  <option value="DANCE_ONLY">Chỉ Ban Chuyên Môn</option>
                  <option value="MEDIA_ONLY">Chỉ Ban Truyền Thông</option>
                  <option value="BOARD_ONLY">Chỉ Ban Chủ Nhiệm</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-mdc-border">
                <button
                  type="button"
                  onClick={() => setShowAncModal(false)}
                  className="px-4 py-2 rounded-xl bg-mdc-card text-slate-400 hover:text-white font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isPosting}
                  className="px-5 py-2 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-white font-bold transition-all shadow-glowRed active:scale-[0.98]"
                >
                  {isPosting ? "Đang đăng..." : "Phát Đi Thông Báo & Gửi Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
