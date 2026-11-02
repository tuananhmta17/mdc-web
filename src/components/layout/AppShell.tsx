"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Flame, Vote, CalendarDays, CalendarCheck2, KanbanSquare, Users, ShieldCheck, Bell, Settings, LogOut, Menu, X, ArrowUpRight, ChevronRight, RefreshCw } from "lucide-react";
import { useAppState } from "@/lib/state-context";

const navigation = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/dances", label: "Bài nhảy", icon: Flame },
  { href: "/polls", label: "Bình chọn", icon: Vote },
  { href: "/availability", label: "Lịch rảnh", icon: CalendarDays },
  { href: "/practice", label: "Lịch tập", icon: CalendarCheck2 },
  { href: "/media/tasks", label: "Truyền thông", icon: KanbanSquare },
  { href: "/members", label: "Thành viên", icon: Users, admin: true },
  { href: "/board", label: "Điều hành CLB", icon: ShieldCheck, admin: true },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, loading, error, refresh, logout } = useAppState();
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState("");
  const session = data.session;
  const unread = data.notifications.filter(n => !n.read_at).length;
  useEffect(() => { if (!loading && !session && !error && pathname !== "/login") router.replace("/login"); }, [loading, session, error, pathname, router]);
  useEffect(() => { setMobile(false); }, [pathname]);
  useEffect(() => {
    const handler = (e: Event) => setToast((e as CustomEvent<string>).detail);
    window.addEventListener("mdc-error", handler); return () => window.removeEventListener("mdc-error", handler);
  }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 6000); return () => clearTimeout(timer); }, [toast]);
  if (pathname === "/login") return <>{children}</>;
  if (loading || (!session && !error)) return <div className="min-h-screen flex items-center justify-center gap-3 text-slate-400"><RefreshCw size={20} className="animate-spin text-mdc-red" />Đang tải không gian MDC…</div>;
  if (!session) return <div className="min-h-screen grid place-items-center p-6"><div className="panel max-w-lg text-center"><h1 className="text-xl font-bold mb-3">Chưa thể kết nối hệ thống</h1><p className="text-slate-400 mb-6">{error}</p><button onClick={() => void refresh()} className="primary-button">Thử lại</button><Link href="/login" className="block mt-4 text-sm text-slate-400">Về trang đăng nhập</Link></div></div>;
  const current = [...navigation, { href: "/notifications", label: "Thông báo" }, { href: "/settings", label: "Cài đặt" }].find(n => pathname.startsWith(n.href));
  const role = session.isBoardAdmin ? "Ban Chủ nhiệm" : session.isDanceHead ? "Trưởng ban Chuyên môn" : session.isMediaHead ? "Trưởng ban Truyền thông" : session.isDanceLeader ? "Leader bài nhảy" : "Thành viên";
  return <div className="app-layout">
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    {mobile && <button aria-label="Đóng menu" className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobile(false)} />}
    <aside className={`app-sidebar ${mobile ? "is-open" : ""}`}>
      <Link href="/dashboard" className="flex items-center gap-3 px-5 pt-8 pb-9"><Image src="/logo-mdc.jpg" alt="MDC" width={43} height={43} className="rounded-full border border-white/10" priority /><div><strong className="text-sm tracking-wider text-white">MTA DANCE CREW</strong><span className="block mt-1 text-[10px] tracking-[.18em] text-slate-500">MOVE AS ONE</span></div></Link>
      <p className="eyebrow px-6 mb-3 text-slate-500">KHÔNG GIAN CLB</p>
      <nav aria-label="Điều hướng chính" className="space-y-1 px-3">{navigation.filter(n => !n.admin || session.isBoardAdmin).map(n => <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? "page" : undefined} className={`nav-link ${pathname.startsWith(n.href) ? "active" : ""}`}><n.icon size={18} strokeWidth={1.7} /><span>{n.label}</span>{pathname.startsWith(n.href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-mdc-red" />}</Link>)}</nav>
      <div className="mt-auto pt-8 px-3"><div className="mx-2 mb-6 rounded-2xl border border-mdc-red/15 bg-mdc-red/5 p-4"><span className="text-xs font-bold text-mdc-red">CÙNG NHAU TIẾN BỘ.</span><p className="text-xs leading-relaxed mt-2 text-slate-400">Đừng quên cập nhật lịch rảnh để cả đội cùng lên nhịp.</p><Link href="/availability" className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-200">Cập nhật ngay <ArrowUpRight size={14} /></Link></div>
        <Link href="/settings" className={`nav-link ${pathname === "/settings" ? "active" : ""}`}><Settings size={18} />Cài đặt tài khoản</Link>
        <button className="nav-link w-full text-left mb-5" onClick={() => { void logout().then(() => router.replace("/login")).catch(err => setToast(err.message)); }}><LogOut size={18} />Đăng xuất</button>
      </div>
      <div className="border-t border-mdc-border px-5 py-5 flex items-center gap-3"><div className="avatar">{session.user.full_name.split(" ").slice(-2).map(n => n[0]).join("")}</div><div className="min-w-0"><p className="text-sm font-semibold text-white truncate">{session.user.full_name}</p><p className="text-[11px] text-slate-500 mt-0.5">{role}</p></div></div>
    </aside>
    <div className="app-workspace">
      <header className="app-topbar"><div className="flex items-center gap-3"><button onClick={() => setMobile(!mobile)} aria-label="Mở menu điều hướng" aria-expanded={mobile} className="icon-button lg:hidden"><Menu size={20} /></button><span className="text-slate-500 text-sm hidden sm:block">Không gian MDC</span><ChevronRight size={14} className="text-slate-600 hidden sm:block" /><span className="text-sm font-medium text-slate-200">{current?.label || "Chi tiết"}</span></div><div className="flex items-center gap-4"><span className="text-xs text-slate-500 hidden md:inline">{new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date())}</span><Link href="/notifications" aria-label={`Thông báo, ${unread} chưa đọc`} className="icon-button relative"><Bell size={19} />{unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-mdc-red" />}</Link><span className="hidden sm:block h-6 w-px bg-mdc-border" /><span className="text-xs font-semibold text-slate-400 hidden sm:block">MDC <span className="text-mdc-red">/</span> WORKSPACE</span></div></header>
      <main id="main-content" className="app-main">
        {(error || toast) && <div role="alert" className="mb-6 flex justify-between gap-3 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200"><span>{toast || error}</span><button aria-label="Đóng thông báo lỗi" onClick={() => { setToast(""); if (error) void refresh(); }}><X size={18} /></button></div>}
        {data.isPendingApproval ? <div className="panel max-w-xl mx-auto mt-16 text-center"><ShieldCheck className="text-mdc-red mx-auto mb-5" size={40} /><h1 className="text-2xl font-bold">Tài khoản đang chờ duyệt</h1><p className="mt-4 text-slate-400 leading-relaxed">Chào {session.user.full_name}, Ban Chủ nhiệm cần phê duyệt tài khoản trước khi bạn tham gia các hoạt động nội bộ.</p><button onClick={() => void refresh()} className="primary-button mt-6">Kiểm tra trạng thái</button></div> : children}
      </main><footer className="px-6 lg:px-10 pb-6 flex flex-wrap justify-between gap-2 text-[11px] text-slate-600"><span>© {new Date().getFullYear()} MTA Dance Crew</span><span>Học viện Kỹ thuật Quân sự · Giờ Việt Nam</span></footer>
    </div>
  </div>;
}
