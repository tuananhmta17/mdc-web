import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, readDb, withApi } from "@/lib/db";
import { visibleDatabase } from "@/lib/visibility";
export const GET = withApi(async (req: NextRequest) => {
  const raw = readDb();
  const session = getSessionFromRequest(req, raw);
  if (session.user.status !== "ACTIVE") return NextResponse.json({ session, isPendingApproval: true });
  const db = visibleDatabase(raw, session);
  return NextResponse.json({ session, isPendingApproval: false, departments: db.departments,
    departmentMemberships: db.department_memberships, roleAssignments: db.role_assignments,
    profiles: db.profiles, dances: db.dances, pollRounds: db.dance_poll_rounds,
    pollOptions: db.dance_poll_options, votes: db.dance_votes, registrations: db.dance_registrations,
    practiceSessions: db.practice_sessions, practiceRsvps: db.practice_rsvps,
    practiceAttendance: db.practice_attendance, mediaTasks: db.media_tasks,
    mediaSubmissions: db.media_task_submissions, announcements: db.announcements,
    notifications: db.notifications, outbox: db.email_outbox.slice(0, 200), auditLogs: db.audit_logs.slice(0, 200) });
}, { pending: true });
