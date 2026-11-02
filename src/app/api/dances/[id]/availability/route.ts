import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { AvailabilityLevel, AvailabilitySlot } from "@/lib/types";
import { calculateBestPracticeSlots } from "@/lib/scheduler";

export async function GET(
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

  const isRegistered = db.dance_registrations.some(
    (r) => r.dance_id === id && r.user_id === session.user.id
  );

  // Acceptance criterion 7: Check availability viewing permission
  if (!RBAC.canViewDanceAvailability(session, dance, isRegistered)) {
    return NextResponse.json(
      { error: "Thành viên không tham gia bài nhảy không được xem lịch rảnh cá nhân của nhóm này." },
      { status: 403 }
    );
  }

  const slots = db.availability_slots.filter((s) => s.dance_id === id);
  const recommendations = calculateBestPracticeSlots(db, id);

  return NextResponse.json({
    danceId: id,
    slots,
    recommendations,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getCurrentSession(db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const dance = db.dances.find((d) => d.id === id);
  if (!dance) {
    return NextResponse.json({ error: "Dance not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { slots } = body as {
      slots: Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
        level: AvailabilityLevel;
      }>;
    };

    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: "Slots array required" }, { status: 400 });
    }

    // Replace user's slots for this dance
    db.availability_slots = db.availability_slots.filter(
      (s) => !(s.dance_id === id && s.user_id === session.user.id)
    );

    const now = new Date().toISOString();
    for (const s of slots) {
      db.availability_slots.push({
        id: `av-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        dance_id: id,
        user_id: session.user.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        level: s.level,
        created_at: now,
        updated_at: now,
      });
    }

    writeDb(db);
    return NextResponse.json({ success: true, count: slots.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
