import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { RoleCode, UserStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getCurrentSession(db);

  if (!RBAC.canManageMembers(session)) {
    return NextResponse.json({ error: "Only Board Admin can manage members." }, { status: 403 });
  }

  const member = db.profiles.find((p) => p.id === id);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { status, role, department_code, phone, cohort_class, full_name } = body;
    const beforeState = { ...member };

    if (status && ["PENDING", "ACTIVE", "INACTIVE"].includes(status)) {
      member.status = status as UserStatus;
    }
    if (phone !== undefined) member.phone = phone;
    if (cohort_class !== undefined) member.cohort_class = cohort_class;
    if (full_name !== undefined) member.full_name = full_name;
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
