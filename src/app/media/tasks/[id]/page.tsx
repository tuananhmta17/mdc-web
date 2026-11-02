"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { apiRequest, useAppState } from "@/lib/state-context";
import { formatVNDateTime, isValidHttpUrl } from "@/lib/utils";
import {
  ArrowLeft,
  KanbanSquare,
  Link2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  ExternalLink,
  Shield,
  FileCheck,
  AlertCircle,
} from "lucide-react";

export default function MediaTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, refresh } = useAppState();
  const session = data.session;

  const [taskDetail, setTaskDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Submit link form
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitNote, setSubmitNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  // Review form
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Progress update
  const [progressVal, setProgressVal] = useState<number>(0);

  const loadTask = () => {
    fetch(`/api/media/tasks/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) {
          setTaskDetail(json);
          setProgressVal(json.progress_percent || 0);
        }
      })
      .catch(() => setTaskDetail(null)).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTask();
  }, [id, data.mediaTasks, data.mediaSubmissions]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-sm">
        Đang tải thông tin nhiệm vụ...
      </div>
    );
  }

  if (!taskDetail) return <div className="panel text-center text-slate-400">Không tìm thấy nhiệm vụ hoặc bạn không có quyền truy cập. <Link href="/media/tasks" className="text-mdc-red">Về bảng công việc</Link></div>;

  const isAssignee = taskDetail.assignee_id === session?.user.id;
  const isManager = session?.isBoardAdmin || session?.isMediaHead;
  const submissions = taskDetail.submissions || [];
  const latestSub = submissions[0];

  const handleSubmitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (!isValidHttpUrl(submitUrl)) {
      setSubmitError("Đường dẫn sản phẩm nộp bắt buộc phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest(`/api/media/tasks/${id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: submitUrl, note: submitNote }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Lỗi khi nộp link");
      }

      setSubmitSuccess("Đã nộp link sản phẩm thành công! Trạng thái nhiệm vụ chuyển sang SUBMITTED.");
      setSubmitUrl("");
      setSubmitNote("");
      loadTask();
      await refresh();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (submissionId: string, status: "APPROVED" | "REVISION_REQUESTED") => {
    setIsReviewing(true);
    try {
      const res = await apiRequest(`/api/media/submissions/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status: status, feedback: reviewFeedback }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Lỗi khi duyệt sản phẩm");
      }

      setReviewFeedback("");
      loadTask();
      await refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleUpdateProgress = async (newProgress: number) => {
    setProgressVal(newProgress);
    try { await apiRequest(`/api/media/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress_percent: newProgress }),
    });
    await refresh(); } catch { setProgressVal(taskDetail.progress_percent); }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back button */}
      <div>
        <Link
          href="/media/tasks"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại bảng nhiệm vụ Ban Truyền thông</span>
        </Link>
      </div>

      {/* Main Task Card */}
      <div className="bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-mdc-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-mdc-cyan/20 text-mdc-cyan font-bold">
                {taskDetail.task_type}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                taskDetail.priority === "URGENT"
                  ? "bg-red-500/20 text-red-400"
                  : taskDetail.priority === "HIGH"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-white/10 text-slate-400"
              }`}>
                Ưu tiên: {taskDetail.priority}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                taskDetail.status === "APPROVED"
                  ? "bg-mdc-emerald/20 text-mdc-emerald"
                  : taskDetail.status === "SUBMITTED"
                  ? "bg-mdc-amber/20 text-mdc-amber"
                  : taskDetail.status === "REVISION_REQUESTED"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-white/10 text-slate-300"
              }`}>
                {taskDetail.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{taskDetail.title}</h1>
          </div>

          <div className="text-left sm:text-right shrink-0 text-xs text-slate-400 space-y-0.5">
            <div>Người giao: <strong className="text-slate-200">{taskDetail.assigner?.full_name}</strong></div>
            <div>Người nhận: <strong className="text-white font-semibold">{taskDetail.assignee?.full_name}</strong></div>
            <div className="text-red-400 font-mono">Hạn chót: {formatVNDateTime(taskDetail.due_at)}</div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2 text-xs sm:text-sm">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">Yêu Cầu Chi Tiết</h3>
          <p className="text-slate-300 leading-relaxed bg-mdc-card p-4 rounded-xl border border-mdc-border">
            {taskDetail.description || "Không có mô tả chi tiết."}
          </p>
        </div>

        {taskDetail.reference_links && (
          <div className="text-xs space-y-1">
            <span className="text-slate-400 font-semibold">Tài liệu tham khảo:</span>
            <a
              href={taskDetail.reference_links}
              target="_blank"
              rel="noreferrer"
              className="block text-mdc-cyan hover:underline truncate bg-mdc-card p-2.5 rounded-xl border border-mdc-border"
            >
              {taskDetail.reference_links}
            </a>
          </div>
        )}

        {/* Progress updater slider */}
        {(isAssignee || isManager) && (
          <div className="p-4 bg-mdc-card rounded-xl border border-mdc-border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300">Cập nhật tiến độ hoàn thành (%):</span>
              <span className="font-mono text-white font-extrabold text-sm">{progressVal}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progressVal}
              onChange={(e) => handleUpdateProgress(Number(e.target.value))}
              className="w-full accent-mdc-red cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Submission & Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Submit New Version */}
        <div className="p-6 bg-mdc-surface border border-mdc-border rounded-2xl shadow-card space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-mdc-cyan" />
            <span>Nộp Link Sản Phẩm (Drive / Canva / Video)</span>
          </h2>

          <p className="text-xs text-slate-400 leading-relaxed">
            Mỗi lần nộp sẽ tạo một phiên bản mới (<code>v1, v2...</code>) và chuyển trạng thái nhiệm vụ sang <strong>SUBMITTED</strong> để Trưởng ban duyệt. Toàn bộ lịch sử link cũ được bảo toàn.
          </p>

          {submitError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmitLink} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Đường Dẫn URL Sản Phẩm (Bắt đầu bằng http:// hoặc https://) *
              </label>
              <input
                type="text"
                required
                placeholder="https://drive.google.com/..."
                value={submitUrl}
                onChange={(e) => setSubmitUrl(e.target.value)}
                className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-cyan"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Ghi Chú Phiên Bản</label>
              <textarea
                rows={2}
                placeholder="Ví dụ: Đã chỉnh font và xuất định dạng 1080p theo góp ý..."
                value={submitNote}
                onChange={(e) => setSubmitNote(e.target.value)}
                className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-cyan"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (!isAssignee && !isManager)}
              className="w-full py-2.5 rounded-xl bg-mdc-cyan hover:bg-sky-500 text-white font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? "Đang gửi link..." : "Nộp Sản Phẩm Mới (Tự Tăng Version)"}
            </button>
          </form>
        </div>

        {/* Right: Submission History & Review Panel */}
        <div className="p-6 bg-mdc-surface border border-mdc-border rounded-2xl shadow-card space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-mdc-emerald" />
            <span>Lịch Sử Các Phiên Bản Nộp ({submissions.length})</span>
          </h2>

          <div className="space-y-3 max-h-[420px] overflow-y-auto">
            {submissions.length === 0 ? (
              <div className="p-8 text-center bg-mdc-card rounded-xl border border-mdc-border text-slate-400 text-xs">
                Chưa có phiên bản nào được nộp.
              </div>
            ) : (
              submissions.map((sub: any) => {
                const submitter = data.profiles.find((p) => p.id === sub.submitter_id);
                const isPendingReview = sub.review_status === "PENDING";

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-xl bg-mdc-card border border-mdc-border space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-white/10">
                        Phiên bản v{sub.version}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        sub.review_status === "APPROVED"
                          ? "bg-mdc-emerald/20 text-mdc-emerald"
                          : sub.review_status === "REVISION_REQUESTED"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-mdc-amber/20 text-mdc-amber"
                      }`}>
                        {sub.review_status}
                      </span>
                    </div>

                    <a
                      href={sub.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-mdc-cyan hover:underline flex items-center gap-1 font-semibold truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{sub.url}</span>
                    </a>

                    {sub.note && (
                      <div className="text-slate-400 text-[11px]">
                        <strong>Ghi chú:</strong> {sub.note}
                      </div>
                    )}

                    {sub.feedback && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                        <strong>Nhận xét:</strong> {sub.feedback}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 pt-1">
                      Nộp lúc: {formatVNDateTime(sub.submitted_at)} bởi {submitter?.full_name}
                    </div>

                    {/* Review Controls for Media Head / Board Admin */}
                    {isManager && isPendingReview && (
                      <div className="pt-2 border-t border-mdc-border space-y-2">
                        <textarea
                          rows={2}
                          placeholder="Góp ý hoặc nhận xét duyệt..."
                          value={reviewFeedback}
                          onChange={(e) => setReviewFeedback(e.target.value)}
                          className="w-full bg-mdc-surface border border-mdc-border rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-mdc-cyan"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleReview(sub.id, "REVISION_REQUESTED")}
                            disabled={isReviewing}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-semibold text-xs"
                          >
                            Yêu Cầu Sửa Lại
                          </button>
                          <button
                            onClick={() => handleReview(sub.id, "APPROVED")}
                            disabled={isReviewing}
                            className="px-3.5 py-1.5 rounded-lg bg-mdc-emerald text-white font-bold text-xs hover:bg-emerald-600 shadow-sm"
                          >
                            &check; Duyệt Sản Phẩm (Approved)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
