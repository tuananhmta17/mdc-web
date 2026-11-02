"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/state-context";
import { formatVNDateTime, formatVNTime, getDayNameVN } from "@/lib/utils";
import {
  CalendarCheck2,
  Plus,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Download,
  AlertCircle,
  Edit3,
} from "lucide-react";
import { RSVPResponse, AttendanceStatus } from "@/lib/types";

export default function PracticePage() {
  const { data, refresh } = useAppState();
  const session = data.session;

  const [filterDanceId, setFilterDanceId] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);

  // New practice form
  const [newDanceId, setNewDanceId] = useState(data.dances[0]?.id || "");
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("Gương Nhà Thể Chất Tầng 3 - Học viện Kỹ thuật Quân sự");
  const [notes, setNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleCreatePractice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError("");

    try {
      const res = await fetch("/api/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dance_id: newDanceId,
          title,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
          location,
          notes,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Lỗi tạo buổi tập");
      }

      setShowCreateModal(false);
      setTitle("");
      setNotes("");
      await refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRsvp = async (sessionId: string, response: RSVPResponse) => {
    try {
      await fetch(`/api/practices/${sessionId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      await refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAttendance = async (sessionId: string, userId: string, status: AttendanceStatus) => {
    try {
      await fetch(`/api/practices/${sessionId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, status }),
      });
      await refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!cancelReason) {
      setActionError("Vui lòng nhập lý do hủy hoặc đổi lịch tập");
      return;
    }

    try {
      await fetch(`/api/practices/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          cancel_reason: cancelReason,
        }),
      });

      setShowCancelModal(null);
      setCancelReason("");
      await refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSessions = data.practiceSessions.filter((s) => {
    if (filterDanceId !== "ALL" && s.dance_id !== filterDanceId) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <CalendarCheck2 className="w-7 h-7 text-mdc-red" />
            <span>Lịch Tập Rehearsal & Điểm Danh</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Xếp lịch tập theo gợi ý của hệ thống, gửi email thông báo tự động và điểm danh thành viên có mặt.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/export?type=practices"
            download
            className="px-4 py-2 rounded-xl bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border text-xs font-semibold text-slate-200 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-mdc-red" />
            <span>Xuất CSV Lịch & Điểm Danh</span>
          </a>

          {(session?.isBoardAdmin || session?.isDanceHead || session?.roles.includes("DANCE_LEADER")) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-xs font-semibold text-white transition-all flex items-center gap-2 shadow-glowRed active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Lên Lịch Tập Mới</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Routine Filter */}
      <div className="p-4 bg-mdc-surface border border-mdc-border rounded-2xl flex items-center justify-between gap-3 shadow-sm">
        <span className="text-xs text-slate-400 font-semibold">Lọc theo bài nhảy:</span>
        <select
          value={filterDanceId}
          onChange={(e) => setFilterDanceId(e.target.value)}
          className="bg-mdc-card border border-mdc-border rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-mdc-red"
        >
          <option value="ALL">Tất cả các bài nhảy</option>
          {data.dances.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="p-12 text-center bg-mdc-surface border border-mdc-border rounded-2xl text-slate-400 text-sm">
            Hiện chưa có buổi tập nào trong danh mục này.
          </div>
        ) : (
          filteredSessions.map((sessionItem) => {
            const dance = data.dances.find((d) => d.id === sessionItem.dance_id);
            const rsvps = data.practiceRsvps.filter((r) => r.session_id === sessionItem.id);
            const attendance = data.practiceAttendance.filter((a) => a.session_id === sessionItem.id);
            const myRsvp = rsvps.find((r) => r.user_id === session?.user.id);

            const isLeader = dance?.leader_id === session?.user.id;
            const canManage = session?.isBoardAdmin || session?.isDanceHead || isLeader;

            const attendingCount = rsvps.filter((r) => r.response === "ATTENDING").length;
            const declinedCount = rsvps.filter((r) => r.response === "DECLINED").length;
            const presentCount = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;

            return (
              <div
                key={sessionItem.id}
                className="bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4 hover:border-white/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-mdc-border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-mdc-red/20 text-mdc-red">
                        {dance?.title || "Bài nhảy"}
                      </span>
                      <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                        sessionItem.status === "SCHEDULED"
                          ? "bg-mdc-emerald/20 text-mdc-emerald"
                          : sessionItem.status === "CANCELLED"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-mdc-amber/20 text-mdc-amber"
                      }`}>
                        {sessionItem.status}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white">{sessionItem.title}</h2>
                  </div>

                  {canManage && sessionItem.status !== "CANCELLED" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAttendanceModal(sessionItem.id)}
                        className="px-3 py-1.5 rounded-xl bg-mdc-card hover:bg-white/10 border border-mdc-border text-xs font-semibold text-white transition-all flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5 text-mdc-red" />
                        <span>Điểm Danh ({presentCount})</span>
                      </button>

                      <button
                        onClick={() => setShowCancelModal(sessionItem.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 transition-all"
                      >
                        Hủy Buổi Tập
                      </button>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2 bg-mdc-card p-3 rounded-xl border border-mdc-border">
                    <Clock className="w-4 h-4 text-mdc-red shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Thời gian (Giờ VN)</div>
                      <div className="text-slate-400 font-mono text-[11px]">
                        {formatVNDateTime(sessionItem.start_at)} &rarr; {formatVNTime(sessionItem.end_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-mdc-card p-3 rounded-xl border border-mdc-border">
                    <MapPin className="w-4 h-4 text-mdc-red shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Địa điểm</div>
                      <div className="text-slate-400 text-[11px] truncate">{sessionItem.location}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-mdc-card p-3 rounded-xl border border-mdc-border">
                    <Users className="w-4 h-4 text-mdc-emerald shrink-0" />
                    <div>
                      <div className="font-semibold text-white">Phản Hồi Tham Gia</div>
                      <div className="text-slate-400 text-[11px]">
                        <strong className="text-mdc-emerald">{attendingCount} Có mặt</strong> &bull;{" "}
                        <strong className="text-red-400">{declinedCount} Bận</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {sessionItem.notes && (
                  <div className="text-xs text-slate-400 bg-mdc-card/40 p-3 rounded-xl border border-mdc-border">
                    <strong>Ghi chú từ Leader:</strong> {sessionItem.notes}
                  </div>
                )}

                {sessionItem.cancel_reason && (
                  <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/30">
                    <strong>Lý do hủy/thay đổi:</strong> {sessionItem.cancel_reason}
                  </div>
                )}

                {/* RSVP Controls for Members */}
                {sessionItem.status === "SCHEDULED" && (
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-mdc-border">
                    <span className="text-slate-400">
                      RSVP của bạn:{" "}
                      <strong className="text-white">
                        {myRsvp?.response === "ATTENDING"
                          ? "Sẽ tham gia (Attending)"
                          : myRsvp?.response === "DECLINED"
                          ? "Bận không tham gia (Declined)"
                          : "Chưa phản hồi (Pending)"}
                      </strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRsvp(sessionItem.id, "ATTENDING")}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          myRsvp?.response === "ATTENDING"
                            ? "bg-mdc-emerald text-white shadow-sm"
                            : "bg-white/5 hover:bg-mdc-emerald/20 text-slate-300 hover:text-mdc-emerald"
                        }`}
                      >
                        &check; Sẽ Đi Tập
                      </button>

                      <button
                        onClick={() => handleRsvp(sessionItem.id, "DECLINED")}
                        className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          myRsvp?.response === "DECLINED"
                            ? "bg-red-500 text-white shadow-sm"
                            : "bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400"
                        }`}
                      >
                        &cross; Báo Vắng
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mdc-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-mdc-red" />
                <span>Bảng Điểm Danh Thành Viên</span>
              </h3>
              <button
                onClick={() => setShowAttendanceModal(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
              {data.profiles
                .filter((p) => p.status === "ACTIVE")
                .map((member) => {
                  const att = data.practiceAttendance.find(
                    (a) => a.session_id === showAttendanceModal && a.user_id === member.id
                  );
                  const currentStatus = att?.status || "ABSENT";

                  return (
                    <div
                      key={member.id}
                      className="p-3 bg-mdc-card rounded-xl border border-mdc-border flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-white">{member.full_name}</div>
                        <div className="text-[11px] text-slate-400">{member.cohort_class || member.email}</div>
                      </div>

                      <div className="flex items-center gap-1">
                        {(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as AttendanceStatus[]).map((st) => (
                          <button
                            key={st}
                            onClick={() => handleMarkAttendance(showAttendanceModal, member.id, st)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                              currentStatus === st
                                ? st === "PRESENT"
                                  ? "bg-mdc-emerald text-white"
                                  : st === "LATE"
                                  ? "bg-mdc-amber text-black"
                                  : st === "EXCUSED"
                                  ? "bg-mdc-cyan text-white"
                                  : "bg-red-500 text-white"
                                : "bg-white/5 text-slate-400 hover:text-white"
                            }`}
                          >
                            {st === "PRESENT" ? "Có mặt" : st === "LATE" ? "Muộn" : st === "EXCUSED" ? "Có phép" : "Vắng"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>

            <button
              onClick={() => setShowAttendanceModal(null)}
              className="w-full py-2 rounded-xl bg-mdc-card text-white text-xs font-semibold hover:bg-white/10 transition-all"
            >
              Hoàn Tất Điểm Danh
            </button>
          </div>
        </div>
      )}

      {/* Cancel Practice Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>Hủy Buổi Tập & Gửi Thông Báo Tự Động</span>
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Khi xác nhận hủy, hệ thống sẽ tự động cập nhật trạng thái và gửi email thông báo kèm lý do đến tất cả thành viên trong đội.
            </p>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1">Lý do hủy buổi tập *</label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Phòng gương tầng 3 bảo trì đột xuất, dời sang thứ Năm..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-mdc-card border border-mdc-border rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(null)}
                className="px-4 py-2 rounded-xl bg-mdc-card text-slate-400 text-xs font-semibold"
              >
                Hủy Thao Tác
              </button>
              <button
                onClick={() => handleCancelSession(showCancelModal)}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold"
              >
                Xác Nhận Hủy Buổi Tập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Practice Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mdc-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-mdc-red" />
                <span>Lên Lịch Buổi Tập Mới</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePractice} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Bài Nhảy *</label>
                <select
                  value={newDanceId}
                  onChange={(e) => setNewDanceId(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                >
                  {data.dances.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.song_title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nội Dung Buổi Tập *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tập line chuyển đoạn điệp khúc & khớp nhạc"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bắt Đầu (Giờ VN) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kết Thúc (Giờ VN) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Địa Điểm Tập *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Ghi Chú Trang Phục / Dụng Cụ</label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Mang giày đế bám, áo đen đồng bộ để quay clip..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-mdc-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-mdc-card text-slate-400 hover:text-white font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-white font-semibold shadow-glowRed transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? "Đang lên lịch..." : "Chốt Buổi Tập & Gửi Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
