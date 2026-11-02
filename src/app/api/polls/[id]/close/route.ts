import { withApi } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";

async function handlerPOST(
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
    if (winning_dance_id && !db.dance_poll_options.some(o => o.round_id === id && o.dance_id === winning_dance_id)) return NextResponse.json({ error: "Bài được chọn phải thuộc danh sách ứng viên." }, { status: 400 });
    if (round.status === "DECIDED") return NextResponse.json({ error: "Đợt bình chọn đã chốt kết quả." }, { status: 409 });

    round.status = winning_dance_id ? "DECIDED" : "CLOSED";
    if (winning_dance_id) {
      round.winning_dance_id = winning_dance_id;
      const dance = db.dances.find((d) => d.id === winning_dance_id);
      if (dance) {
        dance.status = "SELECTED";
      }
    }

    db.audit_logs.unshift({
      id: `audit-${randomUUID()}`,
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

export const POST = withApi(handlerPOST);
