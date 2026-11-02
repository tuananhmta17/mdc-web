"use client";

import React from "react";
import Link from "next/link";
import { useAppState } from "@/lib/state-context";
import { formatVNDateTime, formatVNTime } from "@/lib/utils";
import {
  Flame,
  CalendarCheck2,
  KanbanSquare,
  Vote,
  Bell,
  ArrowRight,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Sparkles,
  Music2,
  Video,
} from "lucide-react";

export default function DashboardPage() {
  const { data, loading, switchUser } = useAppState();
  const session = data.session;

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-2 border-mdc-red border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-slate-400 text-sm">Đang tải dữ liệu MDC...</div>
      </div>
    );
  }

  const now = new Date();
  const activeDances = data.dances.filter((d) => d.status === "PRACTICING" || d.status === "RECRUITING");
  const openPolls = data.pollRounds.filter((p) => p.status === "OPEN");
  const upcomingPractices = data.practiceSessions
    .filter((p) => p.status !== "CANCELLED" && new Date(p.start_at) >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const myTasks = data.mediaTasks.filter(
    (t) => t.assignee_id === session?.user.id && t.status !== "APPROVED"
  );
  const overdueTasks = data.mediaTasks.filter(
    (t) => new Date(t.due_at) < now && t.status !== "APPROVED"
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Attention (Hero Section) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-mdc-crimson/90 via-mdc-surface to-mdc-card border border-mdc-border p-6 sm:p-8 md:p-10 shadow-card">
        <div className="absolute top-0 right-0 w-96 h-96 bg-mdc-red/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="max-w-5xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold mb-4 backdrop-blur-sm border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-mdc-red" />
            <span>MDC Central Command &bull; {session?.primaryDepartment?.name || "Thành viên CLB"}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight mb-3">
            Xin chào, {session?.user.full_name}!
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed mb-6">
            Hệ thống quản lý bài nhảy, xếp lịch tập thông minh và phối hợp truyền thông của <strong>MTA Dance Crew</strong>. Theo dõi mọi hoạt động trong tuần của bạn ngay dưới đây.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dances"
              className="px-5 py-2.5 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-white font-semibold text-xs transition-all active:scale-[0.98] shadow-glowRed flex items-center gap-2"
            >
              <Flame className="w-4 h-4" />
              <span>Xem Các Bài Nhảy</span>
            </Link>

            <Link
              href="/availability"
              className="px-5 py-2.5 rounded-xl bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border text-slate-200 font-semibold text-xs transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-mdc-red" />
              <span>Khai Báo Lịch Rảnh Tuần</span>
            </Link>

            {session?.isMediaHead && (
              <Link
                href="/media/tasks"
                className="px-5 py-2.5 rounded-xl bg-mdc-cyan/20 border border-mdc-cyan/40 text-mdc-cyan font-semibold text-xs hover:bg-mdc-cyan/30 transition-all flex items-center gap-2"
              >
                <KanbanSquare className="w-4 h-4" />
                <span>Giao Việc Truyền Thông</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 2. Gapless Bento Metrics Grid (Interest) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 grid-flow-dense">
        {/* Metric 1: Active Routines */}
        <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-5 hover:border-mdc-red/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Bài Đang Luyện Tập</span>
            <Flame className="w-5 h-5 text-mdc-red" />
          </div>
          <div className="text-3xl font-extrabold text-white">{activeDances.length}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span>Tổng cộng {data.dances.length} bài trong kho biên đạo</span>
          </div>
        </div>

        {/* Metric 2: Open Polls */}
        <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-5 hover:border-mdc-amber/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Bình Chọn Đang Mở</span>
            <Vote className="w-5 h-5 text-mdc-amber" />
          </div>
          <div className="text-3xl font-extrabold text-white">{openPolls.length}</div>
          <div className="text-xs text-slate-400 mt-1">
            {openPolls.length > 0 ? "Bấm vào để bỏ phiếu cho bài bạn muốn nhảy" : "Hiện chưa có đợt vote mới"}
          </div>
        </div>

        {/* Metric 3: Upcoming Practices */}
        <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-5 hover:border-mdc-emerald/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Buổi Tập Sắp Tới</span>
            <CalendarCheck2 className="w-5 h-5 text-mdc-emerald" />
          </div>
          <div className="text-3xl font-extrabold text-white">{upcomingPractices.length}</div>
          <div className="text-xs text-slate-400 mt-1">
            {upcomingPractices[0]
              ? `Gần nhất: ${formatVNDateTime(upcomingPractices[0].start_at)}`
              : "Chưa có lịch tập mới"}
          </div>
        </div>

        {/* Metric 4: Tasks / Overdue */}
        <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-5 hover:border-mdc-cyan/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Việc Cần Xử Lý</span>
            <KanbanSquare className="w-5 h-5 text-mdc-cyan" />
          </div>
          <div className="text-3xl font-extrabold text-white">{myTasks.length}</div>
          <div className="text-xs text-slate-400 mt-1">
            {overdueTasks.length > 0 ? (
              <span className="text-red-400 font-semibold">{overdueTasks.length} nhiệm vụ quá hạn toàn ban</span>
            ) : (
              "Không có việc quá hạn"
            )}
          </div>
        </div>
      </section>

      {/* 3. Rehearsals & Tasks Dual Section (Desire / Action) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Upcoming Rehearsals */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarCheck2 className="w-5 h-5 text-mdc-red" />
              <span>Lịch Tập Rehearsal Sắp Tới</span>
            </h2>
            <Link href="/practice" className="text-xs text-mdc-red font-semibold hover:underline flex items-center gap-1">
              <span>Xem lịch tuần</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingPractices.length === 0 ? (
              <div className="p-8 text-center bg-mdc-surface border border-mdc-border rounded-2xl text-slate-400 text-sm">
                Hiện chưa có buổi tập nào được xếp lịch. Leader có thể vào trang Lịch tập để tạo buổi mới.
              </div>
            ) : (
              upcomingPractices.slice(0, 3).map((practice) => {
                const dance = data.dances.find((d) => d.id === practice.dance_id);
                const rsvps = data.practiceRsvps.filter((r) => r.session_id === practice.id);
                const myRsvp = rsvps.find((r) => r.user_id === session?.user.id);
                const attendingCount = rsvps.filter((r) => r.response === "ATTENDING").length;

                return (
                  <div
                    key={practice.id}
                    className="p-5 bg-mdc-surface border border-mdc-border rounded-2xl hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-mdc-red/20 text-mdc-red font-bold">
                          {dance?.song_title || "Routine"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatVNDateTime(practice.start_at)} - {formatVNTime(practice.end_at)}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{practice.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-mdc-red" />
                        <span>{practice.location}</span>
                        <span>&bull;</span>
                        <span className="text-mdc-emerald font-semibold">{attendingCount} người xác nhận đi</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href="/practice"
                        className="px-4 py-2 rounded-xl bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border text-xs font-semibold text-white transition-all"
                      >
                        {myRsvp?.response === "ATTENDING" ? (
                          <span className="text-mdc-emerald flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã RSVP
                          </span>
                        ) : (
                          "Xác Nhận Tham Gia"
                        )}
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Active Dances Spotlight */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-mdc-red" />
                <span>Tiết Mục Tiêu Điểm Đang Hoạt Động</span>
              </h2>
              <Link href="/dances" className="text-xs text-mdc-red font-semibold hover:underline flex items-center gap-1">
                <span>Xem tất cả ({data.dances.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeDances.slice(0, 2).map((dance) => {
                const leader = data.profiles.find((p) => p.id === dance.leader_id);
                const regCount = data.registrations.filter((r) => r.dance_id === dance.id).length;

                return (
                  <div
                    key={dance.id}
                    className="group bg-mdc-surface border border-mdc-border rounded-2xl overflow-hidden hover:border-mdc-red/50 transition-all flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-slate-300">
                          {dance.visibility === "ALL_CLUB" ? "Toàn CLB" : "Ban Chuyên Môn"}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-mdc-red/20 text-mdc-red">
                          {dance.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-white group-hover:text-mdc-red transition-colors text-base line-clamp-1">
                        {dance.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {dance.description}
                      </p>
                    </div>

                    <div className="px-5 py-3 bg-mdc-card/50 border-t border-mdc-border flex items-center justify-between text-xs text-slate-400">
                      <div>
                        Leader: <strong className="text-slate-200">{leader?.full_name || "Chưa gán"}</strong>
                      </div>
                      <div className="font-mono text-slate-300">
                        {regCount}/{dance.capacity} người
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Media Tasks & Announcements */}
        <div className="space-y-6">
          {/* My Media Tasks */}
          <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KanbanSquare className="w-4 h-4 text-mdc-cyan" />
                <span>Nhiệm Vụ Của Tôi ({myTasks.length})</span>
              </h2>
              <Link href="/media/tasks" className="text-xs text-mdc-cyan hover:underline font-semibold">
                Xem bảng
              </Link>
            </div>

            {myTasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-mdc-card rounded-xl border border-mdc-border">
                Tuyệt vời! Bạn không còn nhiệm vụ nào đang chờ xử lý.
              </div>
            ) : (
              <div className="space-y-2.5">
                {myTasks.slice(0, 3).map((task) => (
                  <Link
                    key={task.id}
                    href={`/media/tasks/${task.id}`}
                    className="block p-3 rounded-xl bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-mdc-cyan/20 text-mdc-cyan font-semibold">
                        {task.task_type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Hạn: {formatVNDateTime(task.due_at)}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white line-clamp-1">{task.title}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Tiến độ: {task.progress_percent}%</span>
                      <span className="text-mdc-red font-semibold hover:underline">Nộp link &rarr;</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Official Announcements */}
          <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-mdc-amber" />
                <span>Thông Báo Ban Chủ Nhiệm</span>
              </h2>
            </div>

            <div className="space-y-3">
              {data.announcements.slice(0, 2).map((anc) => (
                <div key={anc.id} className="p-3.5 rounded-xl bg-mdc-card border border-mdc-border space-y-1.5">
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-mdc-amber/20 text-mdc-amber font-bold">
                    {anc.audience === "ALL_CLUB" ? "Toàn CLB" : anc.audience}
                  </span>
                  <h3 className="text-xs font-bold text-white leading-snug">{anc.title}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">{anc.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
