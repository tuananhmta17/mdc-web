-- =====================================================================
-- MTA Dance Crew (MDC) — Complete Database Schema & Migration (PostgreSQL / Supabase)
-- Version: 1.0
-- =====================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Departments (Ban)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL, -- 'BOARD', 'DANCE', 'MEDIA'
  name VARCHAR(100) NOT NULL,       -- 'Ban Chủ nhiệm', 'Ban Chuyên môn', 'Ban Truyền thông'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (Hồ sơ thành viên)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  cohort_class VARCHAR(100),       -- Khóa/Lớp tại MTA (Học viện Kỹ thuật Quân sự)
  avatar_url TEXT,
  status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Department Memberships (Phân ban)
CREATE TABLE IF NOT EXISTS department_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  is_primary BOOLEAN DEFAULT TRUE,
  status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_dept_membership UNIQUE(user_id, department_id)
);

-- 4. Role Assignments (Phân quyền)
CREATE TABLE IF NOT EXISTS role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'BOARD_ADMIN',
    'DANCE_HEAD',
    'DANCE_LEADER',
    'DANCE_MEMBER',
    'MEDIA_HEAD',
    'MEDIA_MEMBER'
  )),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_role_assignment UNIQUE(user_id, role, department_id)
);

-- 5. Dances (Bài nhảy)
CREATE TABLE IF NOT EXISTS dances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'DANCE-2026-01'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  song_title VARCHAR(200) NOT NULL,
  music_url TEXT,
  video_url TEXT,
  cover_url TEXT,
  leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_performance_date DATE,
  capacity INT DEFAULT 12,
  visibility VARCHAR(30) DEFAULT 'DANCE_ONLY' CHECK (visibility IN ('DANCE_ONLY', 'ALL_CLUB')),
  status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'VOTING', 'SELECTED', 'REJECTED', 'RECRUITING', 'PRACTICING', 'COMPLETED', 'ARCHIVED'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Dance Poll Rounds (Đợt bình chọn)
CREATE TABLE IF NOT EXISTS dance_poll_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scope VARCHAR(30) DEFAULT 'DANCE_ONLY' CHECK (scope IN ('DANCE_ONLY', 'ALL_CLUB')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  result_visibility VARCHAR(30) DEFAULT 'PUBLIC' CHECK (result_visibility IN ('PUBLIC', 'HIDDEN_UNTIL_CLOSED')),
  status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'DECIDED')),
  winning_dance_id UUID REFERENCES dances(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Dance Poll Options (Bài ứng viên trong đợt bình chọn)
CREATE TABLE IF NOT EXISTS dance_poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES dance_poll_rounds(id) ON DELETE CASCADE,
  dance_id UUID NOT NULL REFERENCES dances(id) ON DELETE CASCADE,
  CONSTRAINT uq_round_dance UNIQUE (round_id, dance_id)
);

-- 8. Dance Votes (Phiếu bình chọn)
CREATE TABLE IF NOT EXISTS dance_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES dance_poll_rounds(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES dance_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_vote_user_round UNIQUE (round_id, user_id)
);

-- 9. Dance Registrations (Đăng ký tham gia bài nhảy)
CREATE TABLE IF NOT EXISTS dance_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dance_id UUID NOT NULL REFERENCES dances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT,
  status VARCHAR(30) DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'APPROVED', 'WAITLISTED', 'CANCELLED')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  CONSTRAINT uq_dance_user_reg UNIQUE (dance_id, user_id)
);

-- 10. Availability Slots (Lịch rảnh thành viên)
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dance_id UUID NOT NULL REFERENCES dances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, ..., 6=Sat
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  level VARCHAR(30) DEFAULT 'AVAILABLE' CHECK (level IN ('AVAILABLE', 'MAYBE', 'UNAVAILABLE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_dance_slot UNIQUE(dance_id, user_id, day_of_week, start_time, end_time)
);

-- 11. Practice Sessions (Buổi tập)
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dance_id UUID NOT NULL REFERENCES dances(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  location VARCHAR(255) NOT NULL,
  notes TEXT,
  status VARCHAR(30) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED')),
  cancel_reason TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Practice RSVPs (Phản hồi lịch tập)
CREATE TABLE IF NOT EXISTS practice_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response VARCHAR(30) DEFAULT 'PENDING' CHECK (response IN ('ATTENDING', 'DECLINED', 'PENDING')),
  note TEXT,
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_session_user_rsvp UNIQUE (session_id, user_id)
);

-- 13. Practice Attendance (Điểm danh buổi tập)
CREATE TABLE IF NOT EXISTS practice_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'LATE', 'EXCUSED', 'ABSENT')),
  note TEXT,
  marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_session_user_att UNIQUE (session_id, user_id)
);

-- 14. Media Tasks (Nhiệm vụ Ban Truyền thông)
CREATE TABLE IF NOT EXISTS media_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) DEFAULT 'POST' CHECK (task_type IN ('POST', 'PHOTO', 'VIDEO', 'DESIGN', 'STORY', 'LOGISTICS', 'OTHER')),
  priority VARCHAR(30) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  assigner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assignee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  dance_id UUID REFERENCES dances(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(30) DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED')),
  progress_percent INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  reference_links TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Media Task Submissions (Sản phẩm & Phiên bản nộp)
CREATE TABLE IF NOT EXISTS media_task_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES media_tasks(id) ON DELETE CASCADE,
  submitter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  url TEXT NOT NULL,
  version INT DEFAULT 1,
  note TEXT,
  review_status VARCHAR(30) DEFAULT 'PENDING' CHECK (review_status IN ('PENDING', 'APPROVED', 'REVISION_REQUESTED')),
  feedback TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 16. Announcements (Thông báo chung)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  audience VARCHAR(30) DEFAULT 'ALL_CLUB' CHECK (audience IN ('ALL_CLUB', 'BOARD_ONLY', 'DANCE_ONLY', 'MEDIA_ONLY')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. In-App Notifications (Thông báo nội bộ)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Email Outbox (Hàng đợi Email gửi tự động)
CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(150),
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  attempts INT DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- 19. Audit Logs (Nhật ký kiểm toán)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  before_json JSONB,
  after_json JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_memberships_user ON department_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_user ON role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_round ON dance_votes(round_id);
CREATE INDEX IF NOT EXISTS idx_registrations_dance ON dance_registrations(dance_id);
CREATE INDEX IF NOT EXISTS idx_availability_dance ON availability_slots(dance_id);
CREATE INDEX IF NOT EXISTS idx_practice_dance ON practice_sessions(dance_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON media_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON media_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON email_outbox(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, read_at);

-- 21. Row Level Security (RLS) Enablement
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dances ENABLE ROW LEVEL SECURITY;
ALTER TABLE dance_poll_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE dance_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE dance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dance_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policy template for Supabase
CREATE POLICY "Active members can view profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'ACTIVE')
  );

CREATE POLICY "Users can edit own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- 22. App State Snapshots (For Full Instant Cloud Persistence & Serverless Sync)
CREATE TABLE IF NOT EXISTS app_state_snapshots (
  id VARCHAR(50) PRIMARY KEY,
  state_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_state_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow snapshot sync" ON app_state_snapshots FOR ALL USING (true);

