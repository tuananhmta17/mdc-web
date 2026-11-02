import { NextRequest, NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";
import { processEmailOutboxWorker } from "@/lib/notifications";

async function handleCron(req: NextRequest) {
  // Optional security check for Vercel Cron Secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Only enforce if running in production on Vercel
    if (process.env.VERCEL === "1") {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }
  }

  try {
    const db = readDb();
    const result = await processEmailOutboxWorker(db);
    writeDb(db);

    return NextResponse.json({
      success: true,
      sentEmailsCount: result.sentCount,
      remindersTriggeredCount: result.remindersTriggered,
      outboxTotal: db.email_outbox.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
