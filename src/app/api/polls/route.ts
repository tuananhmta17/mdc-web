import { visibleDatabase } from "@/lib/visibility";
import { withApi } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { DancePollOption, DancePollRound } from "@/lib/types";
import { createNotificationAndOutbox } from "@/lib/notifications";

async function handlerGET() {
  const db = visibleDatabase(readDb(), getCurrentSession());
  const session = getCurrentSession(db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const roundsWithDetails = db.dance_poll_rounds.map((round) => {
    const showResults = session.isBoardAdmin || session.isDanceHead || round.result_visibility === "PUBLIC" || round.status !== "OPEN";
    const options = db.dance_poll_options.filter((o) => o.round_id === round.id);
    const optionsWithDances = options.map((opt) => {
      const dance = db.dances.find((d) => d.id === opt.dance_id);
      const voteCount = db.dance_votes.filter(
        (v) => v.round_id === round.id && v.option_id === opt.id
      ).length;
      return {
        ...opt,
        dance,
        voteCount: showResults ? voteCount : null,
      };
    });

    const userVote = db.dance_votes.find(
      (v) => v.round_id === round.id && v.user_id === session.user.id
    );

    const totalVotes = db.dance_votes.filter((v) => v.round_id === round.id).length;

    return {
      ...round,
      options: optionsWithDances,
      userVotedOptionId: userVote?.option_id || null,
      totalVotes: showResults ? totalVotes : null,
      canVote: RBAC.canVotePoll(session, round),
    };
  });

  return NextResponse.json(roundsWithDetails);
}

async function handlerPOST(req: NextRequest) {
  const db = readDb();
  const session = getCurrentSession(db);

  if (!RBAC.canManagePoll(session)) {
    return NextResponse.json({ error: "Only Board Admin or Dance Head can create poll rounds." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, description, scope, start_at, end_at, dance_ids } = body;

    if (!title || !dance_ids || !Array.isArray(dance_ids) || dance_ids.length < 2) {
      return NextResponse.json({ error: "Title and at least 2 candidate dance IDs are required" }, { status: 400 });
    }

    const roundId = `poll-${randomUUID()}`;
    const newRound: DancePollRound = {
      id: roundId,
      title,
      description: description || "",
      scope: scope || "DANCE_ONLY",
      start_at: start_at || new Date().toISOString(),
      end_at: end_at || new Date(Date.now() + 7 * 86400000).toISOString(),
      result_visibility: body.result_visibility || "PUBLIC",
      status: "OPEN",
      created_at: new Date().toISOString(),
    };
    db.dance_poll_rounds.unshift(newRound);

    // Create options
    for (const did of dance_ids) {
      const opt: DancePollOption = {
        id: `opt-${roundId}-${did}`,
        round_id: roundId,
        dance_id: did,
      };
      db.dance_poll_options.push(opt);
    }

    // Broadcast email/inbox to eligible members
    const eligibleMembers = db.profiles.filter((p) => {
      if (p.status !== "ACTIVE") return false;
      if (scope === "ALL_CLUB") return true;
      const mem = db.department_memberships.find((m) => m.user_id === p.id && m.is_primary);
      const dept = db.departments.find((d) => d.id === mem?.department_id);
      return dept?.code === "DANCE" || dept?.code === "BOARD";
    });

    for (const m of eligibleMembers) {
      createNotificationAndOutbox(db, {
        recipient: m,
        type: "POLL_OPENED",
        subject: `Mở bình chọn bài nhảy mới: ${title}`,
        bodyText: `CLB vừa mở đợt bình chọn bài nhảy "${title}". Hãy truy cập để nghe thử demo và bỏ phiếu cho bài bạn yêu thích.`,
        bodyHtml: `<p>CLB vừa mở đợt bình chọn: <strong>"${title}"</strong>.</p><p>Hạn chót: <strong>${new Date(newRound.end_at).toLocaleString("vi-VN")}</strong>.</p>`,
        entityType: "dance_poll_rounds",
        entityId: roundId,
        linkUrl: "/polls",
        idempotencyKey: `poll-opened-${roundId}-${m.id}`,
      });
    }

    db.audit_logs.unshift({
      id: `audit-${randomUUID()}`,
      actor_id: session.user.id,
      action: "CREATE_POLL_ROUND",
      entity_type: "dance_poll_rounds",
      entity_id: roundId,
      after_json: { title, scope, dance_ids },
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, round: newRound });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withApi(handlerGET);
export const POST = withApi(handlerPOST);
