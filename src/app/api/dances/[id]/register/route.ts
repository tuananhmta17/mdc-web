import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { DanceRegistration } from "@/lib/types";
import { createNotificationAndOutbox } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getCurrentSession(db);

  const dance = db.dances.find((d) => d.id === id);
  if (!dance) {
    return NextResponse.json({ error: "Dance not found" }, { status: 404 });
  }

  // Acceptance criterion 2: Scope check
  if (!RBAC.canRegisterDance(session, dance)) {
    return NextResponse.json(
      { error: "Thành viên Ban Truyền thông không thể đăng ký bài nhảy giới hạn nội bộ Ban Chuyên môn (DANCE_ONLY)." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { note, cancel } = body;

    const existingIndex = db.dance_registrations.findIndex(
      (r) => r.dance_id === id && r.user_id === session.user.id
    );

    if (cancel) {
      if (existingIndex >= 0) {
        db.dance_registrations.splice(existingIndex, 1);
        writeDb(db);
        return NextResponse.json({ success: true, message: "Đã hủy đăng ký" });
      }
      return NextResponse.json({ error: "Chưa đăng ký bài này" }, { status: 400 });
    }

    if (existingIndex >= 0) {
      return NextResponse.json({ error: "Bạn đã đăng ký bài nhảy này rồi" }, { status: 409 });
    }

    // Check capacity
    const approvedCount = db.dance_registrations.filter(
      (r) => r.dance_id === id && (r.status === "APPROVED" || r.status === "REGISTERED")
    ).length;

    const regStatus = approvedCount >= dance.capacity ? "WAITLISTED" : "REGISTERED";

    const newReg: DanceRegistration = {
      id: `reg-${Date.now()}`,
      dance_id: id,
      user_id: session.user.id,
      note: note || "",
      status: regStatus,
      registered_at: new Date().toISOString(),
    };

    db.dance_registrations.push(newReg);

    // Notify user
    createNotificationAndOutbox(db, {
      recipient: session.user,
      type: "DANCE_REGISTRATION_OPENED",
      subject: `Đăng ký bài nhảy thành công: ${dance.title}`,
      bodyText: `Bạn đã đăng ký tham gia bài "${dance.title}". Trạng thái hiện tại: ${regStatus === "WAITLISTED" ? "Danh sách chờ (Waitlist)" : "Đã ghi nhận"}.`,
      bodyHtml: `<p>Bạn đã đăng ký tham gia bài <strong>"${dance.title}"</strong>.</p><p>Trạng thái: <strong>${regStatus === "WAITLISTED" ? "Danh sách chờ" : "Ghi nhận thành công"}</strong>.</p>`,
      entityType: "dances",
      entityId: id,
      linkUrl: `/dances/${id}`,
      idempotencyKey: `dance-reg-${id}-${session.user.id}`,
    });

    writeDb(db);
    return NextResponse.json({ success: true, registration: newReg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getCurrentSession(db);

  const dance = db.dances.find((d) => d.id === id);
  if (!dance) {
    return NextResponse.json({ error: "Dance not found" }, { status: 404 });
  }

  const isLeader = dance.leader_id === session.user.id;
  if (!session.isBoardAdmin && !session.isDanceHead && !isLeader) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { registrationId, status } = body;

    const reg = db.dance_registrations.find((r) => r.id === registrationId && r.dance_id === id);
    if (!reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    reg.status = status;
    if (status === "APPROVED") {
      reg.approved_at = new Date().toISOString();
      const targetUser = db.profiles.find((p) => p.id === reg.user_id);
      if (targetUser) {
        createNotificationAndOutbox(db, {
          recipient: targetUser,
          type: "DANCE_REGISTRATION_CONFIRMED",
          subject: `Chúc mừng! Bạn đã được chọn vào bài nhảy: ${dance.title}`,
          bodyText: `Bạn đã được duyệt chính thức vào đội hình biểu diễn bài "${dance.title}". Hãy vào cập nhật lịch rảnh để Leader xếp lịch tập.`,
          bodyHtml: `<p>Chúc mừng bạn đã được chọn vào đội hình bài <strong>"${dance.title}"</strong>.</p><p>Vui lòng cập nhật lịch rảnh hàng tuần trên hệ thống.</p>`,
          entityType: "dances",
          entityId: id,
          linkUrl: `/availability`,
          idempotencyKey: `dance-reg-confirm-${id}-${targetUser.id}`,
        });
      }
    }

    writeDb(db);
    return NextResponse.json({ success: true, registration: reg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
