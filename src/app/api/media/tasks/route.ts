import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { MediaTask, TaskPriority, TaskType } from "@/lib/types";
import { createNotificationAndOutbox } from "@/lib/notifications";
import { formatVNDateTime } from "@/lib/utils";

export async function GET() {
  const db = readDb();
  const session = getCurrentSession(db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const now = new Date();
  const tasksWithDetails = db.media_tasks.map((task) => {
    const assigner = db.profiles.find((p) => p.id === task.assigner_id);
    const assignee = db.profiles.find((p) => p.id === task.assignee_id);
    const dance = db.dances.find((d) => d.id === task.dance_id);
    const submissions = db.media_task_submissions.filter((s) => s.task_id === task.id);
    const isOverdue = new Date(task.due_at) < now && task.status !== "APPROVED";

    return {
      ...task,
      assigner,
      assignee,
      dance,
      submissions,
      isOverdue,
      isMyTask: task.assignee_id === session.user.id,
      canSubmit: RBAC.canSubmitMediaTask(session, task),
      canReview: RBAC.canReviewMediaSubmission(session),
    };
  });

  return NextResponse.json(tasksWithDetails);
}

export async function POST(req: NextRequest) {
  const db = readDb();
  const session = getCurrentSession(db);

  // Acceptance criterion 8: Permission check
  if (!RBAC.canAssignMediaTask(session)) {
    return NextResponse.json({ error: "Only Media Head or Board Admin can assign media tasks." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, description, task_type, priority, assignee_id, dance_id, due_at, reference_links } = body;

    if (!title || !assignee_id || !due_at) {
      return NextResponse.json({ error: "Title, assignee_id, and due_at are required" }, { status: 400 });
    }

    const assignee = db.profiles.find((p) => p.id === assignee_id);
    if (!assignee) {
      return NextResponse.json({ error: "Assignee profile not found" }, { status: 404 });
    }

    const taskId = `task-${Date.now()}`;
    const newTask: MediaTask = {
      id: taskId,
      title,
      description: description || "",
      task_type: (task_type as TaskType) || "POST",
      priority: (priority as TaskPriority) || "MEDIUM",
      assigner_id: session.user.id,
      assignee_id,
      dance_id: dance_id || undefined,
      due_at,
      status: "TODO",
      progress_percent: 0,
      reference_links: reference_links || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.media_tasks.unshift(newTask);

    // Notify assignee
    createNotificationAndOutbox(db, {
      recipient: assignee,
      type: "MEDIA_TASK_ASSIGNED",
      subject: `Nhiệm vụ mới được giao: ${title}`,
      bodyText: `Bạn được giao nhiệm vụ "${title}". Hạn hoàn thành: ${formatVNDateTime(due_at)}. Vui lòng kiểm tra mô tả và nộp link sản phẩm đúng hạn.`,
      bodyHtml: `<p>Bạn vừa được giao nhiệm vụ mới từ Ban Truyền thông:</p><ul><li><strong>Tiêu đề:</strong> ${title}</li><li><strong>Hạn chót:</strong> ${formatVNDateTime(due_at)} (Giờ VN)</li><li><strong>Mức ưu tiên:</strong> ${priority || "MEDIUM"}</li></ul><p>Đăng nhập để xem tài liệu tham khảo và nộp link sản phẩm.</p>`,
      entityType: "media_tasks",
      entityId: taskId,
      linkUrl: `/media/tasks/${taskId}`,
      idempotencyKey: `task-assigned-${taskId}-${assignee.id}`,
    });

    db.audit_logs.unshift({
      id: `audit-${Date.now()}`,
      actor_id: session.user.id,
      action: "ASSIGN_MEDIA_TASK",
      entity_type: "media_tasks",
      entity_id: taskId,
      after_json: newTask,
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, task: newTask });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
