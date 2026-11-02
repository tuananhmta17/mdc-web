import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, writeDb } from "@/lib/db";
import { RBAC } from "@/lib/rbac";
import { TaskPriority, TaskStatus } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = readDb();
  const session = getCurrentSession(db);

  if (!RBAC.canAccessInternalData(session)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const task = db.media_tasks.find((t) => t.id === id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const assigner = db.profiles.find((p) => p.id === task.assigner_id);
  const assignee = db.profiles.find((p) => p.id === task.assignee_id);
  const dance = db.dances.find((d) => d.id === task.dance_id);
  const submissions = db.media_task_submissions
    .filter((s) => s.task_id === id)
    .sort((a, b) => b.version - a.version);

  return NextResponse.json({
    ...task,
    assigner,
    assignee,
    dance,
    submissions,
    canSubmit: RBAC.canSubmitMediaTask(session, task),
    canReview: RBAC.canReviewMediaSubmission(session),
  });
}

export async function PATCH(
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

  const isAssignee = task.assignee_id === session.user.id;
  const isManager = session.isBoardAdmin || session.isMediaHead;

  if (!isAssignee && !isManager) {
    return NextResponse.json({ error: "Forbidden: Not authorized to update this task" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { progress_percent, status, title, description, priority, due_at } = body;
    const beforeState = { ...task };

    if (progress_percent !== undefined) {
      task.progress_percent = Math.min(100, Math.max(0, Number(progress_percent)));
      if (task.progress_percent > 0 && task.status === "TODO") {
        task.status = "IN_PROGRESS";
      }
    }

    if (isManager) {
      if (status !== undefined) task.status = status as TaskStatus;
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (priority !== undefined) task.priority = priority as TaskPriority;
      if (due_at !== undefined) task.due_at = due_at;
    }

    task.updated_at = new Date().toISOString();

    db.audit_logs.unshift({
      id: `audit-${Date.now()}`,
      actor_id: session.user.id,
      action: "UPDATE_MEDIA_TASK",
      entity_type: "media_tasks",
      entity_id: id,
      before_json: beforeState,
      after_json: task,
      occurred_at: new Date().toISOString(),
    });

    writeDb(db);
    return NextResponse.json({ success: true, task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
