import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { MediaTaskSubmission } from "@/lib/types";
import { createNotificationAndOutbox } from "@/lib/notifications";
import { isValidHttpUrl } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getCurrentSession(db);

  const task = db.media_tasks.find((t) => t.id === id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Acceptance criterion 8: Only assignee or media manager can submit
  if (!RBAC.canSubmitMediaTask(session, task)) {
    return NextResponse.json(
      { error: "Chỉ người nhận nhiệm vụ hoặc Trưởng ban Truyền thông/Chủ nhiệm mới có quyền nộp sản phẩm." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { url, note } = body;

    // Acceptance criterion 9: URL validation (must be http:// or https://)
    if (!url || typeof url !== "string" || !isValidHttpUrl(url)) {
      return NextResponse.json(
        { error: "Đường dẫn sản phẩm nộp bắt buộc phải là URL hợp lệ (bắt đầu bằng http:// hoặc https://)." },
        { status: 400 }
      );
    }

    // Versioning: auto-increment version number to keep all historical submissions
    const existingSubs = db.media_task_submissions.filter((s) => s.task_id === id);
    const nextVersion = existingSubs.length > 0
      ? Math.max(...existingSubs.map((s) => s.version)) + 1
      : 1;

    const submissionId = `sub-${Date.now()}`;
    const newSubmission: MediaTaskSubmission = {
      id: submissionId,
      task_id: id,
      submitter_id: session.user.id,
      url: url.trim(),
      version: nextVersion,
      note: note || "",
      review_status: "PENDING",
      submitted_at: new Date().toISOString(),
    };

    db.media_task_submissions.push(newSubmission);

    // Acceptance criterion 9: Nộp link chuyển sang SUBMITTED, KHÔNG tự chuyển thành APPROVED!
    task.status = "SUBMITTED";
    task.progress_percent = Math.max(task.progress_percent, 90);
    task.updated_at = new Date().toISOString();

    // Notify Assigner / Media Head
    const assigner = db.profiles.find((p) => p.id === task.assigner_id);
    if (assigner) {
      createNotificationAndOutbox(db, {
        recipient: assigner,
        type: "MEDIA_SUBMISSION_CREATED",
        subject: `Sản phẩm mới nộp: "${task.title}" (Phiên bản ${nextVersion})`,
        bodyText: `${session.user.full_name} vừa nộp link sản phẩm (v${nextVersion}) cho nhiệm vụ "${task.title}". Link: ${url}`,
        bodyHtml: `<p>Thành viên <strong>${session.user.full_name}</strong> vừa nộp sản phẩm phiên bản <strong>v${nextVersion}</strong> cho nhiệm vụ <strong>"${task.title}"</strong>.</p><p>Đường dẫn nộp: <a href="${url}">${url}</a></p><p>Ghi chú: ${note || "(Không có)"}</p><p>Vui lòng đăng nhập để duyệt hoặc yêu cầu chỉnh sửa.</p>`,
        entityType: "media_tasks",
        entityId: id,
        linkUrl: `/media/tasks/${id}`,
        idempotencyKey: `sub-created-${id}-v${nextVersion}`,
      });
    }

    db.audit_logs.unshift({
      id: `audit-${Date.now()}`,
      actor_id: session.user.id,
      action: "SUBMIT_MEDIA_TASK",
      entity_type: "media_task_submissions",
      entity_id: submissionId,
      after_json: newSubmission,
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, submission: newSubmission, task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
