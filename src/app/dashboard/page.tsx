"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Clock3, Flame, KanbanSquare, MapPin, Music2, Vote, Plus, Users } from "lucide-react";
import { useAppState } from "@/lib/state-context";
import { formatVNDate, formatVNTime } from "@/lib/utils";

export default function DashboardPage() {
  const { data } = useAppState();
  const session = data.session;
  const now = Date.now();
  const practices = data.practiceSessions.filter(p => ["SCHEDULED", "RESCHEDULED"].includes(p.status) && Date.parse(p.end_at) > now).sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at));
  const polls = data.pollRounds.filter(p => p.status === "OPEN" && Date.parse(p.end_at) > now && Date.parse(p.start_at) <= now);
  const tasks = data.mediaTasks.filter(t => t.status !== "APPROVED");
  const myTasks = tasks.filter(t => t.assignee_id === session?.user.id).sort((a, b) => Date.parse(a.due_at) - Date.parse(b.due_at));
  const next = practices[0];
  const activeDances = data.dances.filter(d => ["PRACTICING", "RECRUITING", "SELECTED"].includes(d.status));
  const name = session?.user.full_name.split(" ").slice(-1)[0];
  const metrics = [
    { label: "Bài nhảy đang hoạt động", value: activeDances.length, caption: "Tập luyện & tuyển đội hình", icon: Flame, href: "/dances", color: "#f36c5c" },
    { label: "Buổi tập sắp tới", value: practices.length, caption: "Sẵn sàng cho buổi tập tiếp theo", icon: CalendarDays, href: "/practice", color: "#70c5a4" },
    { label: "Bình chọn đang mở", value: polls.length, caption: "Đóng góp lựa chọn của bạn", icon: Vote, href: "/polls", color: "#d6b771" },
    { label: "Nhiệm vụ của bạn", value: myTasks.length, caption: `${myTasks.filter(t => Date.parse(t.due_at) < now).length} nhiệm vụ quá hạn`, icon: KanbanSquare, href: "/media/tasks", color: "#82a9e0" },
  ];
  return <div className="space-y-7">
    <div className="flex flex-wrap justify-between items-end gap-4"><div><p className="eyebrow text-slate-500 mb-2">NHỊP ĐẬP CỦA ĐỘI</p><h1 className="text-3xl font-bold tracking-tight text-white">Một ngày mới, một nhịp mới.</h1><p className="mt-2 text-sm text-slate-400">Chào {name}, đây là những hoạt động bạn cần theo dõi hôm nay.</p></div><Link href="/availability" className="secondary-button"><Plus size={16} />Cập nhật lịch rảnh</Link></div>
    <section className="dashboard-hero">
      <div className="relative z-10 max-w-xl"><span className="eyebrow text-white/55 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-red-300" />MTA DANCE CREW / WORKSPACE</span><h2 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08]">Từng bước nhỏ.<br />Một sân khấu lớn.</h2><p className="mt-5 text-sm text-white/65 max-w-sm leading-relaxed">Luyện tập cùng nhau, sáng tạo cùng nhau.<br />Mọi hoạt động của đội, trong một không gian.</p><Link href="/dances" className="mt-7 inline-flex items-center gap-8 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#8d302a] hover:bg-red-50">Khám phá bài nhảy <ArrowRight size={17} /></Link></div>
      <div className="hero-wordmark" aria-hidden="true">MOVE<br /><span>AS ONE.</span></div>
      <div className="absolute right-6 bottom-5 text-[10px] tracking-[.2em] text-white/35 hidden sm:block">PASSION · PRACTICE · PERFORMANCE</div>
    </section>
    <section aria-label="Tổng hợp hoạt động" className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-4 gap-4">{metrics.map(m => <Link key={m.href} href={m.href} className="metric-card group"><div className="flex items-center justify-between"><span className="text-xs text-slate-400">{m.label}</span><m.icon size={18} style={{ color: m.color }} /></div><div className="mt-5 flex items-end justify-between"><strong className="text-4xl font-semibold text-white tracking-tight">{String(m.value).padStart(2, "0")}</strong><ArrowUpRight size={18} className="text-slate-600 group-hover:text-white transition-colors" /></div><p className="text-[11px] text-slate-500 mt-3">{m.caption}</p></Link>)}</section>
    <div className="grid xl:grid-cols-[1.55fr_1fr] gap-6">
      <section className="panel !p-0 overflow-hidden"><div className="section-heading"><div><span className="eyebrow text-slate-500">GIỮ NHỊP LUYỆN TẬP</span><h2 className="mt-1.5 text-lg font-semibold">Lịch tập sắp tới</h2></div><Link href="/practice" className="text-xs text-slate-400 hover:text-white flex items-center gap-2">Xem tất cả <ArrowUpRight size={15} /></Link></div>
        {practices.length ? <div className="divide-y divide-mdc-border">{practices.slice(0, 3).map((p, i) => { const d = data.dances.find(d => d.id === p.dance_id); const date = formatVNDate(p.start_at).split("/"); return <Link href="/practice" key={p.id} className="flex items-center gap-4 p-5 sm:p-6 hover:bg-white/[.02]"><div className={`calendar-tile ${i === 0 ? "featured" : ""}`}><span>{date[0]}</span><small>THÁNG {date[1]}</small></div><div className="flex-1 min-w-0"><p className="text-[10px] font-semibold tracking-wider text-mdc-red mb-1 truncate">{d?.title || "BUỔI TẬP CLB"}</p><h3 className="font-semibold text-sm truncate">{p.title}</h3><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1.5"><Clock3 size={12} />{formatVNTime(p.start_at)} – {formatVNTime(p.end_at)}</span><span className="flex items-center gap-1.5 truncate"><MapPin size={12} className="shrink-0" />{p.location}</span></div></div><ArrowUpRight size={16} className="text-slate-500 shrink-0" /></Link>; })}</div> : <Empty icon={CalendarDays} title="Sẵn sàng cho buổi tập tiếp theo" description="Lịch tập sẽ xuất hiện tại đây khi Leader chốt thời gian." href="/availability" action="Khai báo lịch rảnh" />}
      </section>
      <section className="panel !p-0 overflow-hidden"><div className="section-heading"><div><span className="eyebrow text-slate-500">TẬP TRUNG HÔM NAY</span><h2 className="mt-1.5 text-lg font-semibold">Việc cần làm</h2></div><span className="rounded-lg px-2.5 py-1 text-xs text-slate-400 bg-white/5">{myTasks.length}</span></div>
        {myTasks.length ? <div className="divide-y divide-mdc-border">{myTasks.slice(0, 4).map(t => <Link key={t.id} href={`/media/tasks/${t.id}`} className="block px-6 py-5 hover:bg-white/[.02]"><div className="flex items-start gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${Date.parse(t.due_at) < now ? "bg-mdc-red" : "bg-mdc-amber"}`} /><div className="min-w-0 flex-1"><h3 className="font-medium text-sm leading-relaxed">{t.title}</h3><div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>{Date.parse(t.due_at) < now ? "Quá hạn · " : "Hạn nộp · "}{formatVNDate(t.due_at)}</span><span>{t.progress_percent}%</span></div><div className="mt-3 h-1 rounded-full bg-white/5"><div className="h-full rounded-full bg-mdc-red/80" style={{ width: `${t.progress_percent}%` }} /></div></div></div></Link>)}</div> : <Empty icon={KanbanSquare} title="Bạn đã bắt kịp nhịp đội" description="Hiện không có nhiệm vụ cá nhân đang chờ xử lý." href="/media/tasks" action="Xem bảng công việc" />}
      </section>
    </div>
    <div className="grid xl:grid-cols-[1.55fr_1fr] gap-6">
      <section className="panel"><div className="flex justify-between items-center mb-6"><h2 className="text-lg font-semibold">Bản tin MDC</h2><span className="eyebrow text-slate-500">TỪ BAN CHỦ NHIỆM</span></div>{data.announcements.length ? data.announcements.slice(0, 2).map(a => <article key={a.id} className="border-t border-mdc-border py-5 last:pb-0"><p className="text-[11px] text-slate-500 mb-2">{formatVNDate(a.published_at)}</p><h3 className="text-sm font-semibold">{a.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-400 line-clamp-3">{a.body}</p></article>) : <p className="text-sm text-slate-500 py-5">Chưa có thông báo mới. Các cập nhật của CLB sẽ xuất hiện tại đây.</p>}</section>
      <section className="panel relative overflow-hidden"><Music2 size={80} className="absolute -right-3 -bottom-3 text-mdc-red/10 -rotate-12" /><span className="eyebrow text-mdc-red">MỖI LỰA CHỌN ĐỀU CÓ Ý NGHĨA</span><h2 className="mt-4 text-xl font-semibold">Bài tiếp theo,<br />cùng đội quyết định.</h2><p className="mt-3 text-sm text-slate-400 leading-relaxed">{polls.length ? `${polls.length} đợt bình chọn đang chờ bạn. Nghe thử và chọn bài bạn muốn cùng đội thể hiện.` : "Theo dõi các đợt bình chọn để đóng góp ý tưởng cho tiết mục tiếp theo của CLB."}</p><Link href="/polls" className="mt-6 inline-flex items-center gap-3 text-sm font-semibold text-mdc-red">Đến bình chọn <ArrowRight size={16} /></Link></section>
    </div>
  </div>;
}
function Empty({ icon: Icon, title, description, href, action }: { icon: typeof CalendarDays; title: string; description: string; href: string; action: string }) {
  return <div className="px-6 py-12 text-center"><Icon size={28} className="mx-auto text-slate-600 mb-4" /><p className="text-sm font-medium">{title}</p><p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">{description}</p><Link href={href} className="mt-5 text-xs text-mdc-red inline-flex gap-2 items-center">{action}<ArrowRight size={13} /></Link></div>;
}
