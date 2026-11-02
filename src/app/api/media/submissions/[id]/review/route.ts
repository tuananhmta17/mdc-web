import { withApi } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { createNotificationAndOutbox } from "@/lib/notifications";

async function handlerPOST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getCurrentSession(db);

  // Acceptance criterion 9: Review authorization
  if (!RBAC.canReviewMediaSubmission(session)) {
    return NextResponse.json({ error: "Only Media Head or Board Admin can review submissions." }, { status: 403 });
  }

  const submission = db.media_task_submissions.find((s) => s.id === id);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const task = db.media_tasks.find((t) => t.id === submission.task_id);
  if (!task) {
    return NextResponse.json({ error: "Associated task not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { review_status, feedback } = body;
    const latestVersion = Math.max(...db.media_task_submissions.filter(s => s.task_id === task.id).map(s => s.version));
    if (submission.version !== latestVersion) return NextResponse.json({ error: "Chỉ được duyệt phiên bản mới nhất." }, { status: 409 });

    if (!["APPROVED", "REVISION_REQUESTED"].includes(review_status)) {
      return NextResponse.json({ error: "review_status must be 'APPROVED' or 'REVISION_REQUESTED'" }, { status: 400 });
    }

    const isApproved = review_status === "APPROVED";

    submission.review_status = review_status;
    submission.feedback = feedback || "";
    submission.reviewed_by = session.user.id;
    submission.reviewed_at = new Date().toISOString();

    if (isApproved) {
      task.status = "APPROVED";
      task.progress_percent = 100;
    } else {
      task.status = "REVISION_REQUESTED";
    }
    task.updated_at = new Date().toISOString();

    // Notify submitter
    const submitter = db.profiles.find((p) => p.id === submission.submitter_id);
    if (submitter) {
      createNotificationAndOutbox(db, {
        recipient: submitter,
        type: "MEDIA_REVIEWED",
        subject: isApproved
          ? `Sản phẩm đã được duyệt: "${task.title}"`
          : `Yêu cầu chỉnh sửa: "${task.title}"`,
        bodyText: isApproved
          ? `Chúc mừng! Sản phẩm phiên bản ${submission.version} của nhiệm vụ "${task.title}" đã được duyệt.`
          : `Sản phẩm phiên bản ${submission.version} của nhiệm vụ "${task.title}" cần chỉnh sửa. Nhận xét: ${feedback}`,
        bodyHtml: `<p>Kết quả duyệt sản phẩm phiên bản <strong>v${submission.version}</strong> của nhiệm vụ <strong>"${task.title}"</strong>:</p><p>Trạng thái: <strong>${isApproved ? "ĐÃ DUYỆT (APPROVED)" : "CẦN CHỈNH SỬA (REVISION REQUESTED)"}</strong></p><p>Nhận xét từ người duyệt: <em>${feedback || "Không có ghi chú thêm."}</em></p>`,
        entityType: "media_tasks",
        entityId: task.id,
        linkUrl: `/media/tasks/${task.id}`,
        idempotencyKey: `sub-review-${id}-${review_status}`,
      });
    }

    db.audit_logs.unshift({
      id: `audit-${randomUUID()}`,
      actor_id: session.user.id,
      action: isApproved ? "APPROVE_SUBMISSION" : "REQUEST_REVISION",
      entity_type: "media_task_submissions",
      entity_id: id,
      after_json: { review_status, feedback, task_id: task.id },
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, submission, task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const POST = withApi(handlerPOST);
