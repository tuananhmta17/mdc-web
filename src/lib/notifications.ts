import { DatabaseSchema, EmailOutboxItem, InAppNotification, Profile } from "./types";
import { formatVNDateTime } from "./utils";
import { sendEmail } from "./mailer";
import { randomUUID } from "node:crypto";
import { readDb, writeDb, withDatabase } from "./db";

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function createNotificationAndOutbox(
  db: DatabaseSchema,
  params: {
    recipient: Profile;
    type: string;
    subject: string;
    bodyText: string;
    bodyHtml: string;
    entityType?: string;
    entityId?: string;
    linkUrl?: string;
    idempotencyKey: string;
  }
): { notification: InAppNotification; outboxItem?: EmailOutboxItem } {
  const existing = db.email_outbox.find(e => e.idempotency_key === params.idempotencyKey);
  if (existing) {
    const notification = db.notifications.find(n => n.id === existing.notification_id);
    if (notification) return { notification, outboxItem: existing };
  }
  // 1. Create In-App notification
  const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const notification: InAppNotification = {
    id: notifId,
    recipient_id: params.recipient.id,
    type: params.type,
    subject: params.subject,
    body: params.bodyText,
    entity_type: params.entityType,
    entity_id: params.entityId,
    link_url: params.linkUrl,
    created_at: new Date().toISOString(),
  };
  db.notifications.unshift(notification);

  // 2. Check duplicate email with idempotency_key
  const existingEmail = db.email_outbox.find(
    (e) => e.idempotency_key === params.idempotencyKey
  );

  if (existingEmail) {
    return { notification, outboxItem: existingEmail };
  }

  // 3. Queue in Email Outbox
  const outboxId = `outbox-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const brandedHtml = wrapEmailWithBrandLayout({
    recipientName: params.recipient.full_name,
    subject: params.subject,
    contentHtml: `<p style="white-space:pre-wrap">${escapeHtml(params.bodyText)}</p>`,
    actionUrl: params.linkUrl,
  });

  const outboxItem: EmailOutboxItem = {
    id: outboxId,
    notification_id: notifId,
    recipient_email: params.recipient.email,
    recipient_name: params.recipient.full_name,
    subject: `[MTA Dance Crew] ${params.subject}`,
    body_html: brandedHtml,
    status: "PENDING",
    attempts: 0,
    idempotency_key: params.idempotencyKey,
    created_at: new Date().toISOString(),
  };

  db.email_outbox.unshift(outboxItem);
  return { notification, outboxItem };
}

function wrapEmailWithBrandLayout(options: {
  recipientName: string;
  subject: string;
  contentHtml: string;
  actionUrl?: string;
}): string {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(options.subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #111118; margin: 0; padding: 24px; color: #F8FAFC; }
    .email-card { max-width: 600px; margin: 0 auto; background-color: #1E1E2B; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .email-header { background: linear-gradient(135deg, #6B1D14 0%, #D9381E 100%); padding: 28px 24px; text-align: center; }
    .email-logo-text { color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: 1.5px; margin: 0; text-transform: uppercase; }
    .email-logo-sub { color: rgba(255,255,255,0.85); font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .email-body { padding: 32px 28px; line-height: 1.6; font-size: 15px; color: #E2E8F0; }
    .greeting { font-size: 17px; font-weight: 600; color: #FFFFFF; margin-bottom: 16px; }
    .cta-button { display: inline-block; background-color: #D9381E; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; font-weight: 600; border-radius: 8px; margin-top: 24px; }
    .email-footer { background-color: #14141E; border-top: 1px solid rgba(255,255,255,0.06); padding: 20px 24px; text-align: center; font-size: 12px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="email-card">
    <div class="email-header">
      <h1 class="email-logo-text">MTA DANCE CREW</h1>
      <div class="email-logo-sub">CLB Vũ Đạo — Học viện Kỹ thuật Quân sự</div>
    </div>
    <div class="email-body">
      <div class="greeting">Xin chào ${escapeHtml(options.recipientName)},</div>
      ${options.contentHtml}
      ${
        options.actionUrl
          ? `<div style="text-align: center; margin-top: 28px;">
               <a href="${escapeHtml(new URL(options.actionUrl, process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).href)}" class="cta-button">Xem Chi Tiết Trên Hệ Thống</a>
             </div>`
          : ""
      }
    </div>
    <div class="email-footer">
      Múi giờ thông báo: <strong>Asia/Ho_Chi_Minh</strong><br/>
      Đây là email thông báo tự động từ hệ thống điều hành CLB MTA Dance Crew &copy; ${currentYear}.
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Scheduled job to process email outbox and check 48h/24h due tasks
export function queueDueReminders(db: DatabaseSchema): number {
  const now = new Date();
  const beforeCount = db.notifications.length;
  // 2. Scan media tasks due in 48h / 24h or overdue and trigger reminders
  for (const task of db.media_tasks) {
    if (task.status === "APPROVED") continue;

    const dueDate = new Date(task.due_at);
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const assignee = db.profiles.find((p) => p.id === task.assignee_id);
    if (!assignee || assignee.status !== "ACTIVE") continue;

    // Check overdue
    if (diffHours < 0) {
      const idempotencyKey = `reminder-overdue-${task.id}-${now.toISOString().slice(0, 10)}`;
      const result = createNotificationAndOutbox(db, {
        recipient: assignee,
        type: "MEDIA_TASK_OVERDUE",
        subject: `[QUÁ HẠN] Nhiệm vụ "${task.title}" đã quá hạn nộp!`,
        bodyText: `Nhiệm vụ "${task.title}" của bạn đã quá hạn vào lúc ${formatVNDateTime(task.due_at)}. Vui lòng nhanh chóng cập nhật link sản phẩm hoặc liên hệ Trưởng ban.`,
        bodyHtml: `<p>Nhiệm vụ <strong>"${task.title}"</strong> của bạn đã quá hạn vào lúc <strong>${formatVNDateTime(task.due_at)}</strong>.</p><p>Vui lòng nhanh chóng nộp link sản phẩm hoặc trao đổi với Ban Chủ nhiệm / Trưởng ban.</p>`,
        entityType: "media_tasks",
        entityId: task.id,
        linkUrl: `/media/tasks/${task.id}`,
        idempotencyKey,
      });
    }
    // Check 24h due
    else if (diffHours <= 24 && diffHours > 0) {
      const idempotencyKey = `reminder-due24h-${task.id}-${now.toISOString().slice(0, 10)}`;
      const result = createNotificationAndOutbox(db, {
        recipient: assignee,
        type: "MEDIA_TASK_DUE_SOON",
        subject: `[NHẮC HẠN 24H] Nhiệm vụ "${task.title}" sắp đến hạn nộp`,
        bodyText: `Chỉ còn dưới 24h để hoàn thành nhiệm vụ "${task.title}" (Hạn chót: ${formatVNDateTime(task.due_at)}).`,
        bodyHtml: `<p>Chỉ còn dưới <strong>24 giờ</strong> để hoàn thành nhiệm vụ <strong>"${task.title}"</strong>.</p><p>Hạn chót: <strong>${formatVNDateTime(task.due_at)}</strong>.</p>`,
        entityType: "media_tasks",
        entityId: task.id,
        linkUrl: `/media/tasks/${task.id}`,
        idempotencyKey,
      });
    } else if (diffHours > 24 && diffHours <= 48) {
      createNotificationAndOutbox(db, { recipient: assignee, type: "MEDIA_TASK_DUE_SOON", subject: `[NHẮC HẠN 48H] ${task.title}`, bodyText: `Nhiệm vụ "${task.title}" sẽ đến hạn trong 48 giờ (${formatVNDateTime(task.due_at)}).`, bodyHtml: "", entityType: "media_tasks", entityId: task.id, linkUrl: `/media/tasks/${task.id}`, idempotencyKey: `reminder-due48h-${task.id}-${task.due_at}` });
    }
  }

  return db.notifications.length - beforeCount;
}

// Claims are durable before delivery; disjoint batches allow overlapping cron invocations.
export async function processEmailOutboxWorker(): Promise<{ sentCount: number; remindersTriggered: number }> {
  const deadline = Date.now() + 40000;
  let sentCount = 0;
  let remindersTriggered = 0;
  let processed = 0;
  while (processed < 50 && Date.now() < deadline) {
    const claimToken = randomUUID();
    const batch = await withDatabase(async () => {
      const db = readDb();
      const before = db.email_outbox.length;
      if (processed === 0) queueDueReminders(db);
      const added = db.email_outbox.length - before;
      const now = Date.now();
      for (const item of db.email_outbox) {
        if (item.status === "PROCESSING" && Date.parse(item.claimed_until || "") <= now) {
          item.status = "FAILED"; item.attempts = 3;
          item.last_error = "Gửi thư bị gián đoạn; cần kiểm tra nhà cung cấp trước khi gửi lại.";
        }
      }
      const eligible = db.email_outbox.filter(item =>
        (item.status === "PENDING" || item.status === "FAILED") && item.attempts < 3 &&
        (!item.next_retry_at || Date.parse(item.next_retry_at) <= now)
      ).slice(0, 5);
      for (const item of eligible) {
        item.status = "PROCESSING"; item.attempts++; item.claim_token = claimToken;
        item.claimed_until = new Date(now + 5 * 60000).toISOString();
      }
      writeDb(db);
      return { items: structuredClone(eligible), added };
    });
    remindersTriggered += batch.added;
    if (!batch.items.length) break;
    processed += batch.items.length;
    const results = await Promise.all(batch.items.map(async item => ({ item, result: await sendEmail({ to: item.recipient_email, toName: item.recipient_name, subject: item.subject, html: item.body_html, idempotencyKey: item.idempotency_key }) })));
    for (let retry = 0; retry < 3; retry++) {
      try {
        await withDatabase(async () => {
          const db = readDb();
          for (const { item, result } of results) {
            const current = db.email_outbox.find(e => e.id === item.id && e.claim_token === claimToken);
            if (!current) continue;
            current.status = result.success ? "SENT" : "FAILED";
            if (result.success) { current.sent_at = new Date().toISOString(); delete current.last_error; delete current.next_retry_at; }
            else { current.last_error = result.error; current.next_retry_at = new Date(Date.now() + 2 ** current.attempts * 60000).toISOString(); }
            delete current.claim_token; delete current.claimed_until;
          }
          writeDb(db);
        });
        break;
      } catch (error) { if (retry === 2) throw error; }
    }
    sentCount += results.filter(r => r.result.success).length;
  }
  return { sentCount, remindersTriggered };
}
