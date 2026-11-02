"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAppState } from "@/lib/state-context";
import { formatVNDateTime } from "@/lib/utils";
import {
  KanbanSquare,
  List,
  Plus,
  AlertTriangle,
  Clock,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  Link2,
  Users,
} from "lucide-react";
import { TaskPriority, TaskStatus, TaskType } from "@/lib/types";

export default function MediaTasksPage() {
  const { data, refresh } = useAppState();
  const session = data.session;

  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filterOnlyMine, setFilterOnlyMine] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New task form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("DESIGN");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState(data.profiles.find((p) => p.email.includes("thang"))?.id || "");
  const [danceId, setDanceId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [referenceLinks, setReferenceLinks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const canAssign = session?.isBoardAdmin || session?.isMediaHead;
  const now = new Date();

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError("");

    try {
      const res = await fetch("/api/media/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          task_type: taskType,
          priority,
          assignee_id: assigneeId,
          dance_id: danceId || undefined,
          due_at: new Date(dueAt).toISOString(),
          reference_links: referenceLinks,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Lỗi giao nhiệm vụ");
      }

      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      setReferenceLinks("");
      await refresh();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = data.mediaTasks.filter((t) => {
    if (filterOnlyMine && t.assignee_id !== session?.user.id) return false;
    if (filterType !== "ALL" && t.task_type !== filterType) return false;
    if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
    return true;
  });

  const kanbanColumns: { status: TaskStatus; label: string; color: string }[] = [
    { status: "TODO", label: "Cần Làm (TODO)", color: "text-slate-400 border-slate-700" },
    { status: "IN_PROGRESS", label: "Đang Thực Hiện (IN PROGRESS)", color: "text-mdc-cyan border-mdc-cyan/40" },
    { status: "SUBMITTED", label: "Chờ Duyệt (SUBMITTED)", color: "text-mdc-amber border-mdc-amber/40" },
    { status: "APPROVED", label: "Đã Duyệt (APPROVED)", color: "text-mdc-emerald border-mdc-emerald/40" },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <KanbanSquare className="w-7 h-7 text-mdc-cyan" />
            <span>Quản Lý Công Việc Ban Truyền Thông</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Giao nhiệm vụ, đặt deadline, nộp link sản phẩm (Google Drive/Canva) và duyệt ấn phẩm sự kiện.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/export?type=tasks"
            download
            className="px-4 py-2 rounded-xl bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border text-xs font-semibold text-slate-200 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-mdc-cyan" />
            <span>Xuất CSV</span>
          </a>

          {canAssign && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-xs font-semibold text-white transition-all flex items-center gap-2 shadow-glowRed active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Giao Nhiệm Vụ Mới</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* View & Filter Toolbar */}
      <div className="p-4 bg-mdc-surface border border-mdc-border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-mdc-card p-1 rounded-xl border border-mdc-border">
          <button
            onClick={() => setViewMode("kanban")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "kanban" ? "bg-mdc-red text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <KanbanSquare className="w-3.5 h-3.5" />
            <span>Bảng Kanban</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "list" ? "bg-mdc-red text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Danh Sách</span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilterOnlyMine(!filterOnlyMine)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              filterOnlyMine
                ? "bg-mdc-cyan/20 border-mdc-cyan text-mdc-cyan"
                : "bg-mdc-card border-mdc-border text-slate-400 hover:text-white"
            }`}
          >
            Việc của tôi ({data.mediaTasks.filter((t) => t.assignee_id === session?.user.id).length})
          </button>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-mdc-card border border-mdc-border rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-mdc-red"
          >
            <option value="ALL">Tất cả loại việc</option>
            <option value="DESIGN">DESIGN (Thiết kế)</option>
            <option value="VIDEO">VIDEO (Dựng clip)</option>
            <option value="POST">POST (Bài viết fanpage)</option>
            <option value="PHOTO">PHOTO (Chụp ảnh)</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-mdc-card border border-mdc-border rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-mdc-red"
          >
            <option value="ALL">Tất cả mức ưu tiên</option>
            <option value="URGENT">Khẩn cấp (URGENT)</option>
            <option value="HIGH">Cao (HIGH)</option>
            <option value="MEDIUM">Trung bình (MEDIUM)</option>
            <option value="LOW">Thấp (LOW)</option>
          </select>
        </div>
      </div>

      {/* View Mode 1: Kanban Board */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const columnTasks = filteredTasks.filter((t) => {
              if (col.status === "SUBMITTED") {
                return t.status === "SUBMITTED" || t.status === "REVISION_REQUESTED";
              }
              return t.status === col.status;
            });

            return (
              <div
                key={col.status}
                className="bg-mdc-surface border border-mdc-border rounded-2xl p-4 shadow-card flex flex-col min-h-[450px]"
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between pb-3 mb-3 border-b border-mdc-border ${col.color}`}>
                  <span className="font-extrabold text-xs tracking-wider uppercase">{col.label}</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1">
                  {columnTasks.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                      Trống
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const assignee = data.profiles.find((p) => p.id === task.assignee_id);
                      const submissions = data.mediaSubmissions.filter((s) => s.task_id === task.id);
                      const isOverdue = new Date(task.due_at) < now && task.status !== "APPROVED";

                      return (
                        <Link
                          key={task.id}
                          href={`/media/tasks/${task.id}`}
                          className="block p-4 rounded-xl bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border hover:border-white/20 transition-all space-y-2.5 shadow-sm group"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 font-semibold">
                              {task.task_type}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              task.priority === "URGENT"
                                ? "bg-red-500/20 text-red-400"
                                : task.priority === "HIGH"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-white/10 text-slate-400"
                            }`}>
                              {task.priority}
                            </span>
                          </div>

                          <h3 className="font-bold text-white text-xs group-hover:text-mdc-cyan transition-colors line-clamp-2">
                            {task.title}
                          </h3>

                          {task.status === "REVISION_REQUESTED" && (
                            <div className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Cần chỉnh sửa
                            </div>
                          )}

                          {/* Progress & Due date */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Tiến độ:</span>
                              <span className="text-white font-mono font-bold">{task.progress_percent}%</span>
                            </div>
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-mdc-cyan to-mdc-red"
                                style={{ width: `${task.progress_percent}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-mdc-border text-slate-400">
                            <div className="flex items-center gap-1.5 truncate">
                              <div className="w-4 h-4 rounded-full bg-mdc-cyan/30 text-mdc-cyan text-[9px] flex items-center justify-center font-bold">
                                {assignee?.full_name.charAt(0)}
                              </div>
                              <span className="truncate">{assignee?.full_name}</span>
                            </div>

                            <span className={`font-mono text-[10px] ${isOverdue ? "text-red-400 font-bold" : "text-slate-400"}`}>
                              {isOverdue ? "QUÁ HẠN" : formatVNDateTime(task.due_at).slice(0, 5)}
                            </span>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Mode 2: List View */}
      {viewMode === "list" && (
        <div className="bg-mdc-surface border border-mdc-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-mdc-card text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-mdc-border">
                <tr>
                  <th className="py-3 px-4">Nhiệm Vụ</th>
                  <th className="py-3 px-4">Loại Việc</th>
                  <th className="py-3 px-4">Người Nhận</th>
                  <th className="py-3 px-4">Hạn Chót (VN)</th>
                  <th className="py-3 px-4">Tiến Độ</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mdc-border">
                {filteredTasks.map((task) => {
                  const assignee = data.profiles.find((p) => p.id === task.assignee_id);
                  const isOverdue = new Date(task.due_at) < now && task.status !== "APPROVED";

                  return (
                    <tr key={task.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link href={`/media/tasks/${task.id}`} className="font-bold text-white hover:text-mdc-cyan text-xs">
                          {task.title}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">{task.task_type}</td>
                      <td className="py-3.5 px-4 text-slate-300">{assignee?.full_name}</td>
                      <td className={`py-3.5 px-4 font-mono text-[11px] ${isOverdue ? "text-red-400 font-bold" : "text-slate-400"}`}>
                        {formatVNDateTime(task.due_at)} {isOverdue && "(QUÁ HẠN)"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-white font-semibold">{task.progress_percent}%</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          task.status === "APPROVED"
                            ? "bg-mdc-emerald/20 text-mdc-emerald"
                            : task.status === "SUBMITTED"
                            ? "bg-mdc-amber/20 text-mdc-amber"
                            : task.status === "REVISION_REQUESTED"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-white/10 text-slate-300"
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/media/tasks/${task.id}`}
                          className="text-xs text-mdc-cyan hover:underline font-semibold"
                        >
                          Xem link &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mdc-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KanbanSquare className="w-5 h-5 text-mdc-cyan" />
                <span>Giao Nhiệm Vụ Ban Truyền Thông</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tiêu Đề Nhiệm Vụ *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thiết kế ấn phẩm Cover Fanpage"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-cyan"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mô Tả Yêu Cầu Kỹ Thuật</label>
                <textarea
                  rows={2}
                  placeholder="Kích thước, định dạng file, nội dung cần truyền tải..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Loại Công Việc</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-cyan"
                  >
                    <option value="DESIGN">DESIGN (Thiết kế đồ họa)</option>
                    <option value="VIDEO">VIDEO (Quay dựng clip)</option>
                    <option value="POST">POST (Bài viết content)</option>
                    <option value="PHOTO">PHOTO (Chụp ảnh)</option>
                    <option value="LOGISTICS">LOGISTICS (Hậu cần)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mức Ưu Tiên</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-cyan"
                  >
                    <option value="LOW">Thấp (LOW)</option>
                    <option value="MEDIUM">Trung bình (MEDIUM)</option>
                    <option value="HIGH">Cao (HIGH)</option>
                    <option value="URGENT">Khẩn cấp (URGENT)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Người Phụ Trách (Assignee) *</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    required
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-cyan"
                  >
                    <option value="">-- Chọn thành viên --</option>
                    {data.profiles
                      .filter((p) => p.status === "ACTIVE")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({p.cohort_class || p.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Hạn Chót (Deadline VN) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tài Liệu Tham Khảo / Drive Asset</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={referenceLinks}
                  onChange={(e) => setReferenceLinks(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-cyan"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-mdc-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-mdc-card text-slate-400 hover:text-white font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-mdc-cyan hover:bg-sky-500 text-white font-bold transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? "Đang giao việc..." : "Giao Nhiệm Vụ & Bắn Mail"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
