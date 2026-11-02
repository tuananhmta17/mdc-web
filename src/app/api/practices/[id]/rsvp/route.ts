import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { RSVPResponse } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getCurrentSession(db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const practice = db.practice_sessions.find((p) => p.id === id);
  if (!practice) {
    return NextResponse.json({ error: "Practice session not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { response, note } = body as { response: RSVPResponse; note?: string };

    if (!["ATTENDING", "DECLINED", "PENDING"].includes(response)) {
      return NextResponse.json({ error: "Invalid RSVP response" }, { status: 400 });
    }

    const existing = db.practice_rsvps.find(
      (r) => r.session_id === id && r.user_id === session.user.id
    );

    if (existing) {
      existing.response = response;
      if (note !== undefined) existing.note = note;
      existing.responded_at = new Date().toISOString();
    } else {
      db.practice_rsvps.push({
        id: `rsvp-${Date.now()}-${session.user.id}`,
        session_id: id,
        user_id: session.user.id,
        response,
        note,
        responded_at: new Date().toISOString(),
      });
    }

    writeDb(db);
    return NextResponse.json({ success: true, response });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
