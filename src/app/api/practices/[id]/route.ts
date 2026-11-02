import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { createNotificationAndOutbox } from "@/lib/notifications";
import { formatVNDateTime } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getCurrentSession(db);

  const practice = db.practice_sessions.find((p) => p.id === id);
  if (!practice) {
    return NextResponse.json({ error: "Practice session not found" }, { status: 404 });
  }

  const dance = db.dances.find((d) => d.id === practice.dance_id);
  if (!dance || !RBAC.canManagePractice(session, dance)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, start_at, end_at, location, notes, status, cancel_reason } = body;
    const beforeState = { ...practice };

    if (title !== undefined) practice.title = title;
    if (start_at !== undefined) practice.start_at = start_at;
    if (end_at !== undefined) practice.end_at = end_at;
    if (location !== undefined) practice.location = location;
    if (notes !== undefined) practice.notes = notes;
    if (status !== undefined) practice.status = status;
    if (cancel_reason !== undefined) practice.cancel_reason = cancel_reason;
    practice.updated_at = new Date().toISOString();

    // Notify registered participants of changes
    const rsvps = db.practice_rsvps.filter((r) => r.session_id === id);
    for (const rsvp of rsvps) {
      const user = db.profiles.find((p) => p.id === rsvp.user_id);
      if (!user) continue;

      createNotificationAndOutbox(db, {
        recipient: user,
        type: "PRACTICE_CHANGED",
        subject: `[THAY ĐỔI LỊCH TẬP] ${practice.title}`,
        bodyText: `Lịch tập bài "${dance.title}" đã được cập nhật. Trạng thái: ${practice.status}. Lý do: ${cancel_reason || "Điều chỉnh giờ tập"}.`,
        bodyHtml: `<p>Lịch tập bài <strong>"${dance.title}"</strong> đã thay đổi:</p><ul><li><strong>Trạng thái:</strong> ${practice.status}</li><li><strong>Thời gian:</strong> ${formatVNDateTime(practice.start_at)}</li><li><strong>Địa điểm:</strong> ${practice.location}</li>${cancel_reason ? `<li><strong>Lý do:</strong> ${cancel_reason}</li>` : ""}</ul>`,
        entityType: "practice_sessions",
        entityId: id,
        linkUrl: "/practice",
        idempotencyKey: `practice-changed-${id}-${user.id}-${Date.now()}`,
      });
    }

    db.audit_logs.unshift({
      id: `audit-${Date.now()}`,
      actor_id: session.user.id,
      action: "UPDATE_PRACTICE_SESSION",
      entity_type: "practice_sessions",
      entity_id: id,
      before_json: beforeState,
      after_json: practice,
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, practice });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
