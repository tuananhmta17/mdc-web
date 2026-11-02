import { visibleDatabase } from "@/lib/visibility";
import { withApi } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import {
  exportMembersToCsv,
  exportPollResultsToCsv,
  exportPracticesToCsv,
  exportMediaTasksToCsv,
} from "@/lib/csv";

async function handlerGET(req: NextRequest) {
  const db = visibleDatabase(readDb(), getCurrentSession());
  const session = getCurrentSession(db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "members";
  const pollId = searchParams.get("pollId") || "";
  if (type === "members" && !session.isBoardAdmin) return NextResponse.json({ error: "Chỉ Ban Chủ nhiệm được xuất danh sách thành viên." }, { status: 403 });
  if (!["members", "poll", "practices", "tasks"].includes(type)) return NextResponse.json({ error: "Loại xuất dữ liệu không hợp lệ." }, { status: 400 });
  if (type === "poll") {
    const round = db.dance_poll_rounds.find(r => r.id === (pollId || db.dance_poll_rounds[0]?.id));
    if (!round) return NextResponse.json({ error: "Không tìm thấy đợt bình chọn." }, { status: 404 });
    if (round.result_visibility === "HIDDEN_UNTIL_CLOSED" && round.status === "OPEN" && !session.isBoardAdmin && !session.isDanceHead) return NextResponse.json({ error: "Kết quả chưa công bố." }, { status: 403 });
  }

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

export const GET = withApi(handlerGET);
