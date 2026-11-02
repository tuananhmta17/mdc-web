import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { RoleCode, UserStatus } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getSessionFromRequest(req, db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Truy cập bị từ chối." }, { status: 403 });
  }

  const member = db.profiles.find((p) => p.id === id);
  if (!member) {
    return NextResponse.json({ error: "Không tìm thấy thành viên." }, { status: 404 });
  }

  const mems = db.department_memberships.filter((m) => m.user_id === id);
  const roles = db.role_assignments.filter((r) => r.user_id === id);

  return NextResponse.json({
    ...member,
    memberships: mems,
    roles: roles.map((r) => r.role),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getSessionFromRequest(req, db);

  if (!RBAC.canManageMembers(session)) {
    return NextResponse.json({ error: "Chỉ Ban Chủ nhiệm (Admin) mới có quyền chỉnh sửa tài khoản thành viên." }, { status: 403 });
  }

  const member = db.profiles.find((p) => p.id === id);
  if (!member) {
    return NextResponse.json({ error: "Không tìm thấy thành viên." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { status, role, department_code, phone, cohort_class, full_name, email, password } = body;
    const beforeState = { ...member };

    // Prevent Admin from locking their own account
    if (id === session.user.id && status === "INACTIVE") {
      return NextResponse.json(
        { error: "Bạn không thể tự khóa tài khoản Admin đang đăng nhập của chính mình." },
        { status: 400 }
      );
    }

    // Check duplicate email if email is being updated
    if (email && email.trim().toLowerCase() !== member.email.toLowerCase()) {
      const emailExists = db.profiles.some(
        (p) => p.id !== id && p.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (emailExists) {
        return NextResponse.json({ error: "Email này đã được sử dụng bởi thành viên khác." }, { status: 409 });
      }
      member.email = email.trim().toLowerCase();
    }

    if (full_name !== undefined && full_name.trim()) member.full_name = full_name.trim();
    if (phone !== undefined) member.phone = phone.trim();
    if (cohort_class !== undefined) member.cohort_class = cohort_class.trim();
    if (password !== undefined && password.trim()) member.password = password.trim();

    if (status && ["PENDING", "ACTIVE", "INACTIVE"].includes(status)) {
      member.status = status as UserStatus;
    }
    member.updated_at = new Date().toISOString();

    // Update department if provided
    if (department_code) {
      const dept = db.departments.find((d) => d.code === department_code);
      if (dept) {
        let mem = db.department_memberships.find((m) => m.user_id === id && m.is_primary);
        if (mem) {
          mem.department_id = dept.id;
        } else {
          db.department_memberships.push({
            id: `dm-${Date.now()}`,
            user_id: id,
            department_id: dept.id,
            is_primary: true,
            status: "ACTIVE",
            joined_at: new Date().toISOString(),
          });
        }
      }
    }

    // Update role if provided
    if (role) {
      // Prevent single admin from stripping their own admin role
      if (id === session.user.id && role !== "BOARD_ADMIN") {
        const otherAdmins = db.role_assignments.filter(
          (ra) => ra.role === "BOARD_ADMIN" && ra.user_id !== id
        );
        if (otherAdmins.length === 0) {
          return NextResponse.json(
            { error: "Hệ thống cần ít nhất một Ban Chủ nhiệm (Admin). Bạn không thể tự hạ quyền của mình." },
            { status: 400 }
          );
        }
      }

      db.role_assignments = db.role_assignments.filter((r) => r.user_id !== id);
      db.role_assignments.push({
        id: `ra-${Date.now()}`,
        user_id: id,
        role: role as RoleCode,
        assigned_at: new Date().toISOString(),
      });
    }

    // Record audit log
    db.audit_logs.unshift({
      id: `audit-${Date.now()}`,
      actor_id: session.user.id,
      action: "UPDATE_MEMBER",
      entity_type: "profiles",
      entity_id: id,
      before_json: beforeState,
      after_json: member,
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, member });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getSessionFromRequest(req, db);

  if (!RBAC.canManageMembers(session)) {
    return NextResponse.json({ error: "Chỉ Ban Chủ nhiệm (Admin) mới có quyền xóa tài khoản." }, { status: 403 });
  }

  // Prevent self deletion
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Bạn không thể tự xóa tài khoản đang đăng nhập của chính mình!" },
      { status: 400 }
    );
  }

  const memberIndex = db.profiles.findIndex((p) => p.id === id);
  if (memberIndex === -1) {
    return NextResponse.json({ error: "Không tìm thấy tài khoản thành viên cần xóa." }, { status: 404 });
  }

  const deletedMember = db.profiles[memberIndex];

  // Remove profile and all associated data
  db.profiles.splice(memberIndex, 1);
  db.department_memberships = db.department_memberships.filter((m) => m.user_id !== id);
  db.role_assignments = db.role_assignments.filter((r) => r.user_id !== id);
  db.dance_registrations = db.dance_registrations.filter((r) => r.user_id !== id);
  db.availability_slots = db.availability_slots.filter((s) => s.user_id !== id);
  db.practice_rsvps = db.practice_rsvps.filter((r) => r.user_id !== id);
  db.practice_attendance = db.practice_attendance.filter((a) => a.user_id !== id);
  db.dance_votes = db.dance_votes.filter((v) => v.user_id !== id);

  // Record audit log
  db.audit_logs.unshift({
    id: `audit-${Date.now()}`,
    actor_id: session.user.id,
    action: "DELETE_MEMBER",
    entity_type: "profiles",
    entity_id: id,
    before_json: deletedMember,
    after_json: null,
    occurred_at: new Date().toISOString(),
  });

  writeDb(db);
  return NextResponse.json({
    success: true,
    message: `Đã xóa vĩnh viễn tài khoản ${deletedMember.full_name} (${deletedMember.email}).`,
  });
}
