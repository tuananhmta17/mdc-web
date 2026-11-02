// MTA Dance Crew (MDC) — Data Models & TypeScript Definitions

export type RoleCode =
  | "BOARD_ADMIN"
  | "DANCE_HEAD"
  | "DANCE_LEADER"
  | "DANCE_MEMBER"
  | "MEDIA_HEAD"
  | "MEDIA_MEMBER";

export type DepartmentCode = "BOARD" | "DANCE" | "MEDIA";

export type UserStatus = "PENDING" | "ACTIVE" | "INACTIVE";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  cohort_class?: string; // Khóa / Lớp tại MTA (Học viện Kỹ thuật Quân sự)
  avatar_url?: string;
  status: UserStatus;
  password?: string; // Server-only scrypt hash; never serialized to clients.
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  code: DepartmentCode;
  name: string;
  description: string;
}

export interface DepartmentMembership {
  id: string;
  user_id: string;
  department_id: string;
  is_primary: boolean;
  status: "ACTIVE" | "INACTIVE";
  joined_at: string;
}

export interface RoleAssignment {
  id: string;
  user_id: string;
  role: RoleCode;
  department_id?: string;
  assigned_at: string;
}

export type DanceStatus =
  | "DRAFT"
  | "VOTING"
  | "SELECTED"
  | "REJECTED"
  | "RECRUITING"
  | "PRACTICING"
  | "COMPLETED"
  | "ARCHIVED";

export type DanceVisibility = "DANCE_ONLY" | "ALL_CLUB";

export interface Dance {
  id: string;
  code: string;
  title: string;
  description: string;
  song_title: string;
  music_url?: string;
  video_url?: string;
  cover_url?: string;
  leader_id?: string;
  target_performance_date?: string;
  capacity: number;
  visibility: DanceVisibility;
  status: DanceStatus;
  created_at: string;
  updated_at: string;
}

export type PollRoundStatus = "OPEN" | "CLOSED" | "DECIDED";
export type PollScope = "DANCE_ONLY" | "ALL_CLUB";
export type PollResultVisibility = "PUBLIC" | "HIDDEN_UNTIL_CLOSED";

export interface DancePollRound {
  id: string;
  title: string;
  description: string;
  scope: PollScope;
  start_at: string;
  end_at: string;
  result_visibility: PollResultVisibility;
  status: PollRoundStatus;
  winning_dance_id?: string;
  created_at: string;
}

export interface DancePollOption {
  id: string;
  round_id: string;
  dance_id: string;
}

export interface DanceVote {
  id: string;
  round_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
}

export type DanceRegistrationStatus =
  | "REGISTERED"
  | "APPROVED"
  | "WAITLISTED"
  | "CANCELLED";

export interface DanceRegistration {
  id: string;
  dance_id: string;
  user_id: string;
  note?: string;
  status: DanceRegistrationStatus;
  registered_at: string;
  approved_at?: string;
}

export type AvailabilityLevel = "AVAILABLE" | "MAYBE" | "UNAVAILABLE";

export interface AvailabilitySlot {
  id: string;
  dance_id: string;
  user_id: string;
  day_of_week: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  start_time: string; // "18:00"
  end_time: string; // "20:00"
  level: AvailabilityLevel;
  created_at: string;
  updated_at: string;
}

export type PracticeStatus =
  | "SCHEDULED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "COMPLETED";

export interface PracticeSession {
  id: string;
  dance_id: string;
  title: string;
  start_at: string; // ISO 8601 UTC
  end_at: string; // ISO 8601 UTC
  location: string;
  notes?: string;
  status: PracticeStatus;
  cancel_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type RSVPResponse = "ATTENDING" | "DECLINED" | "PENDING";

export interface PracticeRSVP {
  id: string;
  session_id: string;
  user_id: string;
  response: RSVPResponse;
  note?: string;
  responded_at: string;
}

export type AttendanceStatus = "PRESENT" | "LATE" | "EXCUSED" | "ABSENT";

export interface PracticeAttendance {
  id: string;
  session_id: string;
  user_id: string;
  status: AttendanceStatus;
  note?: string;
  marked_by?: string;
  marked_at: string;
}

export type TaskType =
  | "POST"
  | "PHOTO"
  | "VIDEO"
  | "DESIGN"
  | "STORY"
  | "LOGISTICS"
  | "OTHER";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "REVISION_REQUESTED"
  | "APPROVED";

export interface MediaTask {
  id: string;
  title: string;
  description: string;
  task_type: TaskType;
  priority: TaskPriority;
  assigner_id: string;
  assignee_id: string;
  dance_id?: string;
  due_at: string; // ISO 8601
  status: TaskStatus;
  progress_percent: number;
  reference_links?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaTaskSubmission {
  id: string;
  task_id: string;
  submitter_id: string;
  url: string;
  version: number;
  note?: string;
  review_status: "PENDING" | "APPROVED" | "REVISION_REQUESTED";
  feedback?: string;
  reviewed_by?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: "ALL_CLUB" | "BOARD_ONLY" | "DANCE_ONLY" | "MEDIA_ONLY";
  created_by: string;
  published_at: string;
}

export interface InAppNotification {
  id: string;
  recipient_id: string;
  type: string;
  subject: string;
  body: string;
  entity_type?: string;
  entity_id?: string;
  link_url?: string;
  read_at?: string;
  created_at: string;
}

export interface EmailOutboxItem {
  id: string;
  notification_id?: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body_html: string;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED";
  claimed_until?: string;
  claim_token?: string;
  attempts: number;
  next_retry_at?: string;
  last_error?: string;
  idempotency_key: string;
  created_at: string;
  sent_at?: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  before_json?: any;
  after_json?: any;
  occurred_at: string;
}

// Full In-Memory / Local JSON Database representation
export interface DatabaseSchema {
  auth_sessions?: { token_hash: string; user_id: string; expires_at: string }[];
  auth_attempts?: { key: string; count: number; reset_at: string }[];
  profiles: Profile[];
  departments: Department[];
  department_memberships: DepartmentMembership[];
  role_assignments: RoleAssignment[];
  dances: Dance[];
  dance_poll_rounds: DancePollRound[];
  dance_poll_options: DancePollOption[];
  dance_votes: DanceVote[];
  dance_registrations: DanceRegistration[];
  availability_slots: AvailabilitySlot[];
  practice_sessions: PracticeSession[];
  practice_rsvps: PracticeRSVP[];
  practice_attendance: PracticeAttendance[];
  media_tasks: MediaTask[];
  media_task_submissions: MediaTaskSubmission[];
  announcements: Announcement[];
  notifications: InAppNotification[];
  email_outbox: EmailOutboxItem[];
  audit_logs: AuditLog[];
}

export interface CurrentUserSession {
  user: Profile;
  primaryDepartment?: Department;
  roles: RoleCode[];
  isBoardAdmin: boolean;
  isDanceHead: boolean;
  isDanceLeader: boolean;
  isDanceMember: boolean;
  isMediaHead: boolean;
  isMediaMember: boolean;
}
