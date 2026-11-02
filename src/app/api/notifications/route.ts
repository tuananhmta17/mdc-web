import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const db = readDb();
  const session = getCurrentSession(db);

  try {
    const body = await req.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    const now = new Date().toISOString();

    if (markAll) {
      for (const n of db.notifications) {
        if (n.recipient_id === session.user.id && !n.read_at) {
          n.read_at = now;
        }
      }
    } else if (notificationId) {
      const n = db.notifications.find(
        (notif) => notif.id === notificationId && notif.recipient_id === session.user.id
      );
      if (n) {
        n.read_at = now;
      }
    }

    writeDb(db);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
