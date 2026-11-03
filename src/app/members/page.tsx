"use client";

import React, { useState } from "react";
import { apiRequest, useAppState } from "@/lib/state-context";
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
  Edit2,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  UserCheck,
  Check,
  X,
} from "lucide-react";
import { DepartmentCode, RoleCode, UserStatus } from "@/lib/types";

export default function MembersPage() {
  const { data, refresh, createMember, updateMember, deleteMember } = useAppState();
  const session = data.session;
  const isBoardAdmin = session?.isBoardAdmin;

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Create Member Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createClass, setCreateClass] = useState("");
  const [createDept, setCreateDept] = useState<DepartmentCode>("DANCE");
  const [createRole, setCreateRole] = useState<RoleCode>("DANCE_MEMBER");
  const [createStatus, setCreateStatus] = useState<UserStatus>("ACTIVE");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit Member Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editDept, setEditDept] = useState<DepartmentCode>("DANCE");
  const [editRole, setEditRole] = useState<RoleCode>("DANCE_MEMBER");
  const [editStatus, setEditStatus] = useState<UserStatus>("ACTIVE");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Open Edit Modal
  const openEditModal = (memberId: string) => {
    const member = data.profiles.find((p) => p.id === memberId);
    if (!member) return;

    const mem = data.departmentMemberships.find((m) => m.user_id === memberId && m.is_primary);
    const dept = data.departments.find((d) => d.id === mem?.department_id);
    const roleAssignment = data.roleAssignments.find((r) => r.user_id === memberId);

    setEditingUserId(memberId);
    setEditEmail(member.email);
    setEditName(member.full_name);
    setEditPassword(""); // Blank means do not change password
    setEditPhone(member.phone || "");
    setEditClass(member.cohort_class || "");
    setEditDept((dept?.code as DepartmentCode) || "DANCE");
    setEditRole(roleAssignment?.role || "DANCE_MEMBER");
    setEditStatus(member.status);
    setEditError("");
    setShowEditModal(true);
  };

  // Open Delete Modal
  const openDeleteModal = (memberId: string, name: string, email: string) => {
    if (memberId === session?.user.id) {
      alert("Bạn không thể tự xóa tài khoản của chính mình!");
      return;
    }
    setDeletingUser({ id: memberId, name, email });
    setDeleteError("");
    setShowDeleteModal(true);
  };

  // Submit Create Member
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError("");

    const res = await createMember({
      email: createEmail,
      full_name: createName,
      password: createPassword,
      phone: createPhone,
      cohort_class: createClass,
      department_code: createDept,
      role: createRole,
      status: createStatus,
    });

    if (res.success) {
      setShowCreateModal(false);
      setCreateEmail("");
      setCreateName("");
      setCreatePassword("");
      setCreatePhone("");
      setCreateClass("");
    } else {
      setCreateError(res.error || "Không thể tạo tài khoản");
    }
    setIsCreating(false);
  };

  // Submit Edit Member
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    setIsEditing(true);
    setEditError("");

    const updates: any = {
      email: editEmail,
      full_name: editName,
      phone: editPhone,
      cohort_class: editClass,
      department_code: editDept,
      role: editRole,
      status: editStatus,
    };
    if (editPassword && editPassword.trim()) {
      updates.password = editPassword;
    }

    const res = await updateMember(editingUserId, updates);

    if (res.success) {
      setShowEditModal(false);
      setEditingUserId(null);
    } else {
      setEditError(res.error || "Không thể cập nhật tài khoản");
    }
    setIsEditing(false);
  };

  // Submit Delete Member
  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    setDeleteError("");

    const res = await deleteMember(deletingUser.id);
    if (res.success) {
      setShowDeleteModal(false);
      setDeletingUser(null);
    } else {
      setDeleteError(res.error || "Không thể xóa tài khoản");
    }
    setIsDeleting(false);
  };

  // Quick Status Toggle (Approve or Toggle Lock)
  const handleQuickStatus = async (id: string, newStatus: UserStatus) => {
    if (id === session?.user.id && newStatus === "INACTIVE") {
      alert("Bạn không thể tự khóa tài khoản Admin của mình!");
      return;
    }
    await updateMember(id, { status: newStatus });
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
            <span>Quản Lý Thành Viên & Tài Khoản CLB</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            {isBoardAdmin
              ? "Toàn quyền quản trị nhân sự 3 ban: Thêm, chỉnh sửa, phân vai trò, đặt lại mật khẩu và xóa tài khoản."
              : "Danh bạ thành viên CLB Vũ Đạo MTA — Học viện Kỹ thuật Quân sự."}
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

          {isBoardAdmin && (
            <button
              onClick={() => {
                setCreateError("");
                setShowCreateModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-xs font-semibold text-white transition-all flex items-center gap-2 shadow-glowRed active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Tài Khoản Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Non-Admin Notice */}
      {!isBoardAdmin && (
        <div className="p-3.5 bg-mdc-surface border border-mdc-border rounded-xl text-xs text-slate-400 flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-mdc-amber shrink-0" />
          <span>
            Bạn đang xem danh sách với quyền thành viên. Chức năng Thêm, Sửa, Xóa và Đặt lại mật khẩu tài khoản được bảo mật dành riêng cho <strong>Ban Chủ nhiệm (Admin)</strong>.
          </span>
        </div>
      )}

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
            <option value="ACTIVE">ACTIVE (Hoạt động)</option>
            <option value="PENDING">PENDING (Chờ duyệt)</option>
            <option value="INACTIVE">INACTIVE (Đã khóa)</option>
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
                <th className="py-3 px-4">Vai Trò (Role)</th>
                <th className="py-3 px-4">Trạng Thái</th>
                {isBoardAdmin && <th className="py-3 px-4 text-right">Quản Trị Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-mdc-border">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Không tìm thấy thành viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const mem = data.departmentMemberships.find((m) => m.user_id === member.id && m.is_primary);
                  const dept = data.departments.find((d) => d.id === mem?.department_id);
                  const roles = data.roleAssignments.filter((r) => r.user_id === member.id).map((r) => r.role);
                  const isCurrentLoggedUser = member.id === session?.user.id;

                  return (
                    <tr key={member.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mdc-crimson to-mdc-red text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
                            {member.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs flex items-center gap-1.5">
                              {member.full_name}
                              {isCurrentLoggedUser && (
                                <span className="text-[10px] bg-mdc-red/20 text-mdc-red px-1.5 py-0.2 rounded font-semibold border border-mdc-red/30">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{member.email}</div>
                            {member.phone && (
                              <div className="text-[10px] text-slate-500 font-mono">{member.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {member.cohort_class || "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          dept?.code === "BOARD"
                            ? "bg-mdc-amber/20 text-mdc-amber border border-mdc-amber/30"
                            : dept?.code === "DANCE"
                            ? "bg-mdc-red/20 text-mdc-red border border-mdc-red/30"
                            : "bg-mdc-cyan/20 text-mdc-cyan border border-mdc-cyan/30"
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
                          {member.status === "ACTIVE" ? "Hoạt động" : member.status === "PENDING" ? "Chờ duyệt" : "Đã khóa"}
                        </span>
                      </td>

                      {isBoardAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Approve if PENDING */}
                            {member.status === "PENDING" && (
                              <button
                                onClick={() => handleQuickStatus(member.id, "ACTIVE")}
                                title="Phê duyệt vào CLB"
                                className="px-2.5 py-1 rounded-lg bg-mdc-emerald/20 text-mdc-emerald hover:bg-mdc-emerald/30 font-semibold text-[11px] transition-all flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Duyệt</span>
                              </button>
                            )}

                            {/* Quick Lock / Unlock */}
                            {member.status === "ACTIVE" && !isCurrentLoggedUser && (
                              <button
                                onClick={() => handleQuickStatus(member.id, "INACTIVE")}
                                title="Khóa tài khoản"
                                className="p-1.5 rounded-lg bg-mdc-card hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-all"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {member.status === "INACTIVE" && (
                              <button
                                onClick={() => handleQuickStatus(member.id, "ACTIVE")}
                                title="Mở khóa tài khoản"
                                className="p-1.5 rounded-lg bg-mdc-card hover:bg-white/10 text-slate-400 hover:text-mdc-emerald transition-all"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(member.id)}
                              title="Chỉnh sửa tài khoản & phân quyền"
                              className="p-1.5 rounded-lg bg-mdc-card hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[11px]"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-mdc-cyan" />
                              <span className="hidden lg:inline">Sửa</span>
                            </button>

                            {/* Delete Button (disabled for self) */}
                            {!isCurrentLoggedUser && (
                              <button
                                onClick={() => openDeleteModal(member.id, member.full_name, member.email)}
                                title="Xóa tài khoản vĩnh viễn"
                                className="p-1.5 rounded-lg bg-mdc-card hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all flex items-center gap-1 text-[11px]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Xóa</span>
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

      {/* MODAL 1: THÊM TÀI KHOẢN MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-mdc-surface border border-mdc-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-mdc-border mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-mdc-red" />
                <span>Thêm Tài Khoản Thành Viên Mới</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Họ và Tên *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: Nguyễn Văn A"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="a.nv@mtadancecrew.vn"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Mật khẩu khởi tạo
                  </label>
                  <input
                    type="text"
                    value={createPassword}
                    required
                    minLength={12}
                    maxLength={128}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Tối thiểu 12 ký tự"
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    placeholder="0912345678"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Khóa / Lớp tại MTA
                </label>
                <input
                  type="text"
                  placeholder="ví dụ: K59 - CNTT"
                  value={createClass}
                  onChange={(e) => setCreateClass(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Ban Chính
                  </label>
                  <select
                    value={createDept}
                    onChange={(e) => {
                      const dept = e.target.value as DepartmentCode;
                      setCreateDept(dept);
                      if (dept === "BOARD") setCreateRole("BOARD_ADMIN");
                      else if (dept === "MEDIA") setCreateRole("MEDIA_MEMBER");
                      else setCreateRole("DANCE_MEMBER");
                    }}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-mdc-red"
                  >
                    <option value="DANCE">Ban Chuyên môn</option>
                    <option value="MEDIA">Ban Truyền thông</option>
                    <option value="BOARD">Ban Chủ nhiệm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Vai Trò (Role)
                  </label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as RoleCode)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-mdc-red"
                  >
                    <option value="DANCE_MEMBER">DANCE_MEMBER (Vũ công)</option>
                    <option value="DANCE_LEADER">DANCE_LEADER (Leader bài)</option>
                    <option value="DANCE_HEAD">DANCE_HEAD (Trưởng ban C.Môn)</option>
                    <option value="MEDIA_MEMBER">MEDIA_MEMBER (Thành viên Media)</option>
                    <option value="MEDIA_HEAD">MEDIA_HEAD (Trưởng ban Media)</option>
                    <option value="BOARD_ADMIN">BOARD_ADMIN (Ban Chủ nhiệm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Trạng Thái
                  </label>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value as UserStatus)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-mdc-red"
                  >
                    <option value="ACTIVE">ACTIVE (Hoạt động)</option>
                    <option value="PENDING">PENDING (Chờ duyệt)</option>
                    <option value="INACTIVE">INACTIVE (Đã khóa)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-mdc-border mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-mdc-card hover:bg-white/10 text-slate-300 font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-mdc-red hover:bg-mdc-redDark text-white font-bold transition-all shadow-glowRed disabled:opacity-50"
                >
                  {isCreating ? "Đang tạo..." : "Tạo Tài Khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHỈNH SỬA TÀI KHOẢN (UPDATE) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-mdc-surface border border-mdc-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-mdc-border mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-mdc-cyan" />
                <span>Chỉnh Sửa Thông Tin Tài Khoản</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Họ và Tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Đặt Lại Mật Khẩu (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="Để trống nếu không đổi..."
                    value={editPassword}
                    minLength={12}
                    maxLength={128}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-mdc-red font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Số Điện Thoại
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Khóa / Lớp MTA
                </label>
                <input
                  type="text"
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                  className="w-full bg-mdc-card border border-mdc-border rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mdc-red"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Ban Chính
                  </label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value as DepartmentCode)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-mdc-red"
                  >
                    <option value="DANCE">Ban Chuyên môn</option>
                    <option value="MEDIA">Ban Truyền thông</option>
                    <option value="BOARD">Ban Chủ nhiệm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Vai Trò (Role)
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as RoleCode)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-mdc-red"
                  >
                    <option value="DANCE_MEMBER">DANCE_MEMBER (Vũ công)</option>
                    <option value="DANCE_LEADER">DANCE_LEADER (Leader bài)</option>
                    <option value="DANCE_HEAD">DANCE_HEAD (Trưởng ban C.Môn)</option>
                    <option value="MEDIA_MEMBER">MEDIA_MEMBER (Thành viên Media)</option>
                    <option value="MEDIA_HEAD">MEDIA_HEAD (Trưởng ban Media)</option>
                    <option value="BOARD_ADMIN">BOARD_ADMIN (Ban Chủ nhiệm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Trạng Thái
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                    className="w-full bg-mdc-card border border-mdc-border rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-mdc-red"
                  >
                    <option value="ACTIVE">ACTIVE (Hoạt động)</option>
                    <option value="PENDING">PENDING (Chờ duyệt)</option>
                    <option value="INACTIVE">INACTIVE (Đã khóa)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-mdc-border mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-mdc-card hover:bg-white/10 text-slate-300 font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-5 py-2 rounded-xl bg-mdc-cyan/20 hover:bg-mdc-cyan/30 text-mdc-cyan border border-mdc-cyan/40 font-bold transition-all disabled:opacity-50"
                >
                  {isEditing ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: XÁC NHẬN XÓA TÀI KHOẢN (DELETE) */}
      {showDeleteModal && deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-mdc-surface border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white text-center mb-2">
              Xác Nhận Xóa Vĩnh Viễn Tài Khoản
            </h3>

            <p className="text-xs text-slate-300 text-center leading-relaxed mb-4">
              Bạn có chắc chắn muốn xóa tài khoản <strong>{deletingUser.name}</strong> ({deletingUser.email}) khỏi hệ thống CLB?
              <br />
              <span className="text-red-400 font-semibold mt-1 inline-block">
                Hành động này sẽ xóa vĩnh viễn quyền truy cập, phân công và nhật ký liên quan của thành viên này.
              </span>
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-200">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-mdc-card hover:bg-white/10 text-slate-300 font-semibold text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteSubmit}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {isDeleting ? "Đang xóa..." : "Xóa Vĩnh Viễn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
