"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Eye, EyeOff, ArrowRight, LockKeyhole, AlertCircle, Music2 } from "lucide-react";
import { useAppState } from "@/lib/state-context";

export default function LoginPage() {
  const { login } = useAppState();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const result = await login(email, password);
    if (result.success) router.replace("/dashboard");
    else { setError(result.error || "Đăng nhập thất bại."); setBusy(false); }
  }
  return <div className="login-layout">
    <section className="login-story" aria-label="MTA Dance Crew">
      <div className="flex items-center gap-3"><Image src="/logo-mdc.jpg" width={52} height={52} alt="Logo MDC" className="rounded-full" priority /><div><strong className="tracking-widest">MTA DANCE CREW</strong><p className="text-sm text-white/60">Học viện Kỹ thuật Quân sự</p></div></div>
      <div className="relative z-10 my-auto py-16"><span className="eyebrow text-white/60">ONE CREW. ONE RHYTHM.</span><h1 className="mt-5 text-6xl xl:text-8xl font-black tracking-tighter leading-[0.98]">Cùng nhịp.<br />Cùng bước.<br /><span className="text-white/45">Cùng tỏa sáng.</span></h1><p className="mt-8 max-w-md text-white/75 leading-relaxed">Một không gian chung cho những buổi tập, ý tưởng mới và mọi khoảnh khắc của MDC.</p></div>
      <div className="flex items-center justify-between border-t border-white/20 pt-6 text-xs text-white/65"><span>CLB VŨ ĐẠO MTA</span><Music2 size={20} /><span>MOVE AS ONE <ArrowUpRight size={14} className="inline" /></span></div>
      <span className="login-watermark" aria-hidden="true">MDC</span>
    </section>
    <section className="flex items-center justify-center px-6 py-12 sm:px-12">
      <div className="w-full max-w-[390px]">
        <div className="mb-10 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-mdc-red/10 text-mdc-red"><LockKeyhole size={23} /></div>
        <span className="eyebrow text-mdc-red block mb-3">THÀNH VIÊN MDC</span><h2 className="text-3xl font-bold tracking-tight text-white">Chào mừng trở lại.</h2><p className="mt-3 text-sm text-slate-400 leading-relaxed">Đăng nhập để theo dõi hoạt động và kết nối cùng đội của bạn.</p>
        <form onSubmit={submit} className="mt-9 space-y-5">
          <div><label htmlFor="email" className="field-label">Email</label><input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email tài khoản của bạn" className="field-input" /></div>
          <div><label htmlFor="password" className="field-label">Mật khẩu</label><div className="relative"><input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu" className="field-input pr-12" /><button type="button" aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setVisible(!visible)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300"><AlertCircle size={17} className="shrink-0 mt-0.5" />{error}</p>}
          <button type="submit" disabled={busy} className="primary-button w-full justify-between !py-3.5"><span>{busy ? "Đang xác thực…" : "Đăng nhập"}</span><ArrowRight size={18} /></button>
        </form>
        <p className="mt-7 text-sm text-slate-400 leading-relaxed">Chưa có tài khoản hoặc quên mật khẩu? Liên hệ Ban Chủ nhiệm để được hỗ trợ.</p>
        <p className="mt-12 border-t border-mdc-border pt-6 text-xs text-slate-500">MTA Dance Crew · Không gian dành cho thành viên CLB</p>
      </div>
    </section>
  </div>;
}
