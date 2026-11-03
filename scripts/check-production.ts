import { loadEnvConfig } from "@next/env";
import { getSupabase } from "../src/lib/supabase";
import nodemailer from "nodemailer";

loadEnvConfig(process.cwd(), false);
let failures = 0;
function report(ok: unknown, label: string) { console.log(`${ok ? "PASS" : "FAIL"}: ${label}`); if (!ok) failures++; }
async function main() {
  const origin = process.env.APP_URL;
  let validOrigin = false;
  try { const url = new URL(origin || ""); validOrigin = url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname) && !url.username && !url.password; } catch {}
  report(validOrigin, "APP_URL là URL HTTPS chính thức");
  report((process.env.CRON_SECRET?.length || 0) >= 32, "CRON_SECRET có ít nhất 32 ký tự ngẫu nhiên");
  const cloud = getSupabase();
  report(cloud, "Kết nối Supabase dùng khóa chỉ dành cho máy chủ");
  if (cloud) {
    const { data, error } = await cloud.from("app_state_snapshots").select("revision,state_json").eq("id", "latest_state").maybeSingle();
    report(!error, "Migration 002 đã được áp dụng và truy vấn được dữ liệu");
    if (data) {
      const profiles = data.state_json?.profiles || [];
      report(profiles.length > 0 && profiles.every((p: { password?: string }) => p.password?.startsWith("scrypt:")), "Tài khoản hiện có đều dùng mật khẩu được băm (không còn mật khẩu demo)");
      report(profiles.some((p: { id: string; status: string }) => p.status === "ACTIVE" && data.state_json.role_assignments?.some((r: { user_id: string; role: string }) => r.user_id === p.id && r.role === "BOARD_ADMIN")), "Có quản trị viên đang hoạt động");
    } else {
      report(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.MDC_ADMIN_EMAIL || "") && (process.env.MDC_ADMIN_PASSWORD?.length || 0) >= 12, "Đã cấu hình tài khoản quản trị để khởi tạo database mới");
    }
  }
  const gmail = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;
  const resend = process.env.RESEND_API_KEY && process.env.EMAIL_FROM;
  report(gmail || resend, "Đã cấu hình nhà cung cấp gửi email thật");
  if (gmail) {
    try { await nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 }).verify(); report(true, "Xác thực Gmail SMTP thành công (không gửi thư thử)"); }
    catch { report(false, "Xác thực Gmail SMTP thất bại"); }
  } else if (resend) {
    try { const response = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(15000) }); report(response.ok, "Khóa Resend truy cập được API quản lý tên miền (không gửi thư thử)"); }
    catch { report(false, "Không kết nối được Resend"); }
  }
  console.log(failures ? `Chưa đủ điều kiện phát hành: ${failures} mục cần xử lý.` : "Cấu hình production đã đạt các kiểm tra trên.");
  process.exitCode = failures ? 1 : 0;
}
main().catch(() => { console.error("Không thể hoàn tất kiểm tra cấu hình production."); process.exitCode = 1; });
