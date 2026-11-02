import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const cookieUid = req.cookies.get("mdc_uid")?.value;
  const db = readDb();
  const session = getCurrentSession(db, cookieUid);

  // If user is PENDING approval, return limited preview
  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({
      session,
      isPendingApproval: true,
      profiles: [],
      dances: [],
      polls: [],
      practices: [],
      tasks: [],
      announcements: db.announcements.filter((a) => a.audience === "ALL_CLUB"),
      notifications: db.notifications.filter((n) => n.recipient_id === session.user.id),
      outbox: [],
      auditLogs: [],
    });
  }

  // Active member returns full data
  return NextResponse.json({
    session,
    isPendingApproval: false,
    departments: db.departments,
    departmentMemberships: db.department_memberships,
    roleAssignments: db.role_assignments,
    profiles: db.profiles,
    dances: db.dances,
    pollRounds: db.dance_poll_rounds,
    pollOptions: db.dance_poll_options,
    votes: db.dance_votes,
    registrations: db.dance_registrations,
    availabilitySlots: db.availability_slots,
    practiceSessions: db.practice_sessions,
    practiceRsvps: db.practice_rsvps,
    practiceAttendance: db.practice_attendance,
    mediaTasks: db.media_tasks,
    mediaSubmissions: db.media_task_submissions,
    announcements: db.announcements,
    notifications: db.notifications.filter((n) => n.recipient_id === session.user.id),
    outbox: session.isBoardAdmin ? db.email_outbox : [],
    auditLogs: session.isBoardAdmin ? db.audit_logs : [],
  });
}
