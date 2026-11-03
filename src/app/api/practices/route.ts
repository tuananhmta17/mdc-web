import { visibleDatabase } from "@/lib/visibility";
import { withApi } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { PracticeSession } from "@/lib/types";
import { createNotificationAndOutbox } from "@/lib/notifications";
import { formatVNDateTime } from "@/lib/utils";

async function handlerGET() {
  const db = visibleDatabase(readDb(), getCurrentSession());
  const session = getCurrentSession(db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const sessionsWithDetails = db.practice_sessions.map((ps) => {
    const dance = db.dances.find((d) => d.id === ps.dance_id);
    const rsvps = db.practice_rsvps.filter((r) => r.session_id === ps.id);
    const attendance = db.practice_attendance.filter((a) => a.session_id === ps.id);
    const myRsvp = rsvps.find((r) => r.user_id === session.user.id);

    return {
      ...ps,
      dance,
      rsvps,
      attendance,
      myRsvp: myRsvp?.response || "PENDING",
      canManage: dance ? RBAC.canManagePractice(session, dance) : false,
    };
  });

  return NextResponse.json(sessionsWithDetails);
}

async function handlerPOST(req: NextRequest) {
  const db = readDb();
  const session = getCurrentSession(db);

  try {
    const body = await req.json();
    const { dance_id, title, start_at, end_at, location, notes } = body;

    const dance = db.dances.find((d) => d.id === dance_id);
    if (!dance) {
      return NextResponse.json({ error: "Dance not found" }, { status: 404 });
    }

    // Acceptance criterion 6: Leader/Head permission check
    if (!RBAC.canManagePractice(session, dance)) {
      return NextResponse.json(
        { error: "Chỉ Leader phụ trách bài nhảy hoặc Trưởng ban/Chủ nhiệm mới có quyền chốt lịch tập bài này." },
        { status: 403 }
      );
    }

    if (!title || !start_at || !end_at || !location) {
      return NextResponse.json({ error: "Title, start_at, end_at, and location are required" }, { status: 400 });
    }

    const sessionId = `prac-${randomUUID()}`;
    const newSession: PracticeSession = {
      id: sessionId,
      dance_id,
      title,
      start_at,
      end_at,
      location,
      notes: notes || "",
      status: "SCHEDULED",
      created_by: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.practice_sessions.push(newSession);

    // Notify registered dancers
    const registeredUserIds = db.dance_registrations
      .filter((r) => r.dance_id === dance_id && (r.status === "APPROVED" || r.status === "REGISTERED"))
      .map((r) => r.user_id);

    for (const uid of registeredUserIds) {
      const u = db.profiles.find((p) => p.id === uid);
      if (!u) continue;

      createNotificationAndOutbox(db, {
        recipient: u,
        type: "PRACTICE_PUBLISHED",
        subject: `Buổi tập mới: ${title}`,
        bodyText: `Buổi tập bài "${dance.title}" đã được chốt: ${formatVNDateTime(start_at)} tại ${location}. Vui lòng đăng nhập để xác nhận RSVP.`,
        bodyHtml: `<p>Buổi tập bài <strong>"${dance.title}"</strong> đã được lên lịch:</p><ul><li><strong>Nội dung:</strong> ${title}</li><li><strong>Thời gian:</strong> ${formatVNDateTime(start_at)} - ${formatVNDateTime(end_at)} (Giờ VN)</li><li><strong>Địa điểm:</strong> ${location}</li></ul><p>Vui lòng đăng nhập hệ thống để xác nhận RSVP.</p>`,
        entityType: "practice_sessions",
        entityId: sessionId,
        linkUrl: "/practice",
        idempotencyKey: `practice-pub-${sessionId}-${u.id}`,
      });

      // Default PENDING RSVP
      db.practice_rsvps.push({
        id: `rsvp-${randomUUID()}-${uid}`,
        session_id: sessionId,
        user_id: uid,
        response: uid === session.user.id ? "ATTENDING" : "PENDING",
        responded_at: new Date().toISOString(),
      });
    }

    db.audit_logs.unshift({
      id: `audit-${randomUUID()}`,
      actor_id: session.user.id,
      action: "CREATE_PRACTICE_SESSION",
      entity_type: "practice_sessions",
      entity_id: sessionId,
      after_json: newSession,
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, practice: newSession });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withApi(handlerGET);
export const POST = withApi(handlerPOST);
