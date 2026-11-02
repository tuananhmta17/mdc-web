"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAppState } from "@/lib/state-context";
import {
  LayoutDashboard,
  Users,
  Flame,
  Vote,
  CalendarDays,
  CalendarCheck2,
  KanbanSquare,
  ShieldCheck,
  Bell,
  Settings,
  RefreshCw,
  LogOut,
  ChevronDown,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, loading, switchUser, markNotificationRead, runEmailWorker } = useAppState();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const session = data.session;
  const isPending = data.isPendingApproval;
  const unreadCount = data.notifications.filter((n) => !n.read_at).length;

  const handleManualSync = async () => {
    setIsSyncing(true);
    await runEmailWorker();
    setTimeout(() => setIsSyncing(false), 500);
  };

  const navItems = [
    { label: "Tổng Quan", href: "/dashboard", icon: LayoutDashboard },
    { label: "Bài Nhảy", href: "/dances", icon: Flame },
    { label: "Bình Chọn", href: "/polls", icon: Vote },
    { label: "Lịch Rảnh", href: "/availability", icon: CalendarDays },
    { label: "Lịch Tập", href: "/practice", icon: CalendarCheck2 },
    { label: "Nhiệm Vụ Media", href: "/media/tasks", icon: KanbanSquare },
    { label: "Thành Viên", href: "/members", icon: Users, boardOnly: true },
    { label: "Điều Hành CLB", href: "/board", icon: ShieldCheck, boardOnly: true },
    { label: "Thông Báo", href: "/notifications", icon: Bell },
    { label: "Cài Đặt", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-mdc-bg text-slate-100 flex flex-col font-sans selection:bg-mdc-red selection:text-white">
      {/* 1. Header Bar (Single-line 64px) */}
      <header className="sticky top-0 z-50 h-16 bg-mdc-surface/90 backdrop-blur-md border-b border-mdc-border px-4 md:px-8 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-mdc-red/40 group-hover:border-mdc-red transition-all shadow-glowRed">
              <Image
                src="/logo-mdc.jpg"
                alt="MTA Dance Crew Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-wider text-base md:text-lg text-white group-hover:text-mdc-red transition-colors flex items-center gap-1.5">
                MTA DANCE CREW
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-mdc-red/20 text-mdc-red font-semibold border border-mdc-red/30">
                  MDC
                </span>
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Học viện Kỹ thuật Quân sự
              </span>
            </div>
          </Link>
        </div>

        {/* Action Controls & Role Switcher */}
        <div className="flex items-center gap-3">
          {/* Quick Outbox & Sync Button */}
          <button
            onClick={handleManualSync}
            title="Đồng bộ Email Outbox & Quét nhắc việc"
            className="hidden lg:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border text-slate-300 hover:text-white transition-all active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-mdc-red" : ""}`} />
            <span>Đồng bộ Mail</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 rounded-lg bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border text-slate-300 hover:text-white transition-all active:scale-[0.98]"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-mdc-red text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-mdc-surface border border-mdc-border rounded-xl shadow-card overflow-hidden z-50">
                <div className="p-3 bg-mdc-card border-b border-mdc-border flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Thông báo gần đây ({data.notifications.length})
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markNotificationRead(undefined, true)}
                      className="text-[11px] text-mdc-red hover:underline font-medium"
                    >
                      Đánh dấu tất cả đã đọc
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-mdc-border">
                  {data.notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Không có thông báo nào
                    </div>
                  ) : (
                    data.notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition-colors hover:bg-white/5 ${
                          !n.read_at ? "bg-mdc-red/5" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-200">{n.subject}</span>
                          {!n.read_at && (
                            <span className="w-2 h-2 rounded-full bg-mdc-red shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-slate-400 mt-1 text-[11px] line-clamp-2">{n.body}</p>
                        {n.link_url && (
                          <Link
                            href={n.link_url}
                            onClick={() => {
                              markNotificationRead(n.id);
                              setShowNotifMenu(false);
                            }}
                            className="inline-block mt-1.5 text-mdc-red font-semibold hover:underline text-[11px]"
                          >
                            Xem chi tiết &rarr;
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifMenu(false)}
                  className="block p-2.5 text-center text-xs font-semibold bg-mdc-card text-slate-300 hover:text-white border-t border-mdc-border"
                >
                  Xem tất cả thông báo & hàng đợi email &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Quick Role Switcher Pill (Interactive Simulator) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border text-left transition-all active:scale-[0.98]"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-mdc-crimson to-mdc-red text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                {session?.user.full_name?.charAt(0) || "U"}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
                  {session?.user.full_name}
                  {session?.isBoardAdmin && (
                    <span className="w-1.5 h-1.5 rounded-full bg-mdc-amber" />
                  )}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {session?.roles[0] || (isPending ? "CHỜ DUYỆT" : "THÀNH VIÊN")}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Role Switcher Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-mdc-surface border border-mdc-border rounded-xl shadow-card overflow-hidden z-50">
                <div className="p-3 bg-mdc-card border-b border-mdc-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Chuyển Đổi Nhanh 6 Vai Trò (Kiểm Thử)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Bấm để trải nghiệm phân quyền theo đúng tài liệu kế hoạch.
                  </span>
                </div>
                <div className="p-1 max-h-72 overflow-y-auto divide-y divide-mdc-border">
                  {[
                    { id: "u-board-1", role: "BOARD_ADMIN", name: "Nguyễn Quang Huy", desc: "Chủ nhiệm CLB (Toàn quyền)" },
                    { id: "u-dance-head", role: "DANCE_HEAD", name: "Lê Hoàng Long", desc: "Trưởng Ban Chuyên môn" },
                    { id: "u-dance-leader-2", role: "DANCE_LEADER", name: "Vũ Tiến Đạt", desc: "Leader Choreo 60 Năm" },
                    { id: "u-dance-leader-1", role: "DANCE_LEADER", name: "Đỗ Phương Anh", desc: "Leader K-Pop Showcase" },
                    { id: "u-dance-mem-1", role: "DANCE_MEMBER", name: "Phạm Bảo Ngọc", desc: "Vũ công Chuyên môn" },
                    { id: "u-media-head", role: "MEDIA_HEAD", name: "Bùi Minh Trang", desc: "Trưởng Ban Truyền thông" },
                    { id: "u-media-mem-1", role: "MEDIA_MEMBER", name: "Trịnh Đức Thắng", desc: "Thành viên Ban Truyền thông" },
                    { id: "u-pending-guest", role: "PENDING", name: "Trần Tuấn Kiệt", desc: "Khách Google chưa duyệt (TC #1)" },
                  ].map((account) => {
                    const isCurrent = session?.user.id === account.id;
                    return (
                      <button
                        key={account.id}
                        onClick={() => {
                          switchUser(account.id);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                          isCurrent ? "bg-mdc-red/15 text-white" : "hover:bg-white/5 text-slate-300"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            {account.name}
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-slate-300">
                              {account.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{account.desc}</div>
                        </div>
                        {isCurrent && <CheckCircle2 className="w-4 h-4 text-mdc-red shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Horizontal Navigation Tabs (Single line desktop, scrollable mobile) */}
      <nav className="bg-mdc-surface border-b border-mdc-border px-4 md:px-8 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-max py-2">
          {navItems.map((item) => {
            if (item.boardOnly && !session?.isBoardAdmin) return null;
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? "bg-mdc-red text-white shadow-glowRed"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 3. Main Content or Gatekeeper Screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isPending ? (
          /* Gatekeeper screen for unapproved accounts (Acceptance criterion 1) */
          <div className="max-w-2xl mx-auto my-12 bg-mdc-surface border border-mdc-border rounded-2xl p-8 text-center shadow-card">
            <div className="w-16 h-16 rounded-full bg-mdc-amber/15 border border-mdc-amber/30 text-mdc-amber flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">
              Tài Khoản Đang Chờ Phê Duyệt
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Xin chào <strong>{session?.user.full_name}</strong> ({session?.user.email}).<br />
              Theo tiêu chí bảo mật nội bộ của <strong>MTA Dance Crew</strong>, tài khoản đăng nhập bằng Google cần được <strong>Ban Chủ nhiệm</strong> phê duyệt trước khi có thể xem danh sách thành viên, bài nhảy, lịch tập và tài liệu nội bộ.
            </p>

            <div className="p-4 bg-mdc-card rounded-xl border border-mdc-border text-xs text-slate-400 text-left mb-6 space-y-1.5">
              <div><strong>Trạng thái:</strong> <span className="text-mdc-amber font-semibold">PENDING (Chờ duyệt)</span></div>
              <div><strong>Đơn vị:</strong> CLB Vũ Đạo MTA — Học viện Kỹ thuật Quân sự</div>
              <div><strong>Liên hệ phê duyệt:</strong> Ban Chủ nhiệm (Email: huy.nq@mtadancecrew.vn)</div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => switchUser("u-board-1")}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-mdc-red text-white font-semibold text-xs hover:bg-mdc-redDark transition-all active:scale-[0.98] shadow-glowRed"
              >
                Chuyển sang tài khoản Ban Chủ nhiệm để Duyệt
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {/* 4. Footer */}
      <footer className="border-t border-mdc-border bg-mdc-surface/50 py-6 px-4 md:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <span>MTA Dance Crew &copy; {new Date().getFullYear()}</span>
            <span>&bull;</span>
            <span className="font-mono text-[11px] text-mdc-red">Múi giờ Asia/Ho_Chi_Minh</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>Đã kích hoạt RBAC 6 Vai Trò</span>
            <span>&bull;</span>
            <button
              onClick={() => {
                if (confirm("Bạn có chắc chắn muốn đặt lại dữ liệu về trạng thái ban đầu?")) {
                  data.session && switchUser("u-board-1");
                  fetch("/api/system/reset", { method: "POST" }).then(() => window.location.reload());
                }
              }}
              className="text-slate-400 hover:text-mdc-red underline"
            >
              Đặt lại dữ liệu mẫu
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
