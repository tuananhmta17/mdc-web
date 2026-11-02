import { withApi } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { AttendanceStatus } from "@/lib/types";

async function handlerPOST(
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
    return NextResponse.json({ error: "Forbidden: Only designated leader or dance head can record attendance" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { user_id, status, note } = body as {
      user_id: string;
      status: AttendanceStatus;
      note?: string;
    };

    if (!user_id || !["PRESENT", "LATE", "EXCUSED", "ABSENT"].includes(status)) {
      return NextResponse.json({ error: "Invalid user_id or status" }, { status: 400 });
    }
    if (!db.dance_registrations.some(r => r.dance_id === practice.dance_id && r.user_id === user_id && ["REGISTERED", "APPROVED"].includes(r.status)) && dance.leader_id !== user_id) return NextResponse.json({ error: "Chỉ điểm danh thành viên thuộc đội hình." }, { status: 400 });
    if (practice.status === "CANCELLED") return NextResponse.json({ error: "Buổi tập đã hủy." }, { status: 400 });

    const existing = db.practice_attendance.find(
      (a) => a.session_id === id && a.user_id === user_id
    );

    if (existing) {
      existing.status = status;
      if (note !== undefined) existing.note = note;
      existing.marked_by = session.user.id;
      existing.marked_at = new Date().toISOString();
    } else {
      db.practice_attendance.push({
        id: `att-${randomUUID()}-${user_id}`,
        session_id: id,
        user_id,
        status,
        note: note || "",
        marked_by: session.user.id,
        marked_at: new Date().toISOString(),
      });
    }

    writeDb(db);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = withApi(handlerPOST);
