import { hashPassword } from "@/lib/security";
import { visibleDatabase } from "@/lib/visibility";
import { withApi } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, getSessionFromRequest, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { Profile, RoleAssignment, DepartmentMembership, UserStatus, RoleCode } from "@/lib/types";

async function handlerGET(req: NextRequest) {
  const db = visibleDatabase(readDb(), getCurrentSession());
  const session = getSessionFromRequest(req, db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Access denied. Account is pending approval." }, { status: 403 });
  }

  const result = db.profiles.map((p) => {
    const mems = db.department_memberships.filter((m) => m.user_id === p.id);
    const roles = db.role_assignments.filter((r) => r.user_id === p.id);
    return {
      ...p,
      memberships: mems,
      roles: roles.map((r) => r.role),
    };
  });

  return NextResponse.json(result);
}

async function handlerPOST(req: NextRequest) {
  const db = readDb();
  const session = getSessionFromRequest(req, db);

  if (!RBAC.canManageMembers(session)) {
    return NextResponse.json({ error: "Chỉ Ban Chủ nhiệm (Admin) mới có quyền tạo hoặc thêm tài khoản thành viên." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, full_name, phone, cohort_class, department_code, role, status, password } = body;

    if (!email || !full_name) {
      return NextResponse.json({ error: "Email và Họ tên là bắt buộc." }, { status: 400 });
    }

    if (db.profiles.some((p) => p.email.toLowerCase() === email.trim().toLowerCase())) {
      return NextResponse.json({ error: "Địa chỉ email này đã tồn tại trong hệ thống." }, { status: 409 });
    }

    const newId = `u-${randomUUID()}`;
    const newProfile: Profile = {
      id: newId,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
      phone: phone?.trim() || "",
      cohort_class: cohort_class?.trim() || "",
      status: (status as UserStatus) || "ACTIVE",
      password: hashPassword(password),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.profiles.push(newProfile);

    // Assign department
    const dept = db.departments.find((d) => d.code === (department_code || "DANCE"));
    if (dept) {
      const newMem: DepartmentMembership = {
        id: `dm-${randomUUID()}`,
        user_id: newId,
        department_id: dept.id,
        is_primary: true,
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
      };
      db.department_memberships.push(newMem);
    }

    // Assign role
    const assignedRole = (role as RoleCode) || (dept?.code === "MEDIA" ? "MEDIA_MEMBER" : "DANCE_MEMBER");
    const expectedDept = assignedRole === "BOARD_ADMIN" ? "BOARD" : assignedRole.startsWith("MEDIA") ? "MEDIA" : "DANCE";
    if (dept?.code !== expectedDept) return NextResponse.json({ error: "Vai trò không phù hợp với ban đã chọn." }, { status: 400 });
    const newRole: RoleAssignment = {
      id: `ra-${randomUUID()}`,
      user_id: newId,
      role: assignedRole,
      department_id: dept?.id,
      assigned_at: new Date().toISOString(),
    };
    db.role_assignments.push(newRole);

    // Audit log
    db.audit_logs.unshift({
      id: `audit-${randomUUID()}`,
      actor_id: session.user.id,
      action: "CREATE_MEMBER",
      entity_type: "profiles",
      entity_id: newId,
      after_json: { email, full_name, role: assignedRole, status: newProfile.status },
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, member: newProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withApi(handlerGET);
export const POST = withApi(handlerPOST);
