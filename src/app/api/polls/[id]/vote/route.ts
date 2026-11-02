import { withApi } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { DanceVote } from "@/lib/types";

async function handlerPOST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getCurrentSession(db);

  const round = db.dance_poll_rounds.find((r) => r.id === id);
  if (!round) {
    return NextResponse.json({ error: "Poll round not found" }, { status: 404 });
  }

  if (round.status !== "OPEN") {
    return NextResponse.json({ error: "Đợt bình chọn này đã đóng hoặc đã chốt kết quả." }, { status: 400 });
  }
  if (Date.now() < Date.parse(round.start_at) || Date.now() >= Date.parse(round.end_at)) return NextResponse.json({ error: "Đợt bình chọn chưa bắt đầu hoặc đã hết hạn." }, { status: 400 });

  // Acceptance criterion 2: Scope check
  if (!RBAC.canVotePoll(session, round)) {
    return NextResponse.json(
      { error: "Thành viên Ban Truyền thông không thể bình chọn đợt vote nội bộ Ban Chuyên môn (DANCE_ONLY)." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { option_id } = body;

    const option = db.dance_poll_options.find(
      (o) => o.round_id === id && o.id === option_id
    );
    if (!option) {
      return NextResponse.json({ error: "Candidate dance option not found in this round" }, { status: 404 });
    }

    // Acceptance criterion 3: Single valid vote per round per user
    // Atomic upsert: if already voted, update the choice (single vote maintained)
    const existingIndex = db.dance_votes.findIndex(
      (v) => v.round_id === id && v.user_id === session.user.id
    );

    let vote: DanceVote;
    if (existingIndex >= 0) {
      vote = db.dance_votes[existingIndex];
      vote.option_id = option_id;
    } else {
      vote = {
        id: `v-${randomUUID()}-${Math.random().toString(36).substring(2, 6)}`,
        round_id: id,
        option_id,
        user_id: session.user.id,
        created_at: new Date().toISOString(),
      };
      db.dance_votes.push(vote);
    }

    writeDb(db);
    return NextResponse.json({ success: true, vote });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = withApi(handlerPOST);
