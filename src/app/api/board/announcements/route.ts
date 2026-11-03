import { withApi } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { Announcement } from "@/lib/types";
import { createNotificationAndOutbox } from "@/lib/notifications";

async function handlerPOST(req: NextRequest) {
  const db = readDb();
  const session = getCurrentSession(db);

  if (!RBAC.canPublishAnnouncements(session)) {
    return NextResponse.json({ error: "Only Board Admin can post official announcements." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, body: contentBody, audience } = body;

    if (!title || !contentBody) {
      return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
    }

    const ancId = `anc-${randomUUID()}`;
    const newAnc: Announcement = {
      id: ancId,
      title,
      body: contentBody,
      audience: audience || "ALL_CLUB",
      created_by: session.user.id,
      published_at: new Date().toISOString(),
    };

    db.announcements.unshift(newAnc);

    // Notify audience
    const targets = db.profiles.filter((p) => {
      if (p.status !== "ACTIVE") return false;
      if (!audience || audience === "ALL_CLUB") return true;
      const mem = db.department_memberships.find((m) => m.user_id === p.id && m.is_primary);
      const dept = db.departments.find((d) => d.id === mem?.department_id);
      if (audience === "DANCE_ONLY" && dept?.code === "DANCE") return true;
      if (audience === "MEDIA_ONLY" && dept?.code === "MEDIA") return true;
      if (audience === "BOARD_ONLY" && dept?.code === "BOARD") return true;
      return false;
    });

    for (const t of targets) {
      createNotificationAndOutbox(db, {
        recipient: t,
        type: "ANNOUNCEMENT",
        subject: `[THÔNG BÁO CLB] ${title}`,
        bodyText: contentBody,
        bodyHtml: `<p>${contentBody}</p>`,
        entityType: "announcements",
        entityId: ancId,
        linkUrl: "/dashboard",
        idempotencyKey: `announcement-${ancId}-${t.id}`,
      });
    }

    db.audit_logs.unshift({
      id: `audit-${randomUUID()}`,
      actor_id: session.user.id,
      action: "CREATE_ANNOUNCEMENT",
      entity_type: "announcements",
      entity_id: ancId,
      after_json: newAnc,
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, announcement: newAnc });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = withApi(handlerPOST);
