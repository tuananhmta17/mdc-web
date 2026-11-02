"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAppState } from "@/lib/state-context";
import { formatVNDateTime } from "@/lib/utils";
import {
  Bell,
  Mail,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ExternalLink,
  Shield,
} from "lucide-react";

export default function NotificationsPage() {
  const { data, markNotificationRead, runEmailWorker } = useAppState();
  const session = data.session;

  const [activeTab, setActiveTab] = useState<"inbox" | "outbox">("inbox");
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const unreadCount = data.notifications.filter((n) => !n.read_at).length;

  const handleRunWorker = async () => {
    setIsProcessing(true);
    setStatusMsg("");
    try {
      await runEmailWorker();
      setStatusMsg("Đã xử lý hàng đợi Email Outbox và quét nhắc việc sắp đến hạn thành công!");
    } catch (err: any) {
      setStatusMsg("Lỗi khi xử lý hàng đợi: " + err.message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMsg(""), 5000);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-mdc-red" />
            <span>Trung Tâm Thông Báo & Hàng Đợi Email (Outbox)</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Hệ thống thông báo nội bộ và quản lý hàng đợi gửi email tự động (Resend / Gmail API) theo giờ Việt Nam.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunWorker}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-xs font-bold text-white transition-all shadow-glowRed active:scale-[0.98] flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`} />
            <span>Chạy Worker Quét Nhắc Hạn (Cron)</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-mdc-border pb-2">
        <button
          onClick={() => setActiveTab("inbox")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "inbox"
              ? "bg-mdc-surface border border-mdc-red text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Bell className="w-4 h-4 text-mdc-red" />
          <span>Hộp Thư Thông Báo Của Tôi ({data.notifications.length})</span>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-mdc-red text-[10px] text-white flex items-center justify-center font-mono">
              {unreadCount}
            </span>
          )}
        </button>

        {session?.isBoardAdmin && (
          <button
            onClick={() => setActiveTab("outbox")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "outbox"
                ? "bg-mdc-surface border border-mdc-red text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4 text-mdc-cyan" />
            <span>Giám Sát Email Outbox CLB ({data.outbox.length})</span>
          </button>
        )}
      </div>

      {/* Tab 1: In-App Notifications Inbox */}
      {activeTab === "inbox" && (
        <div className="bg-mdc-surface border border-mdc-border rounded-2xl overflow-hidden shadow-card">
          <div className="p-4 bg-mdc-card border-b border-mdc-border flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Danh sách thông báo
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => markNotificationRead(undefined, true)}
                className="text-xs text-mdc-red hover:underline font-semibold"
              >
                Đánh dấu tất cả là đã đọc
              </button>
            )}
          </div>

          <div className="divide-y divide-mdc-border">
            {data.notifications.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Hộp thư thông báo của bạn đang trống.
              </div>
            ) : (
              data.notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-5 transition-colors flex items-start justify-between gap-4 ${
                    !n.read_at ? "bg-mdc-red/5" : "hover:bg-white/5"
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                        {n.type}
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {formatVNDateTime(n.created_at)}
                      </span>
                      {!n.read_at && (
                        <span className="w-2 h-2 rounded-full bg-mdc-red" />
                      )}
                    </div>

                    <h3 className="font-bold text-white text-sm">{n.subject}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{n.body}</p>

                    {n.link_url && (
                      <Link
                        href={n.link_url}
                        onClick={() => markNotificationRead(n.id)}
                        className="inline-flex items-center gap-1 text-mdc-red font-semibold text-xs mt-2 hover:underline"
                      >
                        <span>Truy cập trang liên quan</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>

                  {!n.read_at && (
                    <button
                      onClick={() => markNotificationRead(n.id)}
                      className="px-3 py-1 rounded-lg bg-white/5 text-slate-400 hover:text-white text-[11px] shrink-0"
                    >
                      Đã đọc
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Email Outbox Queue Simulator (Board Admin) */}
      {activeTab === "outbox" && session?.isBoardAdmin && (
        <div className="space-y-4">
          <div className="p-4 bg-mdc-surface border border-mdc-border rounded-2xl text-xs text-slate-300 flex items-center justify-between">
            <div>
              <strong>Nguyên tắc gửi email tự động (Mục 3.6 &amp; 8):</strong> Mọi email đều được lưu vào <code>email_outbox</code> với <code>idempotency_key</code> chống gửi trùng khi quét cron nhắc deadline 48h/24h.
            </div>
            <span className="text-mdc-emerald font-bold font-mono">Resend / Gmail Ready</span>
          </div>

          <div className="bg-mdc-surface border border-mdc-border rounded-2xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-mdc-card text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-mdc-border">
                  <tr>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">Người Nhận</th>
                    <th className="py-3 px-4">Tiêu Đề Email</th>
                    <th className="py-3 px-4">Khóa Chống Trùng (Idempotency)</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Xem Bản Thư</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mdc-border">
                  {data.outbox.map((mail) => (
                    <tr key={mail.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {formatVNDateTime(mail.created_at)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">{mail.recipient_name}</div>
                        <div className="font-mono text-[11px] text-slate-400">{mail.recipient_email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-200 max-w-xs truncate">{mail.subject}</td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400 max-w-xs truncate">
                        {mail.idempotency_key}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          mail.status === "SENT"
                            ? "bg-mdc-emerald/20 text-mdc-emerald"
                            : mail.status === "FAILED"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-mdc-amber/20 text-mdc-amber"
                        }`}>
                          {mail.status} ({mail.attempts} lần)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedEmail(mail)}
                          className="px-2.5 py-1 rounded-lg bg-mdc-card hover:bg-white/10 text-slate-300 hover:text-white font-semibold text-[11px] flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-mdc-cyan" />
                          <span>Xem HTML</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Email HTML Preview Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-mdc-border shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-mdc-red" />
                <span>Xem Trước Email HTML Nhận Diện MTA Dance Crew</span>
              </h3>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-1 shrink-0">
              <div><strong>Người nhận:</strong> {selectedEmail.recipient_name} &lt;{selectedEmail.recipient_email}&gt;</div>
              <div><strong>Tiêu đề:</strong> {selectedEmail.subject}</div>
            </div>

            <div className="flex-1 overflow-y-auto border border-mdc-border rounded-xl bg-white p-2">
              <iframe
                title="Email Preview"
                srcDoc={selectedEmail.body_html}
                className="w-full h-96 border-0"
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-mdc-border shrink-0">
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-5 py-2 rounded-xl bg-mdc-card text-white text-xs font-semibold hover:bg-white/10"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
