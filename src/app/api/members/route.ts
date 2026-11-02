import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { Profile, RoleAssignment, DepartmentMembership } from "@/lib/types";

export async function GET() {
  const db = readDb();
  const session = getCurrentSession(db);

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

export async function POST(req: NextRequest) {
  const db = readDb();
  const session = getCurrentSession(db);

  if (!RBAC.canManageMembers(session)) {
    return NextResponse.json({ error: "Only Board Admin can invite or add members." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, full_name, phone, cohort_class, department_code, role } = body;

    if (!email || !full_name) {
      return NextResponse.json({ error: "Email and full_name are required" }, { status: 400 });
    }

    if (db.profiles.some((p) => p.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: "Email already registered in system" }, { status: 409 });
    }

    const newId = `u-${Date.now()}`;
    const newProfile: Profile = {
      id: newId,
      email,
      full_name,
      phone: phone || "",
      cohort_class: cohort_class || "",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.profiles.push(newProfile);

    // Assign department
    const dept = db.departments.find((d) => d.code === (department_code || "DANCE"));
    if (dept) {
      const newMem: DepartmentMembership = {
        id: `dm-${Date.now()}`,
        user_id: newId,
        department_id: dept.id,
        is_primary: true,
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
      };
      db.department_memberships.push(newMem);
    }

    // Assign role
    const assignedRole = role || (dept?.code === "MEDIA" ? "MEDIA_MEMBER" : "DANCE_MEMBER");
    const newRole: RoleAssignment = {
      id: `ra-${Date.now()}`,
      user_id: newId,
      role: assignedRole,
      department_id: dept?.id,
      assigned_at: new Date().toISOString(),
    };
    db.role_assignments.push(newRole);

    // Audit log
    db.audit_logs.unshift({
      id: `audit-${Date.now()}`,
      actor_id: session.user.id,
      action: "INVITE_MEMBER",
      entity_type: "profiles",
      entity_id: newId,
      after_json: { email, full_name, role: assignedRole },
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, member: newProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
