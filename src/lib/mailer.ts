import nodemailer from "nodemailer";

export interface SendMailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

export interface SendMailResult {
  success: boolean;
  provider: "gmail_smtp" | "resend" | "local_simulated";
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: SendMailOptions): Promise<SendMailResult> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const resendApiKey = process.env.RESEND_API_KEY;

  // 1. Gmail SMTP (App Password - 100% Free 500 emails/day to any inbox without custom domain)
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"MTA Dance Crew" <${gmailUser}>`,
        to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
        subject: options.subject,
        html: options.html,
      });

      return {
        success: true,
        provider: "gmail_smtp",
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error("[Mailer] Gmail SMTP error:", err);
      return {
        success: false,
        provider: "gmail_smtp",
        error: err.message || "Gmail SMTP failed",
      };
    }
  }

  // 2. Resend API (If custom domain configured)
  if (resendApiKey && resendApiKey.startsWith("re_")) {
    try {
      const fromEmail = process.env.EMAIL_FROM || "notifications@mtadancecrew.vn";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Resend API error");
      }

      return {
        success: true,
        provider: "resend",
        messageId: json.id,
      };
    } catch (err: any) {
      console.error("[Mailer] Resend API error:", err);
      return {
        success: false,
        provider: "resend",
        error: err.message || "Resend failed",
      };
    }
  }

  // 3. Local simulated mode (previewable in Notifications tab)
  return {
    success: true,
    provider: "local_simulated",
    messageId: `sim-${Date.now()}`,
  };
}
