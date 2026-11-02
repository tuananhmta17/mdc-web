import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import {
  exportMembersToCsv,
  exportPollResultsToCsv,
  exportPracticesToCsv,
  exportMediaTasksToCsv,
} from "@/lib/csv";

export async function GET(req: NextRequest) {
  const db = readDb();
  const session = getCurrentSession(db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "members";
  const pollId = searchParams.get("pollId") || "";

  let csvContent = "";
  let filename = `mdc-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

  switch (type) {
    case "members":
      csvContent = exportMembersToCsv(db);
      break;
    case "poll":
      if (!pollId && db.dance_poll_rounds.length > 0) {
        csvContent = exportPollResultsToCsv(db, db.dance_poll_rounds[0].id);
      } else {
        csvContent = exportPollResultsToCsv(db, pollId);
      }
      filename = `mdc-poll-results-${new Date().toISOString().slice(0, 10)}.csv`;
      break;
    case "practices":
      csvContent = exportPracticesToCsv(db);
      break;
    case "tasks":
      csvContent = exportMediaTasksToCsv(db);
      break;
    default:
      csvContent = exportMembersToCsv(db);
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
