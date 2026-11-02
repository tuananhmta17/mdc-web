"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/state-context";
import { formatVNDateTime } from "@/lib/utils";
import {
  Users,
  UserPlus,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Shield,
  Search,
  AlertCircle,
} from "lucide-react";

export default function MembersPage() {
  const { data, refresh } = useAppState();
  const session = data.session;

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteClass, setInviteClass] = useState("");
  const [inviteDept, setInviteDept] = useState("DANCE");
  const [inviteRole, setInviteRole] = useState("DANCE_MEMBER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteName,
          phone: invitePhone,
          cohort_class: inviteClass,
          department_code: inviteDept,
          role: inviteRole,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Không thể thêm thành viên");
      }

      setShowInviteModal(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePhone("");
      setInviteClass("");
      await refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!confirm(`Bạn có chắc muốn chuyển trạng thái thành viên sang ${newStatus}?`)) return;
    await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await refresh();
  };

  const filteredMembers = data.profiles.filter((p) => {
    const mem = data.departmentMemberships.find((m) => m.user_id === p.id && m.is_primary);
    const dept = data.departments.find((d) => d.id === mem?.department_id);

    if (filterDept !== "ALL" && dept?.code !== filterDept) return false;
    if (filterStatus !== "ALL" && p.status !== filterStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.cohort_class && p.cohort_class.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-mdc-red" />
            <span>Quản Lý Danh Sách CLB & Phân Ban</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Theo dõi nhân sự 3 ban: Ban Chủ nhiệm, Ban Chuyên môn, Ban Truyền thông và xét duyệt thành viên mới.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/export?type=members"
            download
            className="px-4 py-2 rounded-xl bg-mdc-card hover:bg-mdc-cardHover border border-mdc-border text-xs font-semibold text-slate-200 transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-mdc-red" />
            <span>Xuất CSV (Excel)</span>
          </a>

          {session?.isBoardAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-xs font-semibold text-white transition-all flex items-center gap-2 shadow-glowRed active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm / Mời Thành Viên</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-mdc-surface border border-mdc-border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, khóa lớp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-mdc-card border border-mdc-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-mdc-red"
          >
            <option value="ALL">Tất cả ban</option>
            <option value="BOARD">Ban Chủ nhiệm</option>
            <option value="DANCE">Ban Chuyên môn</option>
            <option value="MEDIA">Ban Truyền thông</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-mdc-red"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">ACTIVE (Đang hoạt động)</option>
            <option value="PENDING">PENDING (Chờ duyệt)</option>
            <option value="INACTIVE">INACTIVE (Đã rời/Khóa)</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-mdc-surface border border-mdc-border rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-mdc-card/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-mdc-border">
              <tr>
                <th className="py-3 px-4">Thành Viên</th>
                <th className="py-3 px-4">Khóa / Lớp</th>
                <th className="py-3 px-4">Ban Chính</th>
                <th className="py-3 px-4">Vai Trò</th>
                <th className="py-3 px-4">Trạng Thái</th>
                {session?.isBoardAdmin && <th className="py-3 px-4 text-right">Thao Tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-mdc-border">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Không tìm thấy thành viên nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const mem = data.departmentMemberships.find((m) => m.user_id === member.id && m.is_primary);
                  const dept = data.departments.find((d) => d.id === mem?.department_id);
                  const roles = data.roleAssignments.filter((r) => r.user_id === member.id).map((r) => r.role);

                  return (
                    <tr key={member.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mdc-crimson to-mdc-red text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
                            {member.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{member.full_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {member.cohort_class || "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          dept?.code === "BOARD"
                            ? "bg-mdc-amber/20 text-mdc-amber"
                            : dept?.code === "DANCE"
                            ? "bg-mdc-red/20 text-mdc-red"
                            : "bg-mdc-cyan/20 text-mdc-cyan"
                        }`}>
                          {dept?.name || "Chưa phân"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {roles.map((r) => (
                            <span key={r} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded ${
                          member.status === "ACTIVE"
                            ? "bg-mdc-emerald/20 text-mdc-emerald"
                            : member.status === "PENDING"
                            ? "bg-mdc-amber/20 text-mdc-amber"
                            : "bg-slate-700/50 text-slate-400"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            member.status === "ACTIVE"
                              ? "bg-mdc-emerald"
                              : member.status === "PENDING"
                              ? "bg-mdc-amber"
                              : "bg-slate-400"
                          }`} />
                          {member.status === "ACTIVE" ? "Hoạt động" : member.status === "PENDING" ? "Chờ duyệt" : "Tạm khóa"}
                        </span>
                      </td>

                      {session?.isBoardAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {member.status === "PENDING" && (
                              <button
                                onClick={() => handleUpdateStatus(member.id, "ACTIVE")}
                                title="Phê duyệt vào CLB"
                                className="px-2.5 py-1 rounded-lg bg-mdc-emerald/20 text-mdc-emerald hover:bg-mdc-emerald/30 font-semibold text-[11px] transition-all flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Duyệt</span>
                              </button>
                            )}
                            {member.status === "ACTIVE" && (
                              <button
                                onClick={() => handleUpdateStatus(member.id, "INACTIVE")}
                                title="Khóa / Chuyển trạng thái rời CLB"
                                className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 font-semibold text-[11px] transition-all"
                              >
                                Khóa
                              </button>
                            )}
                            {member.status === "INACTIVE" && (
                              <button
                                onClick={() => handleUpdateStatus(member.id, "ACTIVE")}
                                title="Kích hoạt lại tài khoản"
                                className="px-2.5 py-1 rounded-lg bg-mdc-red/20 text-mdc-red hover:bg-mdc-red/30 font-semibold text-[11px] transition-all"
                              >
                                Kích hoạt
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-mdc-surface border border-mdc-border rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mdc-border">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-mdc-red" />
                <span>Thêm Thành Viên Mới Vào CLB</span>
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Họ và Tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Tuấn Kiệt"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="kiet.ht@mtadancecrew.vn"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Khóa / Lớp</label>
                  <input
                    type="text"
                    placeholder="K59 - CNTT"
                    value={inviteClass}
                    onChange={(e) => setInviteClass(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Số Điện Thoại</label>
                  <input
                    type="text"
                    placeholder="0912..."
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ban Chính</label>
                  <select
                    value={inviteDept}
                    onChange={(e) => {
                      setInviteDept(e.target.value);
                      if (e.target.value === "MEDIA") setInviteRole("MEDIA_MEMBER");
                      else if (e.target.value === "BOARD") setInviteRole("BOARD_ADMIN");
                      else setInviteRole("DANCE_MEMBER");
                    }}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  >
                    <option value="DANCE">Ban Chuyên môn</option>
                    <option value="MEDIA">Ban Truyền thông</option>
                    <option value="BOARD">Ban Chủ nhiệm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Vai Trò</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  >
                    {inviteDept === "DANCE" && (
                      <>
                        <option value="DANCE_MEMBER">Vũ công Chuyên môn</option>
                        <option value="DANCE_LEADER">Leader bài nhảy</option>
                        <option value="DANCE_HEAD">Trưởng Ban Chuyên môn</option>
                      </>
                    )}
                    {inviteDept === "MEDIA" && (
                      <>
                        <option value="MEDIA_MEMBER">Thành viên Truyền thông</option>
                        <option value="MEDIA_HEAD">Trưởng Ban Truyền thông</option>
                      </>
                    )}
                    {inviteDept === "BOARD" && (
                      <option value="BOARD_ADMIN">Chủ nhiệm / Phó chủ nhiệm</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-mdc-border">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl bg-mdc-card text-slate-400 hover:text-white font-semibold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-white font-semibold shadow-glowRed transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? "Đang thêm..." : "Tạo Thành Viên"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
