"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/state-context";
import {
  Settings,
  User,
  BellRing,
  Mail,
  Server,
  RefreshCcw,
  CheckCircle2,
  Clock,
  Shield,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const { data, refresh, resetToSampleData } = useAppState();
  const session = data.session;

  const [fullName, setFullName] = useState(session?.user.full_name || "");
  const [phone, setPhone] = useState(session?.user.phone || "");
  const [cohortClass, setCohortClass] = useState(session?.user.cohort_class || "");

  const [emailProvider, setEmailProvider] = useState("local");
  const [notifyPractice, setNotifyPractice] = useState(true);
  const [notifyTasks, setNotifyTasks] = useState(true);
  const [notifyPolls, setNotifyPolls] = useState(true);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user.id) return;

    await fetch(`/api/members/${session.user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        phone,
        cohort_class: cohortClass,
      }),
    });

    setSaveSuccess(true);
    await refresh();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetData = async () => {
    if (!confirm("Thao tác này sẽ đặt lại toàn bộ cơ sở dữ liệu về 12 thành viên mẫu, bài nhảy, lịch tập và task ban đầu. Tiếp tục?")) {
      return;
    }
    setIsResetting(true);
    await resetToSampleData();
    setIsResetting(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-mdc-red" />
          <span>Cài Đặt Hệ Thống & Hồ Sơ Cá Nhân</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Quản lý thông tin tài khoản, tùy chọn nhận thông báo và cấu hình nhà cung cấp email CLB.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Cập nhật thông tin thành công!</span>
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-mdc-border pb-3">
          <User className="w-5 h-5 text-mdc-red" />
          <span>Hồ Sơ Thành Viên CLB</span>
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Họ và Tên</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-mdc-red"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Email</label>
              <input
                type="text"
                disabled
                value={session?.user.email}
                className="w-full bg-mdc-card/50 border border-mdc-border rounded-xl px-3.5 py-2.5 text-slate-500 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Khóa / Lớp Tại MTA</label>
              <input
                type="text"
                value={cohortClass}
                onChange={(e) => setCohortClass(e.target.value)}
                placeholder="Ví dụ: K57 - An Toàn Thông Tin"
                className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-mdc-red"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Số Điện Thoại</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912..."
                className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-mdc-red"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-white font-bold transition-all shadow-glowRed active:scale-[0.98] flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Thông Tin</span>
            </button>
          </div>
        </form>
      </div>

      {/* System Configurations (Board Admin) */}
      {session?.isBoardAdmin && (
        <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-mdc-border pb-3">
            <Server className="w-5 h-5 text-mdc-amber" />
            <span>Cấu Hình Hạ Tầng Email &amp; Đồng Bộ (Board Admin)</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chế Độ Gửi Email</label>
                <select
                  value={emailProvider}
                  onChange={(e) => setEmailProvider(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-mdc-amber"
                >
                  <option value="local">Hàng đợi Local Outbox (Mặc định kiểm thử)</option>
                  <option value="resend">Resend API (Tên miền @mtadancecrew.vn)</option>
                  <option value="gmail">Gmail API OAuth 2.0 (Hộp thư CLB)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Múi Giờ Hệ Thống</label>
                <input
                  type="text"
                  disabled
                  value="Asia/Ho_Chi_Minh (UTC+7)"
                  className="w-full bg-mdc-card/50 border border-mdc-border rounded-xl px-3.5 py-2.5 text-slate-400 font-mono"
                />
              </div>
            </div>

            <div className="p-4 bg-mdc-card rounded-xl border border-mdc-border space-y-2">
              <span className="font-bold text-slate-200">Chính sách nhắc hạn tự động (Cron):</span>
              <ul className="text-slate-400 text-[11px] list-disc list-inside space-y-1">
                <li>Nhắc buổi tập: <strong>24 giờ trước giờ bắt đầu</strong> qua email và thông báo nội bộ.</li>
                <li>Nhắc nhiệm vụ truyền thông: <strong>48 giờ và 24 giờ trước deadline</strong>.</li>
                <li>Cảnh báo quá hạn: Phát thông báo hàng ngày nếu trạng thái chưa <strong>APPROVED</strong>.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone: Reset Database */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 shadow-card space-y-3">
        <h2 className="text-base font-bold text-red-400 flex items-center gap-2">
          <RefreshCcw className="w-5 h-5 text-red-400" />
          <span>Đặt Lại Dữ Liệu Mẫu (Reset Demo Data)</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Khôi phục toàn bộ danh sách 12 thành viên, các bài nhảy, lịch rảnh, đợt vote và bảng nhiệm vụ về trạng thái mặc định như tài liệu kế hoạch.
        </p>

        <button
          onClick={handleResetData}
          disabled={isResetting}
          className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs transition-all flex items-center gap-2"
        >
          <RefreshCcw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
          <span>{isResetting ? "Đang đặt lại..." : "Khôi Phục Toàn Bộ Dữ Liệu Mẫu"}</span>
        </button>
      </div>
    </div>
  );
}
