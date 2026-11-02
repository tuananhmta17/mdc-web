"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/state-context";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  Flame,
  ArrowRight,
  LogIn,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginQuick, simulateExternalLogin } = useAppState();

  const [activeTab, setActiveTab] = useState<"form" | "quick" | "google">("form");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Google Simulation State
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const res = await login(email, password);
    if (res.success) {
      setSuccessMsg("Đăng nhập thành công! Đang chuyển hướng...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } else {
      setErrorMsg(res.error || "Email hoặc mật khẩu không chính xác.");
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (userId: string, roleName: string) => {
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg(`Đang đăng nhập với vai trò ${roleName}...`);

    const res = await loginQuick(userId);
    if (res.success) {
      setTimeout(() => {
        router.push("/dashboard");
      }, 400);
    } else {
      setErrorMsg(res.error || "Không thể đăng nhập.");
      setIsLoading(false);
    }
  };

  const handleGoogleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestEmail || !guestName) {
      setErrorMsg("Vui lòng điền đầy đủ Email và Họ tên.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    await simulateExternalLogin(guestEmail, guestName);
    router.push("/dashboard");
  };

  const demoAccounts = [
    {
      id: "u-board-1",
      name: "Nguyễn Quang Huy",
      email: "huy.nq@mtadancecrew.vn",
      role: "BOARD_ADMIN",
      title: "Chủ nhiệm CLB (Toàn quyền CRUD tài khoản & BCN)",
      badgeColor: "bg-mdc-amber/20 text-mdc-amber border-mdc-amber/30",
    },
    {
      id: "u-dance-head",
      name: "Lê Hoàng Long",
      email: "long.lh@mtadancecrew.vn",
      role: "DANCE_HEAD",
      title: "Trưởng Ban Chuyên Môn (Quản lý bài nhảy & Vote)",
      badgeColor: "bg-mdc-red/20 text-mdc-red border-mdc-red/30",
    },
    {
      id: "u-dance-leader-2",
      name: "Vũ Tiến Đạt",
      email: "dat.vt@mtadancecrew.vn",
      role: "DANCE_LEADER",
      title: "Leader Choreo 60 Năm (Xếp lịch tập & Điểm danh)",
      badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    },
    {
      id: "u-dance-mem-1",
      name: "Phạm Bảo Ngọc",
      email: "ngoc.pb@mtadancecrew.vn",
      role: "DANCE_MEMBER",
      title: "Vũ công Chuyên môn (Đăng ký bài & Báo lịch rảnh)",
      badgeColor: "bg-mdc-emerald/20 text-mdc-emerald border-mdc-emerald/30",
    },
    {
      id: "u-media-head",
      name: "Bùi Minh Trang",
      email: "trang.bm@mtadancecrew.vn",
      role: "MEDIA_HEAD",
      title: "Trưởng Ban Truyền Thông (Giao task & Duyệt video/ảnh)",
      badgeColor: "bg-mdc-cyan/20 text-mdc-cyan border-mdc-cyan/30",
    },
    {
      id: "u-media-mem-1",
      name: "Trịnh Đức Thắng",
      email: "thang.td@mtadancecrew.vn",
      role: "MEDIA_MEMBER",
      title: "Thành viên Truyền Thông (Nhận việc & Nộp sản phẩm)",
      badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    },
    {
      id: "u-pending-guest",
      name: "Trần Tuấn Kiệt",
      email: "kiet.tt.newbie@gmail.com",
      role: "PENDING",
      title: "Khách Google Mới (Bị Gatekeeper chặn chờ duyệt)",
      badgeColor: "bg-slate-700/50 text-slate-400 border-slate-600/50",
    },
  ];

  return (
    <div className="min-h-screen bg-mdc-bg text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background Atmospheric Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-mdc-red/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-mdc-crimson/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-xl w-full bg-mdc-surface/90 backdrop-blur-xl border border-mdc-border rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Header with MDC Logo */}
        <div className="text-center mb-6">
          <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-mdc-red/50 shadow-glowRed mb-3">
            <Image
              src="/logo-mdc.jpg"
              alt="MTA Dance Crew"
              fill
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wider flex items-center justify-center gap-2">
            MTA DANCE CREW
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-mdc-red/20 text-mdc-red font-semibold border border-mdc-red/30">
              MDC
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Hệ thống Quản lý Hoạt động & Phân quyền CLB — Học viện Kỹ thuật Quân sự
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-mdc-card rounded-xl border border-mdc-border mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "form"
                ? "bg-mdc-red text-white shadow-glowRed"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="truncate">Đăng Nhập</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("quick")}
            className={`py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "quick"
                ? "bg-mdc-red text-white shadow-glowRed"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate">1-Click Test</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("google")}
            className={`py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "google"
                ? "bg-mdc-red text-white shadow-glowRed"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="truncate">Khách Mới</span>
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-mdc-emerald/15 border border-mdc-emerald/30 rounded-xl text-xs text-mdc-emerald flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-mdc-emerald shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: Standard Email & Password Form */}
        {activeTab === "form" && (
          <form onSubmit={handleFormLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="ví dụ: huy.nq@mtadancecrew.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red focus:ring-1 focus:ring-mdc-red transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Mật khẩu</label>
                <span className="text-[11px] text-slate-400">
                  Mật khẩu mặc định: <code className="text-mdc-red font-bold">123456</code>
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Nhập mật khẩu của bạn..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red focus:ring-1 focus:ring-mdc-red transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-mdc-card/60 rounded-xl border border-mdc-border text-[11px] text-slate-400 flex items-center justify-between">
              <span>Đăng nhập thử tài khoản Admin:</span>
              <button
                type="button"
                onClick={() => {
                  setEmail("huy.nq@mtadancecrew.vn");
                  setPassword("123456");
                }}
                className="text-mdc-red font-bold hover:underline"
              >
                Điền nhanh Admin &rarr;
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-white text-xs font-bold transition-all shadow-glowRed active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Đăng Nhập Vào Hệ Thống</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: 1-Click Fast Login Grid */}
        {activeTab === "quick" && (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-400 mb-3">
              Chọn ngay một tài khoản đại diện dưới đây để trải nghiệm cơ chế phân quyền (RBAC) tương ứng:
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 divide-y divide-mdc-border/40">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin(acc.id, acc.name)}
                  className="w-full p-3 rounded-xl bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border text-left transition-all flex items-center justify-between group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mdc-crimson to-mdc-red text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
                      {acc.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-mdc-red transition-colors flex items-center gap-1.5">
                        {acc.name}
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${acc.badgeColor}`}>
                          {acc.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{acc.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{acc.email}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-mdc-red group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Simulate Google External Student */}
        {activeTab === "google" && (
          <form onSubmit={handleGoogleSimulate} className="space-y-4">
            <p className="text-xs text-slate-400">
              Giả lập luồng sinh viên MTA đăng nhập bằng Google lần đầu (tài khoản trạng thái <strong>PENDING</strong>, kích hoạt màn hình Gatekeeper cho đến khi được Admin duyệt):
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Họ và Tên Sinh Viên
              </label>
              <input
                type="text"
                required
                placeholder="ví dụ: Trần Tuấn Kiệt"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Google / MTA
              </label>
              <input
                type="email"
                required
                placeholder="ví dụ: kiet.tt.k60@gmail.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-mdc-card hover:bg-mdc-cardHover border border-mdc-red/40 hover:border-mdc-red text-white text-xs font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-mdc-red" />
              <span>Đăng Nhập Khách Mới (Kiểm thử Tiêu chí #1)</span>
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-mdc-border text-center text-[11px] text-slate-500">
          <span>CLB Vũ Đạo MTA &bull; Học viện Kỹ thuật Quân sự</span>
        </div>
      </div>
    </div>
  );
}
