import { visibleDatabase } from "@/lib/visibility";
import { withApi } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { Dance } from "@/lib/types";

async function handlerGET() {
  const db = visibleDatabase(readDb(), getCurrentSession());
  const session = getCurrentSession(db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json(db.dances);
}

async function handlerPOST(req: NextRequest) {
  const db = readDb();
  const session = getCurrentSession(db);

  if (!session.isBoardAdmin && !session.isDanceHead) {
    return NextResponse.json({ error: "Only Board Admin or Dance Head can create dances" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, song_title, description, music_url, video_url, cover_url, leader_id, capacity, visibility, target_performance_date } = body;

    if (!title || !song_title) {
      return NextResponse.json({ error: "Title and song_title are required" }, { status: 400 });
    }

    const newId = `dance-${randomUUID()}`;
    const newDance: Dance = {
      id: newId,
      code: `MDC-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      title,
      song_title,
      description: description || "",
      music_url: music_url || "",
      video_url: video_url || "",
      cover_url: cover_url || "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80",
      leader_id: leader_id || undefined,
      capacity: capacity ? Number(capacity) : 12,
      visibility: visibility || "DANCE_ONLY",
      status: "DRAFT",
      target_performance_date: target_performance_date || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.dances.unshift(newDance);

    // Audit log
    db.audit_logs.unshift({
      id: `audit-${randomUUID()}`,
      actor_id: session.user.id,
      action: "CREATE_DANCE",
      entity_type: "dances",
      entity_id: newId,
      after_json: newDance,
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, dance: newDance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const GET = withApi(handlerGET);
export const POST = withApi(handlerPOST);
