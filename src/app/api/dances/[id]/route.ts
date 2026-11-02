import { visibleDatabase } from "@/lib/visibility";
import { withApi } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { DanceStatus, DanceVisibility } from "@/lib/types";

async function handlerGET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = visibleDatabase(readDb(), getCurrentSession());
  const session = getCurrentSession(db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const dance = db.dances.find((d) => d.id === id);
  if (!dance) {
    return NextResponse.json({ error: "Dance not found" }, { status: 404 });
  }

  return NextResponse.json(dance);
}

async function handlerPATCH(
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
    const beforeState = { ...dance };
    if (!session.isBoardAdmin && !session.isDanceHead && Object.keys(body).some(key => ["leader_id", "visibility", "status"].includes(key))) return NextResponse.json({ error: "Chỉ Trưởng ban hoặc Ban Chủ nhiệm được thay đổi phân công và trạng thái bài nhảy." }, { status: 403 });
    const { title, song_title, description, music_url, video_url, cover_url, leader_id, capacity, visibility, status, target_performance_date } = body;

    // Leader can only update practice notes/details, not reassign leader or visibility
    if (title !== undefined) dance.title = title;
    if (song_title !== undefined) dance.song_title = song_title;
    if (description !== undefined) dance.description = description;
    if (music_url !== undefined) dance.music_url = music_url;
    if (video_url !== undefined) dance.video_url = video_url;
    if (cover_url !== undefined) dance.cover_url = cover_url;
    if (capacity !== undefined) dance.capacity = Number(capacity);
    if (target_performance_date !== undefined) dance.target_performance_date = target_performance_date;

    if (session.isBoardAdmin || session.isDanceHead) {
      if (leader_id !== undefined) dance.leader_id = leader_id || undefined;
      if (visibility && ["DANCE_ONLY", "ALL_CLUB"].includes(visibility)) {
        dance.visibility = visibility as DanceVisibility;
      }
      if (status) {
        dance.status = status as DanceStatus;
      }
    }

    dance.updated_at = new Date().toISOString();

    db.audit_logs.unshift({
      id: `audit-${randomUUID()}`,
      actor_id: session.user.id,
      action: "UPDATE_DANCE",
      entity_type: "dances",
      entity_id: id,
      before_json: beforeState,
      after_json: dance,
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, dance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withApi(handlerGET);
export const PATCH = withApi(handlerPATCH);
