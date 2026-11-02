# Hướng Dẫn Triển Khai Website MTA Dance Crew (`MDCWeb`) — Chạy Thực Tế 100% Miễn Phí (0đ)

Tài liệu này hướng dẫn bạn đưa website **MTA Dance Crew** lên mạng Internet để toàn thể thành viên CLB có thể truy cập bằng điện thoại hoặc máy tính mọi lúc mọi nơi mà **không tốn bất kỳ chi phí duy trì nào**.

---

## 1. Tổng quan Kiến trúc Miễn Phí (0đ)

- **Hosting & Tên miền**: [Vercel](https://vercel.com) (Miễn phí tên miền `https://mdc-web-*.vercel.app`, băng thông 100GB/tháng, tự động cấp chứng chỉ bảo mật HTTPS SSL).
- **Cơ sở dữ liệu**: [Supabase](https://supabase.com) (Gói Free Tier: 500MB PostgreSQL, tự động sao lưu, hỗ trợ Row Level Security và Google OAuth).
- **Gửi Email tự động**: **Gmail SMTP qua App Password** (Miễn phí 500 email/ngày gửi tới mọi hộp thư Gmail của thành viên mà không cần mua tên miền riêng).
- **Lập lịch quét hạn tự động (Cron)**: Vercel Daily Cron (chạy tự động vào 08:00 sáng mỗi ngày giờ Việt Nam).

---

## 2. Bước 1: Deploy Web lên Vercel

### Cách 1: Chạy lệnh Vercel CLI trực tiếp
Mở PowerShell tại thư mục dự án và chạy:
```powershell
cd f:\MySkill\MDCWeb
npx vercel
```
- Khi màn hình hỏi `Set up and deploy?` &rarr; Chọn `Y`.
- Đăng nhập tài khoản Vercel (bằng GitHub hoặc Google) theo đường link trình duyệt hiện lên.
- Chọn `Scope` (tài khoản cá nhân của bạn).
- `Link to existing project?` &rarr; Chọn `N`.
- `What's your project's name?` &rarr; Đặt tên (ví dụ: `mta-dance-crew` hoặc `mdc-web`).
- `In which directory is your code located?` &rarr; Bấm `Enter` (mặc định `./`).
- `Want to modify these settings?` &rarr; Chọn `N`.

Chờ khoảng 1 phút, Vercel sẽ cung cấp đường dẫn web công khai dạng:
**`https://mdc-web-xyz.vercel.app`**

### Cách 2: Đẩy lên GitHub và kết nối Vercel Dashboard
1. Tạo một repository mới trên GitHub (Private hoặc Public).
2. Chạy lệnh:
   ```powershell
   cd f:\MySkill\MDCWeb
   git init
   git add .
   git commit -m "feat: initial commit MTA Dance Crew Cloud Web"
   git branch -M main
   git remote add origin https://github.com/<tai-khoan-cua-ban>/mdc-web.git
   git push -u origin main
   ```
3. Truy cập [vercel.com](https://vercel.com) &rarr; Nhấn **Add New Project** &rarr; Chọn repository `mdc-web` vừa đẩy &rarr; Nhấn **Deploy**.

---

## 3. Bước 2: Thiết lập Cơ Sở Dữ Liệu Supabase (Miễn Phí 500MB)

1. Truy cập [supabase.com](https://supabase.com) và đăng ký tài khoản miễn phí bằng GitHub hoặc Google.
2. Nhấn **New Project**:
   - **Name**: `MTA-Dance-Crew`
   - **Database Password**: Đặt mật khẩu an toàn (ghi lại để dùng nếu cần).
   - **Region**: Chọn `Southeast Asia (Singapore)` để có tốc độ truy cập từ Việt Nam nhanh nhất.
3. Sau khi tạo xong dự án, vào menu bên trái chọn **SQL Editor** &rarr; **New Query**.
4. Mở file [001_initial_schema.sql](file:///f:/MySkill/MDCWeb/supabase/migrations/001_initial_schema.sql), sao chép toàn bộ nội dung và dán vào ô SQL Editor trên Supabase, sau đó nhấn **Run** (Ctrl + Enter).
5. Lấy thông tin kết nối:
   - Vào mục **Project Settings** &rarr; **API**.
   - Sao chép **Project URL** (`https://xxx.supabase.co`).
   - Sao chép **anon public key** (`eyJh...`).
   - Sao chép **service_role secret key** (`eyJh...`).

---

## 4. Bước 3: Cấu hình Gửi Email Miễn Phí (Gmail App Password)

Để hệ thống tự động gửi email thông báo lịch tập, kết quả bình chọn và deadline mà **không tốn tiền mua tên miền riêng**:
1. Đăng nhập tài khoản Google/Gmail mà bạn muốn dùng để gửi thông báo của CLB (ví dụ: `clb.mtadancecrew@gmail.com`).
2. Bật tính năng **Xác minh 2 bước (2-Step Verification)** trong tài khoản Google.
3. Truy cập đường dẫn: **`https://myaccount.google.com/apppasswords`**
4. Tại ô "Tên ứng dụng", nhập: `MDC Web Notifications` rồi nhấn **Tạo (Create)**.
5. Google sẽ tạo cho bạn một chuỗi **Mật khẩu ứng dụng gồm 16 chữ cái** (ví dụ: `abcd efgh ijkl mnop`). Hãy sao chép chuỗi này.

---

## 5. Bước 4: Nhập Biến Môi Trường Trên Vercel

1. Truy cập vào Dashboard dự án trên [Vercel](https://vercel.com) &rarr; Chọn tab **Settings** &rarr; **Environment Variables**.
2. Thêm các biến sau:

| Tên biến (Key) | Giá trị (Value) | Giải thích |
|---|---|---|
| `NEXT_PUBLIC_TIMEZONE` | `Asia/Ho_Chi_Minh` | Múi giờ Việt Nam (UTC+7) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` | URL dự án Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...` | Khóa Anon Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...` | Khóa Service Role Supabase |
| `GMAIL_USER` | `clb.mtadancecrew@gmail.com` | Địa chỉ Gmail gửi thông báo |
| `GMAIL_APP_PASSWORD` | `abcd efgh ijkl mnop` | Mật khẩu ứng dụng 16 chữ cái |
| `CRON_SECRET` | `mdc_secret_cron_2026` | Token bảo mật Vercel Cron |

3. Sau khi thêm biến môi trường, vào tab **Deployments** trên Vercel &rarr; Chọn dấu `...` bên cạnh bản deploy mới nhất &rarr; Nhấn **Redeploy**.

---

## 6. Kiểm tra Hoạt Động Sau Khi Triển Khai

1. Mở đường link `.vercel.app` trên điện thoại hoặc máy tính.
2. Trên Header, dùng bộ chuyển đổi nhanh vai trò để kiểm tra góc nhìn của:
   - **Chủ nhiệm (`BOARD_ADMIN`)**: Toàn quyền điều hành, duyệt thành viên, xem audit logs.
   - **Trưởng Chuyên môn (`DANCE_HEAD`)**: Quản lý bài nhảy, tạo lịch tập, mở vote.
   - **Trưởng Truyền thông (`MEDIA_HEAD`)**: Giao việc, bảng Kanban, duyệt link sản phẩm.
   - **Tài khoản mới (`PENDING`)**: Xác thực màn hình khóa bảo mật Gatekeeper.
3. Vào trang **Thông Báo & Outbox** &rarr; Bấm **Chạy Worker Quét Nhắc Hạn (Cron)** để kiểm tra luồng gửi mail tự động.
