import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, withDatabase, withApi } from "@/lib/db";
import { processEmailOutboxWorker } from "@/lib/notifications";
export const maxDuration = 60;
async function handleCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorizedCron = secret && secret.length >= 32 && req.headers.get("authorization") === `Bearer ${secret}`;
  if (!authorizedCron) {
    if (req.method === "GET") return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    const admin = await withDatabase(async () => { const session = getSessionFromRequest(req); return session.isBoardAdmin && session.user.status === "ACTIVE"; });
    if (!admin) return NextResponse.json({ error: "Chỉ Ban Chủ nhiệm được xử lý hàng đợi." }, { status: 403 });
  }
  const result = await processEmailOutboxWorker();
  return NextResponse.json({ success: true, sentEmailsCount: result.sentCount, remindersTriggeredCount: result.remindersTriggered });
}
export const GET = withApi(handleCron, { public: true, database: false });
export const POST = withApi(handleCron, { public: true, database: false });
