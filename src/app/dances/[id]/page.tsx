"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { apiRequest, useAppState } from "@/lib/state-context";
import { formatVNDate, formatVNDateTime, getDayNameVN } from "@/lib/utils";
import {
  Flame,
  ArrowLeft,
  Music2,
  Video,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Shield,
  AlertCircle,
  MapPin,
  ChevronRight,
} from "lucide-react";

export default function DanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, refresh } = useAppState();
  const session = data.session;

  const [activeTab, setActiveTab] = useState<"overview" | "roster" | "availability" | "practices">("overview");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [regNote, setRegNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const dance = data.dances.find((d) => d.id === id);

  useEffect(() => {
    if (activeTab === "availability" && dance) {
      setLoadingRecs(true);
      fetch(`/api/dances/${id}/availability`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Không có quyền xem lịch rảnh");
        })
        .then((json) => setRecommendations(json.recommendations || []))
        .catch((err) => setActionError(err.message))
        .finally(() => setLoadingRecs(false));
    }
  }, [activeTab, id, dance]);

  if (!dance) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="text-slate-400 text-sm">Không tìm thấy bài nhảy này.</div>
        <Link href="/dances" className="text-mdc-red hover:underline text-xs font-semibold">
          &larr; Quay lại danh sách bài nhảy
        </Link>
      </div>
    );
  }

  const leader = data.profiles.find((p) => p.id === dance.leader_id);
  const registrations = data.registrations.filter((r) => r.dance_id === id);
  const approvedDancers = registrations.filter((r) => r.status === "APPROVED");
  const waitlistedDancers = registrations.filter((r) => r.status === "WAITLISTED");
  const pendingDancers = registrations.filter((r) => r.status === "REGISTERED");
  const myRegistration = registrations.find((r) => r.user_id === session?.user.id);
  const practices = data.practiceSessions.filter((p) => p.dance_id === id);

  const isLeader = dance.leader_id === session?.user.id;
  const canManage = session?.isBoardAdmin || session?.isDanceHead || isLeader;

  const handleRegister = async (cancel = false) => {
    setActionError("");
    setActionSuccess("");
    try {
      const res = await apiRequest(`/api/dances/${id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: regNote, cancel }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Lỗi thao tác đăng ký");
      }

      setActionSuccess(cancel ? "Đã hủy đăng ký bài nhảy." : "Đăng ký bài nhảy thành công!");
      await refresh();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleApproveRegistration = async (regId: string, status: string) => {
    try { await apiRequest(`/api/dances/${id}/register`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: regId, status }),
    });
    await refresh(); } catch (err) { setActionError(err instanceof Error ? err.message : "Không thể lưu thay đổi."); }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    await apiRequest(`/api/dances/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await refresh();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back button */}
      <div>
        <Link
          href="/dances"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại kho bài nhảy</span>
        </Link>
      </div>

      {/* Hero Banner of Dance */}
      <div className="relative rounded-3xl overflow-hidden border border-mdc-border bg-mdc-surface shadow-card">
        <div className="relative h-64 md:h-72 w-full">
          <img
            src={dance.cover_url || "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80"}
            alt={dance.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-mdc-bg via-mdc-surface/80 to-black/60" />

          {/* Top badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <span className="text-xs uppercase font-mono px-3 py-1 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20">
              {dance.code} &bull; {dance.visibility === "ALL_CLUB" ? "Toàn CLB" : "Ban Chuyên Môn"}
            </span>

            <span className="text-xs uppercase font-bold px-3 py-1 rounded-full bg-mdc-red text-white shadow-glowRed">
              {dance.status}
            </span>
          </div>

          {/* Bottom title & details */}
          <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 space-y-2">
            <div className="flex items-center gap-2 text-mdc-red font-mono text-xs">
              <Music2 className="w-4 h-4" />
              <span>{dance.song_title}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              {dance.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <span>Leader: <strong className="text-white">{leader?.full_name || "Chưa gán"}</strong></span>
              <span>&bull;</span>
              <span>Sĩ số: <strong className="text-white">{approvedDancers.length} / {dance.capacity}</strong></span>
              {dance.target_performance_date && (
                <>
                  <span>&bull;</span>
                  <span>Biểu diễn: <strong className="text-white">{formatVNDate(dance.target_performance_date)}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center border-t border-mdc-border bg-mdc-surface px-4 md:px-6 overflow-x-auto no-scrollbar">
          {[
            { key: "overview", label: "Tổng Quan" },
            { key: "roster", label: `Đội Hình (${approvedDancers.length}/${dance.capacity})` },
            { key: "availability", label: "Lịch Rảnh & Gợi Ý Tập" },
            { key: "practices", label: `Lịch Tập (${practices.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-3.5 px-4 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-mdc-red text-white"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {actionError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 bg-mdc-surface border border-mdc-border rounded-2xl shadow-card space-y-3">
              <h2 className="text-base font-bold text-white">Mô Tả & Định Hướng Biên Đạo</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {dance.description}
              </p>
            </div>

            <div className="p-6 bg-mdc-surface border border-mdc-border rounded-2xl shadow-card space-y-4">
              <h2 className="text-base font-bold text-white">Tài Nguyên Âm Nhạc & Video Biên Đạo</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dance.music_url ? (
                  <a
                    href={dance.music_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 rounded-xl bg-mdc-card border border-mdc-border hover:border-mdc-red/50 transition-all flex items-center justify-between text-xs text-white group"
                  >
                    <div className="flex items-center gap-3">
                      <Music2 className="w-5 h-5 text-mdc-red group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold">Bản Nhạc Chính Thức</div>
                        <div className="text-[11px] text-slate-400">Spotify / SoundCloud</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </a>
                ) : (
                  <div className="p-4 rounded-xl bg-mdc-card border border-mdc-border text-xs text-slate-500">
                    Chưa cập nhật link nhạc
                  </div>
                )}

                {dance.video_url ? (
                  <a
                    href={dance.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 rounded-xl bg-mdc-card border border-mdc-border hover:border-mdc-cyan/50 transition-all flex items-center justify-between text-xs text-white group"
                  >
                    <div className="flex items-center gap-3">
                      <Video className="w-5 h-5 text-mdc-cyan group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="font-bold">Video Clip Demo Vũ Đạo</div>
                        <div className="text-[11px] text-slate-400">YouTube / Drive</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </a>
                ) : (
                  <div className="p-4 rounded-xl bg-mdc-card border border-mdc-border text-xs text-slate-500">
                    Chưa cập nhật link video
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Registration & Management Sidebar */}
          <div className="space-y-6">
            {/* Registration Box */}
            <div className="p-6 bg-mdc-surface border border-mdc-border rounded-2xl shadow-card space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-mdc-red" />
                <span>Trạng Thái Đăng Ký Của Bạn</span>
              </h3>

              {myRegistration ? (
                <div className="p-4 rounded-xl bg-mdc-card border border-mdc-border space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Trạng thái:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      myRegistration.status === "APPROVED"
                        ? "bg-mdc-emerald/20 text-mdc-emerald"
                        : myRegistration.status === "WAITLISTED"
                        ? "bg-mdc-amber/20 text-mdc-amber"
                        : "bg-white/10 text-white"
                    }`}>
                      {myRegistration.status === "APPROVED" ? "Đã Duyệt Vào Đội" : myRegistration.status === "WAITLISTED" ? "Danh Sách Chờ" : "Đã Đăng Ký"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Đăng ký lúc: {formatVNDateTime(myRegistration.registered_at)}
                  </div>
                  <button
                    onClick={() => handleRegister(true)}
                    className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all"
                  >
                    Hủy Đăng Ký
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Bài nhảy hiện đang mở đăng ký. Hãy để lại ghi chú vị trí line hoặc kinh nghiệm vũ đạo (nếu có):
                  </p>
                  <textarea
                    rows={2}
                    placeholder="Ghi chú (Ví dụ: line cánh trái, đã thuộc nhịp...)"
                    value={regNote}
                    onChange={(e) => setRegNote(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red"
                  />
                  <button
                    onClick={() => handleRegister(false)}
                    className="w-full py-2.5 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-white text-xs font-bold transition-all shadow-glowRed active:scale-[0.98]"
                  >
                    Đăng Ký Tham Gia Bài Nhảy
                  </button>
                </div>
              )}
            </div>

            {/* Life cycle status switcher (Board / Dance Head) */}
            {canManage && (
              <div className="p-6 bg-mdc-surface border border-mdc-border rounded-2xl shadow-card space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-mdc-amber" />
                  <span>Quản Lý Vòng Đời Bài Nhảy</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <label className="block text-slate-400">Chuyển trạng thái quy trình:</label>
                  <select
                    value={dance.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl p-2.5 text-white font-semibold focus:outline-none focus:border-mdc-red"
                  >
                    <option value="DRAFT">DRAFT (Bản nháp)</option>
                    <option value="VOTING">VOTING (Mở bình chọn)</option>
                    <option value="SELECTED">SELECTED (Đã chọn bài)</option>
                    <option value="RECRUITING">RECRUITING (Tuyển vũ công)</option>
                    <option value="PRACTICING">PRACTICING (Đang tập luyện)</option>
                    <option value="COMPLETED">COMPLETED (Hoàn thành biểu diễn)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Roster / Đội Hình */}
      {activeTab === "roster" && (
        <div className="space-y-6">
          <div className="p-6 bg-mdc-surface border border-mdc-border rounded-2xl shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Đội Hình Chính Thức Đã Duyệt</h2>
                <p className="text-xs text-slate-400">
                  {approvedDancers.length} / {dance.capacity} vũ công đã được Leader phê duyệt
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {approvedDancers.map((reg) => {
                const user = data.profiles.find((p) => p.id === reg.user_id);
                const isLeaderUser = user?.id === dance.leader_id;

                return (
                  <div
                    key={reg.id}
                    className="p-3.5 rounded-xl bg-mdc-card border border-mdc-border flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mdc-crimson to-mdc-red text-white flex items-center justify-center font-bold text-xs uppercase">
                        {user?.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          {user?.full_name}
                          {isLeaderUser && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-mdc-amber/20 text-mdc-amber">
                              LEADER
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{user?.cohort_class || user?.email}</div>
                      </div>
                    </div>

                    {canManage && !isLeaderUser && (
                      <button
                        onClick={() => handleApproveRegistration(reg.id, "WAITLISTED")}
                        className="text-[11px] text-slate-400 hover:text-amber-400"
                        title="Chuyển sang danh sách chờ"
                      >
                        Chuyển chờ
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending / Waitlist Applications */}
          {(pendingDancers.length > 0 || waitlistedDancers.length > 0) && (
            <div className="p-6 bg-mdc-surface border border-mdc-border rounded-2xl shadow-card space-y-4">
              <h2 className="text-base font-bold text-white">Đơn Đăng Ký Đang Chờ Duyệt & Danh Sách Chờ (Waitlist)</h2>

              <div className="space-y-2">
                {[...pendingDancers, ...waitlistedDancers].map((reg) => {
                  const user = data.profiles.find((p) => p.id === reg.user_id);
                  return (
                    <div
                      key={reg.id}
                      className="p-3 rounded-xl bg-mdc-card border border-mdc-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {user?.full_name}
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            reg.status === "WAITLISTED" ? "bg-mdc-amber/20 text-mdc-amber" : "bg-white/10 text-slate-300"
                          }`}>
                            {reg.status}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">Ghi chú: {reg.note || "Không có"}</div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveRegistration(reg.id, "APPROVED")}
                            className="px-3 py-1 rounded-lg bg-mdc-emerald/20 text-mdc-emerald hover:bg-mdc-emerald/30 font-semibold text-[11px]"
                          >
                            Duyệt vào đội
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Availability & Smart Schedule Recommender */}
      {activeTab === "availability" && (
        <div className="space-y-6">
          <div className="p-6 bg-mdc-surface border border-mdc-border rounded-2xl shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-mdc-red" />
                  <span>Bộ Gợi Ý Khung Giờ Tập Tối Ưu (Smart Scheduler Algorithm)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Xếp hạng theo công thức đặc tả: <code>score = 1.0 &times; AVAILABLE + 0.5 &times; MAYBE &minus; phạt(xung đột &amp; vắng leader)</code>.
                </p>
              </div>
            </div>

            {loadingRecs ? (
              <div className="py-8 text-center text-xs text-slate-400">Đang tính toán khung giờ tối ưu...</div>
            ) : recommendations.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Chưa có dữ liệu lịch rảnh từ các thành viên trong đội.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recommendations.slice(0, 5).map((rec, index) => (
                  <div
                    key={`${rec.dayOfWeek}-${rec.startTime}`}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      index === 0
                        ? "bg-mdc-red/10 border-mdc-red/50 shadow-glowRed"
                        : "bg-mdc-card border-mdc-border"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          index === 0 ? "bg-mdc-red text-white" : "bg-white/10 text-slate-300"
                        }`}>
                          TOP #{rec.recommendationRank}
                        </span>
                        <strong className="text-white text-sm">
                          {rec.dayName} &bull; {rec.startTime} - {rec.endTime}
                        </strong>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span className="text-mdc-emerald font-semibold">{rec.availableUsers.length} người Rảnh</span>
                        <span>&bull;</span>
                        <span className="text-mdc-amber font-semibold">{rec.maybeUsers.length} người Có thể</span>
                        <span>&bull;</span>
                        <span>{rec.unavailableUsers.length} người Bận</span>
                        {rec.isLeaderAvailable && (
                          <>
                            <span>&bull;</span>
                            <span className="text-mdc-emerald font-bold">&check; Leader có mặt</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-mono">Điểm Phù Hợp</div>
                        <div className="text-base font-extrabold text-white">{rec.score} pts</div>
                      </div>

                      {canManage && (
                        <Link
                          href={`/practice?create=true&danceId=${id}&day=${rec.dayOfWeek}&start=${rec.startTime}&end=${rec.endTime}`}
                          className="px-3.5 py-1.5 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-white font-bold text-xs transition-all shadow-glowRed active:scale-[0.98]"
                        >
                          Chốt Giờ Này
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Practices */}
      {activeTab === "practices" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Lịch Tập Của Bài Nhảy Này</h2>
            {canManage && (
              <Link
                href={`/practice?create=true&danceId=${id}`}
                className="px-3.5 py-1.5 rounded-xl bg-mdc-red text-white text-xs font-semibold shadow-glowRed"
              >
                + Thêm Buổi Tập
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {practices.length === 0 ? (
              <div className="p-8 text-center bg-mdc-surface border border-mdc-border rounded-2xl text-slate-400 text-xs">
                Chưa có buổi tập nào được lên lịch cho bài này.
              </div>
            ) : (
              practices.map((p) => (
                <div key={p.id} className="p-4 bg-mdc-surface border border-mdc-border rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white text-sm">{p.title}</div>
                    <div className="text-slate-400 mt-1 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-mdc-red" />
                      <span>{formatVNDateTime(p.start_at)}</span>
                      <span>&bull;</span>
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.location}</span>
                    </div>
                  </div>
                  <Link
                    href="/practice"
                    className="px-3 py-1.5 rounded-xl bg-mdc-card text-slate-200 hover:text-white font-semibold text-xs border border-mdc-border"
                  >
                    Xem Chi Tiết &rarr;
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
