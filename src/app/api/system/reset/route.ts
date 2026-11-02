import { NextResponse } from "next/server";
import { resetDb } from "@/lib/db";

export async function POST() {
  const db = resetDb();
  return NextResponse.json({ success: true, message: "Hệ thống đã được đặt lại về dữ liệu ban đầu.", dbSummary: {
    profiles: db.profiles.length,
    dances: db.dances.length,
    polls: db.dance_poll_rounds.length,
    tasks: db.media_tasks.length,
    practices: db.practice_sessions.length,
  } });
}
