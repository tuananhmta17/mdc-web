import { CurrentUserSession, DatabaseSchema } from "./types";
import { RBAC } from "./rbac";

export function visibleDatabase(db: DatabaseSchema, s: CurrentUserSession): DatabaseSchema {
  const dances = db.dances.filter(d => RBAC.canRegisterDance(s, d));
  const danceIds = new Set(dances.map(d => d.id));
  const rounds = db.dance_poll_rounds.filter(r => RBAC.canVotePoll(s, r));
  const roundIds = new Set(rounds.map(r => r.id));
  const tasks = db.media_tasks.filter(t => s.isBoardAdmin || s.isMediaHead || t.assignee_id === s.user.id);
  const taskIds = new Set(tasks.map(t => t.id));
  const practices = db.practice_sessions.filter(p => danceIds.has(p.dance_id));
  const practiceIds = new Set(practices.map(p => p.id));
  return { ...db,
    profiles: s.isBoardAdmin ? db.profiles : db.profiles.filter(p => p.status === "ACTIVE" || p.id === s.user.id).map(p => p.id === s.user.id ? p : { id: p.id, full_name: p.full_name, email: "", status: p.status, created_at: p.created_at, updated_at: p.updated_at }),
    dances, dance_poll_rounds: rounds, dance_poll_options: db.dance_poll_options.filter(o => roundIds.has(o.round_id) && danceIds.has(o.dance_id)),
    dance_votes: db.dance_votes.filter(v => roundIds.has(v.round_id) && (v.user_id === s.user.id || s.isBoardAdmin || s.isDanceHead || rounds.some(r => r.id === v.round_id && (r.result_visibility === "PUBLIC" || r.status !== "OPEN")))),
    dance_registrations: db.dance_registrations.filter(r => danceIds.has(r.dance_id)),
    availability_slots: db.availability_slots.filter(a => dances.some(d => d.id === a.dance_id && RBAC.canViewDanceAvailability(s, d, db.dance_registrations.some(r => r.dance_id === d.id && r.user_id === s.user.id && ["REGISTERED", "APPROVED"].includes(r.status))))),
    practice_sessions: practices, practice_rsvps: db.practice_rsvps.filter(r => practiceIds.has(r.session_id)), practice_attendance: db.practice_attendance.filter(a => practiceIds.has(a.session_id)),
    media_tasks: tasks, media_task_submissions: db.media_task_submissions.filter(sub => taskIds.has(sub.task_id)),
    announcements: db.announcements.filter(a => s.isBoardAdmin || a.audience === "ALL_CLUB" || (a.audience === "DANCE_ONLY" && (s.isDanceHead || s.isDanceLeader || s.isDanceMember)) || (a.audience === "MEDIA_ONLY" && (s.isMediaHead || s.isMediaMember))),
    notifications: db.notifications.filter(n => n.recipient_id === s.user.id), email_outbox: s.isBoardAdmin ? db.email_outbox : [], audit_logs: s.isBoardAdmin ? db.audit_logs : [],
  };
}
