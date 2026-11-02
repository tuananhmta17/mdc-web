import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getCurrentSession(db);

  if (!RBAC.canManagePoll(session)) {
    return NextResponse.json({ error: "Only Board Admin or Dance Head can close poll" }, { status: 403 });
  }

  const round = db.dance_poll_rounds.find((r) => r.id === id);
  if (!round) {
    return NextResponse.json({ error: "Poll round not found" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { winning_dance_id } = body;

    round.status = winning_dance_id ? "DECIDED" : "CLOSED";
    if (winning_dance_id) {
      round.winning_dance_id = winning_dance_id;
      const dance = db.dances.find((d) => d.id === winning_dance_id);
      if (dance) {
        dance.status = "SELECTED";
      }
    }

    db.audit_logs.unshift({
      id: `audit-${Date.now()}`,
      actor_id: session.user.id,
      action: "CLOSE_POLL_ROUND",
      entity_type: "dance_poll_rounds",
      entity_id: id,
      after_json: { status: round.status, winning_dance_id },
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, round });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
